import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CANON_PATH = path.resolve(ROOT, 'config/living-ecosystem-canon.json');
const PACKET_SCHEMA_PATH = path.resolve(ROOT, 'config/living-source-packet.schema.json');
const PACKET_EXAMPLE_PATH = path.resolve(ROOT, 'config/living-source-packet.example.json');

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function ensureEnum(value, allowed, label, errors) {
  if (!allowed.includes(value)) {
    errors.push(`${label} must be one of: ${allowed.join(', ')}`);
  }
}

function ensureRequiredObjectFields(record, fields, label, errors) {
  for (const field of fields) {
    if (
      !(field in record) ||
      record[field] === null ||
      record[field] === undefined ||
      record[field] === ''
    ) {
      errors.push(`${label} is missing required field "${field}"`);
    }
  }
}

async function validateCanonRegistry(canon) {
  const errors = [];
  const warnings = [];

  const meta = canon._meta || {};
  const systems = canon.systems || {};
  const surfaces = canon.surfaces || {};
  const ownershipRules = canon.ownership_rules || {};
  const humanDecisions = canon.human_decisions || [];

  ensureRequiredObjectFields(
    meta,
    ['classification_values', 'kind_values', 'surface_role_values', 'verification_status_values'],
    '_meta',
    errors
  );

  const assetIds = new Set([...Object.keys(systems), ...Object.keys(surfaces)]);
  if (assetIds.size === 0) {
    errors.push('Canon registry must define at least one system or surface.');
  }

  let hubCount = 0;

  for (const [assetId, asset] of Object.entries({ ...systems, ...surfaces })) {
    ensureRequiredObjectFields(
      asset,
      ['display_name', 'kind', 'classification', 'surface_role', 'verification_status'],
      assetId,
      errors
    );

    ensureEnum(asset.kind, meta.kind_values || [], `${assetId}.kind`, errors);
    ensureEnum(
      asset.classification,
      meta.classification_values || [],
      `${assetId}.classification`,
      errors
    );
    ensureEnum(
      asset.surface_role,
      meta.surface_role_values || [],
      `${assetId}.surface_role`,
      errors
    );
    ensureEnum(
      asset.verification_status,
      meta.verification_status_values || [],
      `${assetId}.verification_status`,
      errors
    );

    if (asset.surface_role === 'hub') {
      hubCount += 1;
    }

    if (asset.repo_path && !(await pathExists(asset.repo_path))) {
      errors.push(`${assetId}.repo_path does not exist: ${asset.repo_path}`);
    }

    if (asset.local_path && !(await pathExists(asset.local_path))) {
      errors.push(`${assetId}.local_path does not exist: ${asset.local_path}`);
    }

    if (asset.canonical_note_path) {
      const notePath = path.resolve(ROOT, asset.canonical_note_path);
      if (!(await pathExists(notePath))) {
        errors.push(`${assetId}.canonical_note_path does not exist: ${asset.canonical_note_path}`);
      }
    }

    if (asset.human_decision_required && asset.verification_status === 'verified') {
      warnings.push(
        `${assetId} is marked verified but still requires a human decision. Keep that distinction intentional.`
      );
    }
  }

  if (hubCount !== 1) {
    errors.push(`Canon registry must define exactly one hub surface. Found ${hubCount}.`);
  }

  for (const [ruleId, rule] of Object.entries(ownershipRules)) {
    if (rule.owner_id && !assetIds.has(rule.owner_id)) {
      errors.push(`ownership_rules.${ruleId}.owner_id references unknown asset "${rule.owner_id}"`);
    }
    if (rule.default_owner_id && !assetIds.has(rule.default_owner_id)) {
      errors.push(
        `ownership_rules.${ruleId}.default_owner_id references unknown asset "${rule.default_owner_id}"`
      );
    }
    for (const mirrorTarget of rule.mirror_targets || []) {
      if (!assetIds.has(mirrorTarget)) {
        errors.push(
          `ownership_rules.${ruleId}.mirror_targets references unknown asset "${mirrorTarget}"`
        );
      }
    }
    for (const target of Object.values(rule.exceptions || {})) {
      if (!assetIds.has(target)) {
        errors.push(`ownership_rules.${ruleId}.exceptions references unknown asset "${target}"`);
      }
    }
  }

  for (const decision of humanDecisions) {
    ensureRequiredObjectFields(decision, ['id', 'status', 'prompt'], 'human_decision', errors);
  }

  return { errors, warnings };
}

function validatePacketExample(schema, example) {
  const errors = [];
  const warnings = [];

  for (const field of schema.required || []) {
    if (!(field in example)) {
      errors.push(`Source packet example is missing required top-level field "${field}"`);
    }
  }

  const reviewFields = ['editorial', 'cultural', 'consent', 'release'];
  for (const field of reviewFields) {
    if (!example.review?.[field]?.status) {
      errors.push(`Source packet example is missing review gate "${field}.status"`);
    }
  }

  if (!Array.isArray(example.source_refs) || example.source_refs.length === 0) {
    errors.push('Source packet example must contain at least one source_ref.');
  }

  if (!Array.isArray(example.outputs) || example.outputs.length === 0) {
    errors.push('Source packet example must contain at least one output.');
  }

  if (example.status === 'published' && example.review?.release?.status !== 'approved') {
    warnings.push(
      'Source packet example is published without an approved release gate. That is usually a policy error.'
    );
  }

  return { errors, warnings };
}

async function main() {
  const canon = await readJson(CANON_PATH);
  const packetSchema = await readJson(PACKET_SCHEMA_PATH);
  const packetExample = await readJson(PACKET_EXAMPLE_PATH);

  const canonResult = await validateCanonRegistry(canon);
  const packetResult = validatePacketExample(packetSchema, packetExample);

  const errors = [...canonResult.errors, ...packetResult.errors];
  const warnings = [...canonResult.warnings, ...packetResult.warnings];

  if (warnings.length) {
    console.log('Warnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
    console.log('');
  }

  if (errors.length) {
    console.error('Living ecosystem config validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Living ecosystem config validation passed.');
  console.log(`- canon registry: ${CANON_PATH}`);
  console.log(`- source packet schema: ${PACKET_SCHEMA_PATH}`);
  console.log(`- source packet example: ${PACKET_EXAMPLE_PATH}`);
  console.log(`- systems: ${Object.keys(canon.systems || {}).length}`);
  console.log(`- surfaces: ${Object.keys(canon.surfaces || {}).length}`);
  console.log(`- human decisions still open: ${(canon.human_decisions || []).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

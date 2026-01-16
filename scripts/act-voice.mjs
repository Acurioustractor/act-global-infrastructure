#!/usr/bin/env node

/**
 * ACT Voice Memo CLI - Transcribe and store voice memos
 *
 * Usage:
 *   act-voice transcribe <audio-file>     Transcribe audio file
 *   act-voice save <text> [--tags TAGS]   Save note to journal
 *   act-voice list [--limit N]            List recent voice notes
 *   act-voice search <query>              Search voice notes
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

const VOICE_NOTES_DIR = process.env.VOICE_NOTES_DIR || join(process.env.HOME, 'clawd', 'voice-notes');

// Ensure directory exists
if (!existsSync(VOICE_NOTES_DIR)) {
  mkdirSync(VOICE_NOTES_DIR, { recursive: true });
}

async function transcribeAudio(filePath) {
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`🎤 Transcribing: ${basename(filePath)}\n`);

  try {
    // Use whisper for transcription
    const outputDir = '/tmp';
    execSync(`whisper "${filePath}" --model base --output_format txt --output_dir "${outputDir}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Read the output file
    const inputBasename = basename(filePath).replace(/\.[^.]+$/, '');
    const outputFile = join(outputDir, `${inputBasename}.txt`);

    if (existsSync(outputFile)) {
      const transcript = readFileSync(outputFile, 'utf8').trim();
      console.log(`📝 Transcript:\n`);
      console.log(transcript);
      console.log();
      return transcript;
    } else {
      console.error('Transcription output not found');
      return null;
    }
  } catch (err) {
    console.error('Transcription error:', err.message);
    return null;
  }
}

function saveNote(text, tags = []) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${timestamp}.md`;
  const filepath = join(VOICE_NOTES_DIR, filename);

  const content = `---
date: ${now.toISOString()}
tags: [${tags.join(', ')}]
type: voice-note
---

${text}
`;

  writeFileSync(filepath, content);
  console.log(`\n✅ Saved to: ${filepath}`);
  return filepath;
}

function listNotes(limit = 10) {
  const files = readdirSync(VOICE_NOTES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      path: join(VOICE_NOTES_DIR, f),
      mtime: statSync(join(VOICE_NOTES_DIR, f)).mtime,
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit);

  console.log(`\n📓 Recent Voice Notes (${files.length})\n`);

  if (files.length === 0) {
    console.log('   No voice notes yet');
    return;
  }

  for (const file of files) {
    const content = readFileSync(file.path, 'utf8');
    const firstLine = content.split('---')[2]?.trim().split('\n')[0] || '(empty)';
    const preview = firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
    const date = file.mtime.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });

    console.log(`   ${date}  ${preview}`);
  }
  console.log();
}

function searchNotes(query) {
  const files = readdirSync(VOICE_NOTES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      path: join(VOICE_NOTES_DIR, f),
      content: readFileSync(join(VOICE_NOTES_DIR, f), 'utf8'),
    }))
    .filter(f => f.content.toLowerCase().includes(query.toLowerCase()));

  console.log(`\n🔍 Search: "${query}" (${files.length} results)\n`);

  if (files.length === 0) {
    console.log('   No matching notes');
    return;
  }

  for (const file of files) {
    const lines = file.content.split('\n');
    const matchLine = lines.find(l => l.toLowerCase().includes(query.toLowerCase()));
    const preview = matchLine?.slice(0, 60) || '(match in metadata)';

    console.log(`   ${file.name}`);
    console.log(`   → ${preview}`);
    console.log();
  }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return defaultVal;
}

switch (command) {
  case 'transcribe':
    const audioFile = args[1];
    if (!audioFile) {
      console.error('Error: Audio file path required');
      process.exit(1);
    }
    const transcript = await transcribeAudio(audioFile);
    if (transcript) {
      // Ask if user wants to save
      console.log('Use "act-voice save" to save this note.');
    }
    break;

  case 'save':
    const text = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
    if (!text) {
      console.error('Error: Note text required');
      process.exit(1);
    }
    const tagsArg = getArg('tags', '');
    const tags = tagsArg ? tagsArg.split(',').map(t => t.trim()) : [];
    saveNote(text, tags);
    break;

  case 'list':
    listNotes(parseInt(getArg('limit', '10')));
    break;

  case 'search':
    const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
    if (!query) {
      console.error('Error: Search query required');
      process.exit(1);
    }
    searchNotes(query);
    break;

  default:
    console.log(`
ACT Voice CLI

Usage:
  act-voice transcribe <audio-file>       Transcribe audio to text
  act-voice save <text> [--tags a,b,c]    Save note to journal
  act-voice list [--limit N]              List recent notes
  act-voice search <query>                Search notes

Examples:
  act-voice transcribe ~/Downloads/memo.mp3
  act-voice save "Meeting notes: discussed Q1 goals" --tags work,planning
  act-voice list --limit 5
  act-voice search "meeting"
`);
}

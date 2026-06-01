# Phase 2 — Xero write-back runbook (NOT yet wired)

> **Status: documented, not implemented.** Phase 1 (the cockpit + this skill) is read-only. This runbook
> describes how the Xero write-back *will* work and the guardrails that MUST hold before it does. Do not
> write to Xero from this skill until the write path is built, grilled, and proven on a tracer-bullet.

## What Phase 2 adds (and what it still can't do)

From a CREATE verdict, the only two safe writes:
1. **Create a coded bill / spend-money** — account + project + contact, from the line's suggested coding.
2. **Attach the receipt image** — download the `receipt-attachments` storage object, upload to Xero
   Attachments on the new transaction (the "add receipt to Xero" ask).

It **still cannot reconcile.** The Xero API has no way to set `IsReconciled`. Output is "ready to
reconcile in Xero" — Ben/SL press the button. This boundary does not change in Phase 2.

## Tier classification (from ~/.claude/rules/workflow.md)

Creating/attaching in Xero is **Tier 3** — shared-state, hard-to-reverse, external system-of-record.
Per the AFK boundary it is **day-shift, human-in-loop, standard mode (no /fast)**. It requires the
**explicit verb** in the user's message ("create the bills", "push to Xero", "attach the receipts").
Never queue a Xero write into an unattended/AFK backlog.

## Mandatory guardrails (all of them, every batch)

1. **Explicit go per batch.** No standing authorisation. Each batch = one fresh "go".
2. **Dedup-safe.** Re-run the matcher immediately before writing; NEVER create where a bill/txn already
   exists. A DUPLICATE verdict means a record already exists → it is never a CREATE.
3. **Verify attempted vs actual.** After each batch, count what we tried to create vs what Xero confirms;
   log discrepancies. Silent partial failure is a bug (repo Error-Handling rule).
4. **Two-account rule.** Only ever write against NAB Visa #8815 / the ACT Everyday account. Never touch
   NM Personal or ACT Maximiser.
5. **Tracer-bullet first.** Prove ONE create+attach end-to-end (see `workflows/tracer-bullet.md`) and
   eyeball it in Xero before any batch run.
6. **Rate limits.** Xero is 60 req/min/tenant — sleep ~1100ms between calls (memory: Xero auth/rate trap).
7. **Auth.** On `invalid_grant`: `node scripts/sync-xero-tokens.mjs`. Max 3 retries, exponential backoff,
   never infinite-retry on auth.

## Implementation pointers (when we build it)

- OAuth client + token rotation: the codebase OAuth in `scripts/sync-xero-to-supabase.mjs` (the Xero MCP
  is unreliable for this — memory `xero-q2q3-recon-recode`).
- Create: `create-bank-transaction` (spend-money) or the bill API; attach via the Xero Attachments API.
- Receipt source: sign the `receipt-attachments` storage path (same `createSignedUrl` the cockpit uses),
  download, then upload to Xero.
- Surcharge: when matching a bill with a surcharge, the bank line needs an Adjustment line for the Δ — the
  API can't add it to a reconcile, so this stays a UI step (note it in the worklist).

## Before turning it on

- [ ] Write path implemented behind an explicit `--apply` style gate (dry-run default).
- [ ] Grilled (grill-with-docs) against this runbook + the money guards.
- [ ] Tracer-bullet: one create + one attach, verified in Xero.
- [ ] Attempted-vs-actual counter in place.
- [ ] Then, and only then, document it as live in SKILL.md "Current state".

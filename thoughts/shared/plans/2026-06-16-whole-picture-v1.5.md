---
title: Whole-Picture v1.5 — founders' session kit + un-withholding the money read
date: 2026-06-16
status: planning — built off the 2026-06-11 first-sitting (v1 on main)
deadline: 2026-06-27 (hard — last buildable window before 27 Jun–7 Aug world tour)
related:
  - thoughts/shared/plans/2026-06-10-act-whole-picture-founders-os.md (the founders OS + N1–N14 decisions)
  - thoughts/shared/handoffs/whole-picture-stack/current.md (v1 ledger)
  - scripts/build-monday-card.mjs (the proven fold pattern this mirrors)
---

## The headline finding (changes the sequencing)

v1.5's money-math half — cash on hand / runway / monthly burn / R&D basis $ — is **NOT a
free build**. It is gated on human decisions that belong to the founders' session, not to me:

1. **N3 "one money truth" is undecided.** Four org-level FY26 nets are in circulation
   (+$719K cash rollup · +$815K folded · −$222K committed · −$178K business-architecture).
   The founders-OS plan's own gate: *do not ship a net number until the founders declare canon.*
   → I must not autonomously un-withhold a single org net.
2. **Two-account cash has a known uncertainty band.** NJ Marchesi ACT Everyday + NAB Visa #8815
   = ~$223.8K (mirror, synced 06-05) — but #8815 reads −$65,220 in the mirror vs $6,792 owing on
   the last statement (06-02), ~373 lines awaiting manual UI matching → swings cash $223.8K ↔ ~$282K.
   The pipeline can compute it, but must surface the band, not a false point figure.
3. **Runway-in-months (N14) is a "build it for the session" item** against `lib/finance/ledger.ts`
   (replace-vs-additive modes + the 10-week Harvest/Goods staffing commitments).
4. **R&D basis = "nothing on paper"** (15078–81 absent from the mirror, unchecked checklist,
   DRAFT decision log). The sidecar can only honestly report that state + the collapse-to-$55K risk.

**Implication:** v1.5 splits into (A) what I can build AFK now, and (B) what stays display-gated
behind session decisions. The page keeps "withheld — no pipeline" honestly until B clears.

## Phases

### Phase 1 — `build-founders-session-kit.mjs` (AFK-safe, build now)
A monthly sibling of the Monday card: a read-only fold that preps the upcoming 1st-Tuesday
founders' session. Mirrors `build-monday-card.mjs` exactly (per-section isolation, staleness
badges, dry-run, Notion create-if-absent with state OUTSIDE the repo, ≤30-line Telegram, the
SAME withheld treatment for cash/runway/burn/R&D).
- **Day-guard:** fires Sat 7am (PM2 stub `0 7 * * 6`); in-script guard builds/sends ONLY when
  Sat+3d is the first Tuesday of the month (so it preps the session once/month); else exit clean.
- **Folds:** session date + cutover countdown (date arithmetic) · the whole-picture monthly read
  (four-lanes + soul + money snapshot, withheld parts withheld) · drift lights · a **session
  agenda scaffold** (standing decisions to ratify/review + per-founder per-lane moves
  To Us/To Down/To Grow/To Others × [5y|10y|20y|30y], like the Monday card's Notion scaffold).
- **Outputs:** `thoughts/shared/cockpit/founders-session/YYYY-MM-DD.md` + `latest.md` ·
  `thoughts/shared/founders-session-kit.html` · Notion session page (create-if-absent, state at
  `~/.act-founders-session-state.json`) · Telegram to TELEGRAM_CHAT_ID (+ _NIC if set).
- **Then:** uncomment the PM2 stub (ecosystem.config.cjs:976) + `pm2 save` (Tier 2).
- **Stop criteria:** `node scripts/build-founders-session-kit.mjs --dry-run` writes md+html and
  prints the would-be Telegram + would-create Notion, clean, with the day-guard exercised.

### Phase 2 — two-account cash pipeline (TDD-first, display-gated)
- TDD: failing test in `scripts/tests/` pinning two-account cash from `xero_bank_accounts`
  (Everyday + #8815 only; EXCLUDE NM Personal + Maximiser) to a KNOWN total, with the #8815
  uncertainty band asserted, and a freshness gate (stale → withhold, never show a stale number).
- Reuse, don't reinvent: examine `/api/finance/runway` + `loadCashInBank()` first.
- Output: a `cash` block the session-kit + whole-picture can read — but **rendered only when fresh
  AND after N3 picks a canon basis.** Until then it stays "withheld — no pipeline."

### Phase 3 — R&D-basis sidecar (honest state, from reconciliation-worklist)
- Emit the FY26 R&D basis as it actually stands (nothing-on-paper + collapse-to-$55K risk),
  sourced from `scripts/reconciliation-worklist.mjs`. Not a fabricated dollar figure.

### Phase 4 — ops (needs the founders / inputs)
- GCal recurring 1st-Tuesday founders'-session event (Tier 2/3 calendar write — invite Nic).
- Pre-departure drill + the **cron-host decision** (local Mac vs cloud, 27 Jun–7 Aug while away).
- **`TELEGRAM_CHAT_ID_NIC`** value (so the kit + Monday card reach Nic).

## Decisions needed from Ben/Nic
- **D1 (session-kit fold):** confirm the Phase-1 fold above is the right v1 content, or adjust.
- **D2 (cron host):** local Mac vs cloud for the 27 Jun–7 Aug away window.
- **D3 (Nic's Telegram chat id):** provide `TELEGRAM_CHAT_ID_NIC`.
- **(session-owned, not mine):** N3 one-money-truth · N14 runway model · the #8815 reconciliation
  that tightens the cash band — these unblock Phase 2's display, not Phase 1.

## Tier map
Phase 1 script + Phase 2/3 TDD = Tier 1 (AFK-safe). PM2 uncomment + pm2 save = Tier 2.
GCal event = Tier 2/3. No money net ships until N3. No Xero/GHL writes anywhere in v1.5.

---
title: Money Brain — issue set for closing the loop
date: 2026-05-17
status: open
generated_by: claude session
---

# Money Brain — 6 issues to close the loop

PR #65 shipped the AI infrastructure (Dext routing grader, Xero copilot wiring, pre-publish grader, narrative digest, Monday chain, AI suggestions review). These six issues close the remaining gaps named in the 2026-05-17 walkthrough.

Pick in priority order, ship one at a time. Each is independently grabbable.

| # | Issue | Effort | Closes |
|---|---|---|---|
| 1 | [#66 Push AI project_code to Dext tracking](https://github.com/Acurioustractor/act-global-infrastructure/issues/66) | 0.5 day | Receipt arrives in Dext with project already pre-filled |
| 2 | [#67 Founder pay tracker widget](https://github.com/Acurioustractor/act-global-infrastructure/issues/67) | 0.5 day | "Are we drawing what we should this month?" — one widget |
| 3 | [#68 Live R&D tracker](https://github.com/Acurioustractor/act-global-infrastructure/issues/68) | 1 day | Running total + 43.5% refund estimate + gap list |
| 4 | [#69 Xero webhook for sub-minute bank](https://github.com/Acurioustractor/act-global-infrastructure/issues/69) | 1 day | Bank lines in Supabase seconds after Xero sees them |
| 5 | [#70 Roadmap waterfall page](https://github.com/Acurioustractor/act-global-infrastructure/issues/70) | 1-2 days | 6mo / 12mo / 5yr cashflow vs goal |
| 6 | [#71 Phone shortcut + voice memo](https://github.com/Acurioustractor/act-global-infrastructure/issues/71) | 1.25 days | One-tap capture with business-purpose memo for the AI grader |

**Total: ~5 days of focused work.**

## The full loop, after these 6 issues land

```
60 seconds    Receipt + voice memo via iOS Shortcut → Dext
              (issue 6)

5 minutes     Dext OCR → finance_receipt_documents (already live)

15 minutes    Sonnet 4.6 grades, lands in workbench AND
              writes back to Dext as pre-filled tracking
              (existing + issue 1)

real-time     Bank line arrives → Xero webhook → Supabase mirror
              → workbench reflects in seconds
              (issue 4)

continuous    Founder pay gauge · R&D running total · Roadmap
              waterfall all reading live
              (issues 2 + 3 + 5)
```

## Priority order

If shipping sequentially: **1 → 4 → 2 → 3 → 6 → 5**.

- **1 first** because it removes friction on every single receipt — biggest daily quality-of-life win
- **4 next** because real-time bank visibility shifts the whole pipeline from polling to push
- **2 + 3** are CFO-visibility wins, can ship in parallel
- **6** depends on having spare hardware-config time (phone setup)
- **5** is the strategic forecasting layer — best done last when the underlying data is fresh

## What each issue unlocks for the founder

| Issue | What changes for Ben + Nic |
|---|---|
| #66 | Open Dext, project tracking already filled in — click Publish, done. ~50% fewer keystrokes per receipt |
| #67 | Glance at /finance/command, see "Ben: $0/$5000 MTD — need to draw" |
| #68 | Glance at /finance/command, see "R&D: $354K of $450K target, $154K refund pending" |
| #69 | When a grant lands, the daily 8:15am digest shows it the same morning, not 24h later |
| #70 | "What does FY27 look like if we land 70% of weighted pipeline?" — one chart |
| #71 | Tap once at the restaurant, no thinking, no typing — the AI grader gets the business-purpose memo and routes correctly |

## Definition of done for the whole set

When all 6 are merged:
- Every receipt is captured with context within 60 seconds of purchase
- AI grades it within 15 minutes, with the grade visible inline AND pushed back to Dext
- Bank lines flow in near-real-time
- Founder pay, R&D, and roadmap are live (no scripts needed to check status)
- Mon 8:00am + 8:15am Telegram pushes give you a complete picture before you open the laptop
- Fri 3:15pm Curtis-voice narrative summarises the week
- 30-min Monday review is realistic

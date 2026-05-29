# Close pack — FY26-Q3 (Jan–Mar)

_Generated 2026-05-29 · scope ACT (NAB Visa #8815 + Everyday) · Xero data as of 2026-05-29T08:00:01.587Z_

```

📕 Close pack — FY26-Q3 (Jan–Mar)
   Xero data as of 2026-05-29T08:00:01.587Z  ·  scope: ACT (NAB Visa #8815 + Everyday)
   358 bills · 9 sales · 547 bank txns in window

🔴 Reconciliation       70%      (380/547 ACT txns reconciled)
🟢 Receipt coverage     99%      ($3,570 unreceipted · 181 items)
🟡 Tagging              98%      (12 untagged · $10,361)
🔴 Cleanliness          42 flags (1 void-cand · 6 same-day dup · GE-429: 35 bills/$51,865)

💰 P&L (cash)         in $170,022 · out $162,949 · net $7,073   (bills raised $329,307)
🧾 BAS (indicative)   1A $14,261 − 1B $17,517 = net GST $-3,256   → indicative accruals — run prepare-bas.mjs Q3 for the cash-basis lodgement worksheet
🔬 R&D-eligible       $2,102  (core $2,102 / supporting $0 / review $0) · receipts 60%

   By project (sales / spend / bills):
     ACT-GD         $6,765 /    $77,126 /   $123,399
     ACT-HV       $100,290 /    $15,487 /    $50,024
     ACT-IN             $0 /    $43,877 /    $91,062
     ACT-SM        $32,200 /     $5,977 /         $0
     ACT-FM             $0 /    $14,576 /    $15,295
     ACT-JH        $27,500 /        $96 /         $0

──────────────────────────────────────────────────────────
🔴 NOT READY TO CLOSE — 4 item(s) to clear

To close FY26-Q3:
  1. Investigate 6 same-day exact duplicate group(s) in period
  2. Recode 35 GE-429 bill(s) ($51,865) out of General Expenses → scripts/apply-ge-recode-to-xero.mjs
  3. Tag 12 untagged item(s) ($10,361) → /finance/mirror
  4. Reconcile 167 unreconciled ACT transaction(s) → Xero
```

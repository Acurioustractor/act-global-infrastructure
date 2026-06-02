# Reconcile write-log — NAB Visa #8815 (Tier-3 Xero writes, audit trail)

Every API write to live Xero from the reconcile-prep engine, in order. Each delete was live-gated (SPEND + recon=false + keeper bill PAID with receipt) and verified attempted-vs-actual.

| timestamp (UTC) | action | txn date | vendor | amount | deleted | keeper bill | result |
|---|---|---|---|---|---|---|---|
| 2026-06-02 (tracer) | DELETE_PHANTOM | 2025-11-14 | Apple Pty Ltd | $11.99 | spend-money `ced64d63-c72a-48b8-848d-508415a0899f` | PAID bill `eb46b04e-0373-49b4-8091-ccae7a6cf861` | OK — deleted, bill+receipt intact |

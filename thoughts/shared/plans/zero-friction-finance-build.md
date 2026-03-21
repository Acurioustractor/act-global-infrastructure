# Zero-Friction Finance — Build Plan

**Date:** 2026-03-20
**Status:** BUILDING

## Phase 1: Cash Position Dashboard (build now)
- API endpoint: `/api/finance/cash-position`
- Pull latest bank balances from Xero data in Supabase
- Show: balance per account, total cash, unreconciled count, receivables pipeline
- Add to command center Today page or Finance overview

## Phase 2: Xero Repeating Invoices for SaaS (build script, needs Xero auth to run)
- Generate repeating invoice setup for all 30+ recurring subscriptions
- Script: `scripts/setup-repeating-invoices.mjs`
- Uses the subscription data we already have from vendor_project_rules + transaction history
- Each repeating invoice: vendor, amount (monthly avg), frequency, account code, project tracking

## Phase 3: Gmail → Xero Auto-Forward (build filters)
- Set up Gmail filters to auto-forward receipt emails from known vendors to Xero's receipt inbox
- Uses Google API (already configured with domain-wide delegation)
- Vendors: Qantas, Uber, Virgin, Thrifty, Avis, all SaaS vendors
- Script: `scripts/setup-gmail-receipt-forwarding.mjs`

## Phase 4: Bank Rules Preparation
- Generate Xero bank rule definitions for predictable transactions
- NAB fees → ACT-HQ, Bank Charges
- Transfers → ACT-HQ, Internal Transfers
- Each subscription vendor → correct account + project tracking

## Phase 5: Corporate Card Research
- Research Weel, DiviPay, Airwallex for project-based virtual cards
- Compare: Xero integration, per-card project tagging, receipt capture, cost
- Recommendation document

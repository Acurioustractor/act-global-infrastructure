/**
 * @act/intel — Shared intelligence layer for ACT ecosystem.
 *
 * Pure TypeScript query functions that return typed objects.
 * Consumers (Telegram bot, Notion Workers, API routes) format for their interface.
 */
// Utilities
export { getBrisbaneDate, getBrisbaneNow, getBrisbaneDateOffset, daysAgoISO, daysFromNowDate } from './util/dates.js';
export { loadProjectCodes, clearProjectCodesCache } from './util/projects.js';
// Briefing
export { fetchDailyBriefing } from './briefing/daily-briefing.js';
// Projects
export { fetchProjectHealth } from './projects/health.js';
// Finance
export { fetchFinancialSummary } from './finance/financial-summary.js';
export { fetchCashflow } from './finance/cashflow.js';
export { fetchRevenueScoreboard } from './finance/revenue-scoreboard.js';
export { fetchProjectFinancials } from './finance/project-financials.js';
export { fetchReceiptPipeline } from './finance/receipt-pipeline.js';
// Contacts
export { searchContacts } from './contacts/search.js';
export { fetchContactDetails } from './contacts/details.js';
export { fetchContactsNeedingAttention } from './contacts/attention.js';
// Grants
export { fetchGrantDeadlines } from './grants/deadlines.js';
export { fetchGrantPipeline, fetchGrantOpportunities, fetchFundingPipeline } from './grants/pipeline.js';
export { fetchGrantReadiness } from './grants/readiness.js';
// Knowledge
export { searchKnowledge } from './knowledge/search.js';
// Emails
export { fetchUnansweredEmails, triageEmails } from './emails/search.js';
// Projects (additional)
export { fetchProjectSummary } from './projects/summary.js';
export { fetchProjectIntelligence } from './projects/intelligence.js';
export { fetchProjectsNeedingAttention } from './projects/attention.js';
export { fetchWeeklyProjectPulse } from './projects/weekly-pulse.js';
export { fetchProjectCloseoff } from './projects/closeoff.js';
// Finance (additional)
export { fetchOutstandingInvoices } from './finance/outstanding-invoices.js';
export { fetchCashflowExplained } from './finance/cashflow-explained.js';
export { fetchProjectPnl } from './finance/project-pnl.js';
export { fetchPipelineValue } from './finance/pipeline-value.js';
export { fetchRevenueForecast } from './finance/revenue-forecast.js';
export { fetchTransactionFixes } from './finance/transaction-fixes.js';
export { fetchWeeklyFinancialReview } from './finance/weekly-review.js';
export { fetchReconciliationStatus } from './finance/reconciliation.js';
export { fetchUntaggedSummary } from './finance/untagged-summary.js';
export { fetchOverdueActions } from './finance/overdue-actions.js';
// Grants (additional)
export { fetchGrantsSummary } from './grants/summary.js';
export { fetchGrantRequirements } from './grants/requirements.js';
export { fetchDailyGrantReport } from './grants/daily-report.js';
// Impact
export { fetchImpactSummary } from './impact/summary.js';
// Data Quality
export { fetchDataFreshness } from './data-quality/freshness.js';
// Meetings
export { searchMeetings } from './meetings/search.js';
export { fetchMeetingActions } from './meetings/actions.js';
// Orchestration (proactive agent compositions)
export { fetchDailyReview } from './orchestration/daily-review.js';
export { fetchMeetingContext } from './orchestration/meeting-context.js';
export { fetchWeeklyCleanup } from './orchestration/weekly-cleanup.js';
export { fetchGrantSuggestions } from './orchestration/grant-suggestions.js';
//# sourceMappingURL=index.js.map
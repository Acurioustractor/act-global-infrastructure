/**
 * Daily review — proactive orchestration that combines multiple intelligence
 * sources into a single actionable morning digest.
 *
 * Composes: briefing + grant deadlines + overdue finance actions + contacts
 * needing attention + unanswered emails + receipt pipeline status.
 */
import { fetchDailyBriefing } from '../briefing/daily-briefing.js';
import { fetchGrantDeadlines } from '../grants/deadlines.js';
import { fetchOverdueActions } from '../finance/overdue-actions.js';
import { fetchContactsNeedingAttention } from '../contacts/attention.js';
import { fetchUnansweredEmails } from '../emails/search.js';
import { fetchReceiptPipeline } from '../finance/receipt-pipeline.js';
import { fetchOutstandingInvoices } from '../finance/outstanding-invoices.js';
import { getBrisbaneDate } from '../util/dates.js';
export async function fetchDailyReview(supabase, opts = {}) {
    const pc = opts.project_code;
    // Run all queries in parallel
    const [briefing, grantDeadlines, financeActions, contacts, emails, receipts, invoices] = await Promise.all([
        fetchDailyBriefing(supabase, { lookbackDays: 7, projectCode: pc }),
        fetchGrantDeadlines(supabase, { days_ahead: opts.grant_days_ahead ?? 14, project_code: pc }),
        fetchOverdueActions(supabase),
        fetchContactsNeedingAttention(supabase, { limit: opts.contact_limit ?? 5, project: pc }),
        fetchUnansweredEmails(supabase, { limit: opts.email_limit ?? 10 }),
        fetchReceiptPipeline(supabase, {}),
        fetchOutstandingInvoices(supabase, {}),
    ]);
    // Build priority summary by scanning all results
    const critical = [];
    const attention = [];
    const info = [];
    // Grant deadlines → critical/attention
    for (const g of grantDeadlines.deadlines) {
        if (g.urgency === 'CRITICAL' || g.urgency === 'URGENT') {
            critical.push({
                category: 'grant',
                urgency: g.urgency === 'CRITICAL' ? 'critical' : 'high',
                title: `Grant deadline: ${g.application_name}`,
                detail: `${g.days_remaining}d remaining, ${g.progress.pct}% complete (${g.provider})`,
            });
        }
        else if (g.urgency === 'SOON') {
            attention.push({
                category: 'grant',
                urgency: 'medium',
                title: `Grant upcoming: ${g.application_name}`,
                detail: `${g.days_remaining}d remaining (${g.provider})`,
            });
        }
    }
    // Finance actions → critical/attention
    for (const a of financeActions.actions) {
        const item = {
            category: 'finance',
            urgency: a.priority === 'critical' ? 'critical' : a.priority === 'high' ? 'high' : 'medium',
            title: a.title,
            detail: a.description,
        };
        if (a.priority === 'critical')
            critical.push(item);
        else
            attention.push(item);
    }
    // Overdue actions from briefing → critical
    for (const a of briefing.overdue_actions.slice(0, 5)) {
        critical.push({
            category: 'action',
            urgency: 'high',
            title: `Overdue: ${a.title}`,
            detail: `${a.project_code} — due ${a.follow_up_date}`,
        });
    }
    // Contacts needing attention → attention
    for (const c of contacts.contacts.slice(0, 3)) {
        attention.push({
            category: 'contact',
            urgency: c.risk_flags.length > 0 ? 'high' : 'medium',
            title: `${c.name}${c.company ? ` (${c.company})` : ''}`,
            detail: c.recommended_action,
        });
    }
    // Unanswered emails → attention/info
    const urgentEmails = emails.emails.filter((e) => (e.days_since ?? 0) > 3);
    for (const e of urgentEmails.slice(0, 3)) {
        attention.push({
            category: 'email',
            urgency: (e.days_since ?? 0) > 7 ? 'high' : 'medium',
            title: `Unanswered: ${e.subject}`,
            detail: `From ${e.contact_name || e.contact_email || 'unknown'} — ${e.days_since}d ago`,
        });
    }
    // Receipt pipeline alerts → info
    for (const alert of receipts.alerts.slice(0, 3)) {
        info.push({
            category: 'receipt',
            urgency: 'low',
            title: 'Receipt alert',
            detail: alert,
        });
    }
    // Outstanding invoices summary → info
    if (invoices.count > 0) {
        attention.push({
            category: 'finance',
            urgency: 'medium',
            title: `${invoices.count} overdue invoices`,
            detail: `$${invoices.totalDue.toLocaleString()} outstanding`,
        });
    }
    return {
        date: getBrisbaneDate(),
        briefing,
        grant_deadlines: grantDeadlines,
        finance_actions: financeActions,
        contacts_needing_attention: contacts,
        unanswered_emails: emails,
        receipt_pipeline: receipts,
        outstanding_invoices: invoices,
        priority_summary: {
            critical_items: critical,
            attention_items: attention,
            info_items: info,
        },
    };
}
//# sourceMappingURL=daily-review.js.map
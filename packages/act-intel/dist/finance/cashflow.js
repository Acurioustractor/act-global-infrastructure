/**
 * Cashflow — current month actuals, projections, and outstanding invoices.
 *
 * Merges agent-tools forecast (snapshots + invoices + scenarios) and
 * Notion Workers summary (v_cashflow_summary view).
 */
import { getBrisbaneNow } from '../util/dates.js';
export async function fetchCashflow(supabase, opts = {}) {
    const monthsAhead = opts.monthsAhead ?? 6;
    const monthsHistory = opts.monthsHistory ?? 6;
    const now = getBrisbaneNow();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const [snapshotsRes, txRes, invoicesRes, scenariosRes, cashflowViewRes] = await Promise.all([
        supabase
            .from('financial_snapshots')
            .select('month, income, expenses, net, closing_balance, is_projection, confidence')
            .eq('is_projection', false)
            .order('month', { ascending: true })
            .limit(24),
        supabase
            .from('xero_transactions')
            .select('total, type')
            .gte('date', monthStart)
            .lte('date', monthEnd),
        supabase
            .from('xero_invoices')
            .select('total, amount_due, type, due_date')
            .gt('amount_due', 0)
            .in('status', ['AUTHORISED', 'SUBMITTED']),
        supabase
            .from('cashflow_scenarios')
            .select('name, description, adjustments')
            .eq('is_active', true),
        supabase
            .from('v_cashflow_summary')
            .select('month, income, expenses, net, closing_balance, is_projection, confidence')
            .order('month', { ascending: false })
            .limit(monthsHistory),
    ]);
    const snapshots = snapshotsRes.data || [];
    const transactions = txRes.data || [];
    const invoices = invoicesRes.data || [];
    // Current month actuals
    let monthIncome = 0;
    let monthExpenses = 0;
    for (const tx of transactions) {
        const t = tx;
        if (t.type === 'RECEIVE')
            monthIncome += Math.abs(t.total || 0);
        else if (t.type === 'SPEND')
            monthExpenses += Math.abs(t.total || 0);
    }
    // Outstanding invoices
    let receivables = 0;
    let payables = 0;
    for (const inv of invoices) {
        const i = inv;
        const amt = Math.abs(i.amount_due || 0);
        if (i.type === 'ACCREC')
            receivables += amt;
        else if (i.type === 'ACCPAY')
            payables += amt;
    }
    // Averages from last 6 months of snapshots
    const recent = snapshots.slice(-6);
    const avgIncome = recent.length > 0 ? recent.reduce((s, r) => s + Number(r.income || 0), 0) / recent.length : 0;
    const avgExpenses = recent.length > 0 ? recent.reduce((s, r) => s + Number(r.expenses || 0), 0) / recent.length : 0;
    const lastBalance = snapshots.length > 0 ? Number(snapshots[snapshots.length - 1].closing_balance || 0) : 0;
    // Generate projections
    const projections = [];
    let balance = lastBalance + (monthIncome - monthExpenses);
    for (let i = 1; i <= monthsAhead; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthNet = avgIncome - avgExpenses;
        balance += monthNet;
        projections.push({
            month: d.toISOString().slice(0, 7),
            income: Math.round(avgIncome),
            expenses: Math.round(avgExpenses),
            balance: Math.round(balance),
            confidence: Math.max(0.5, 1 - i * 0.08),
        });
    }
    const burnRate = Math.max(0, Math.round(avgExpenses - avgIncome));
    const runway = burnRate > 0 ? Math.round((balance / burnRate) * 10) / 10 : null;
    // History from view
    const history = (cashflowViewRes.data || [])
        .reverse()
        .map(m => ({
        month: m.month,
        income: Number(m.income || 0),
        expenses: Number(m.expenses || 0),
        net: Number(m.net || 0),
        closing_balance: Number(m.closing_balance || 0),
        is_projection: m.is_projection,
        confidence: m.confidence,
    }));
    return {
        current_month: {
            period: now.toISOString().slice(0, 7),
            income: Math.round(monthIncome),
            expenses: Math.round(monthExpenses),
            net: Math.round(monthIncome - monthExpenses),
        },
        outstanding: {
            receivables: Math.round(receivables),
            payables: Math.round(payables),
            net: Math.round(receivables - payables),
        },
        metrics: {
            avg_monthly_income: Math.round(avgIncome),
            avg_monthly_expenses: Math.round(avgExpenses),
            burn_rate: burnRate,
            estimated_balance: Math.round(balance),
            runway_months: runway,
        },
        projections,
        history,
        scenarios: (scenariosRes.data || []).map(s => ({
            name: s.name,
            description: s.description,
            adjustments: s.adjustments,
        })),
    };
}
//# sourceMappingURL=cashflow.js.map
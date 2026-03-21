/**
 * Weekly financial review — comprehensive weekly finance overview.
 *
 * Extracted from Notion Workers Tool 22 (run_weekly_financial_review).
 * This is the largest single query function, pulling from ~10 tables.
 */
export async function fetchWeeklyFinancialReview(supabase, opts = {}) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = opts.weekAgoDate || weekAgo.toISOString().split('T')[0];
    // -- 1. CASH POSITION --
    const { data: snapshots } = await supabase
        .from('financial_snapshots')
        .select('month, closing_balance, income, expenses')
        .order('month', { ascending: false })
        .limit(6);
    const latest = snapshots?.[0];
    const prior = snapshots?.[1];
    const balance = Number(latest?.closing_balance || 0);
    const balanceChange = prior ? balance - Number(prior.closing_balance || 0) : 0;
    let totalBurn = 0;
    for (const m of (snapshots || [])) {
        totalBurn += Math.max(0, Number(m.expenses || 0) - Number(m.income || 0));
    }
    const snapshotCount = (snapshots?.length || 1);
    const burnRate = snapshotCount > 0 ? totalBurn / snapshotCount : 0;
    const runway = burnRate > 0 ? Math.round((balance / burnRate) * 10) / 10 : 0;
    // -- 2. THIS WEEK --
    const { data: weekTxns } = await supabase
        .from('xero_transactions')
        .select('total, type, contact_name, project_code')
        .gte('date', weekAgoStr);
    let weekIncome = 0;
    let weekExpenses = 0;
    const incomeByContact = {};
    const expenseByContact = {};
    for (const tx of (weekTxns || [])) {
        const amt = Math.abs(Number(tx.total) || 0);
        const contact = tx.contact_name || 'Unknown';
        if (tx.type === 'RECEIVE') {
            weekIncome += amt;
            incomeByContact[contact] = (incomeByContact[contact] || 0) + amt;
        }
        else if (tx.type === 'SPEND') {
            weekExpenses += amt;
            expenseByContact[contact] = (expenseByContact[contact] || 0) + amt;
        }
    }
    const topIncome = Object.entries(incomeByContact).sort(([, a], [, b]) => b - a).slice(0, 3);
    const topExpenses = Object.entries(expenseByContact).sort(([, a], [, b]) => b - a).slice(0, 3);
    // -- 3. OVERDUE INVOICES --
    const { data: invoices } = await supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, amount_due, due_date, status')
        .in('status', ['AUTHORISED', 'SENT'])
        .eq('type', 'ACCREC')
        .gt('amount_due', 0);
    const buckets = { current: 0, '1-30d': 0, '31-60d': 0, '61-90d': 0, '90d+': 0 };
    const overdueItems = [];
    let totalDue = 0;
    for (const inv of (invoices || [])) {
        const amt = Number(inv.amount_due) || 0;
        totalDue += amt;
        if (!inv.due_date || inv.due_date >= today) {
            buckets.current += amt;
        }
        else {
            const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
            if (daysOverdue <= 30)
                buckets['1-30d'] += amt;
            else if (daysOverdue <= 60)
                buckets['31-60d'] += amt;
            else if (daysOverdue <= 90)
                buckets['61-90d'] += amt;
            else
                buckets['90d+'] += amt;
            overdueItems.push({
                contact_name: inv.contact_name || null,
                amount_due: amt,
                days_overdue: daysOverdue,
                invoice_number: inv.invoice_number || null,
            });
        }
    }
    // -- 4. RECEIPT GAP --
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
    const { count: totalExpensesCount } = await supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'SPEND')
        .gte('date', threeMonthsAgoStr);
    const { count: withReceiptsCount } = await supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'SPEND')
        .eq('has_attachment', true)
        .gte('date', threeMonthsAgoStr);
    const receiptTotal = totalExpensesCount || 0;
    const receiptMatched = withReceiptsCount || 0;
    const receiptScore = receiptTotal > 0 ? Math.round((receiptMatched / receiptTotal) * 100) : 100;
    // -- 5. PROJECT SPEND --
    const projectSpendMap = {};
    for (const tx of (weekTxns || [])) {
        if (tx.project_code && (Number(tx.total) || 0) < 0) {
            projectSpendMap[tx.project_code] = (projectSpendMap[tx.project_code] || 0) + Math.abs(Number(tx.total));
        }
    }
    const projectSpend = Object.entries(projectSpendMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([code, amount]) => ({ code, amount }));
    // -- 6. GRANT DEADLINES (next 14 days) --
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() + 14);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const { data: grants } = await supabase
        .from('grant_applications')
        .select('application_name, project_code, status, milestones')
        .in('status', ['draft', 'in_progress', 'submitted', 'under_review', 'successful']);
    const grantDeadlines = [];
    for (const g of (grants || [])) {
        for (const m of (g.milestones || [])) {
            if (m.due && m.due <= cutoffStr && m.due >= today && !m.completed) {
                const daysLeft = Math.ceil((new Date(m.due).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                grantDeadlines.push({
                    application_name: g.application_name,
                    milestone_name: m.name || 'Milestone',
                    days_remaining: daysLeft,
                });
            }
        }
    }
    // -- 7. R&D SPEND --
    const { data: rdRules } = await supabase
        .from('vendor_project_rules')
        .select('vendor_name')
        .eq('rd_eligible', true);
    const rdVendors = new Set((rdRules || []).map((r) => r.vendor_name));
    let weekRd = 0;
    for (const tx of (weekTxns || [])) {
        if (rdVendors.has(tx.contact_name) && (Number(tx.total) || 0) < 0) {
            weekRd += Math.abs(Number(tx.total));
        }
    }
    const fyStart = now.getMonth() >= 6 ? `${now.getFullYear()}-07-01` : `${now.getFullYear() - 1}-07-01`;
    const { data: ytdTxns } = await supabase
        .from('xero_transactions')
        .select('contact_name, total')
        .lt('total', 0)
        .gte('date', fyStart);
    let ytdRd = 0;
    for (const tx of (ytdTxns || [])) {
        if (rdVendors.has(tx.contact_name))
            ytdRd += Math.abs(Number(tx.total));
    }
    // -- 8. DATA QUALITY --
    const { count: untaggedCount } = await supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .is('project_code', null)
        .gte('date', '2024-07-01')
        .lt('total', 0);
    const { count: totalTxCount } = await supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('date', '2024-07-01')
        .lt('total', 0);
    const untagged = untaggedCount || 0;
    const totalTx = totalTxCount || 0;
    const coverage = totalTx > 0 ? Math.round(((totalTx - untagged) / totalTx) * 100) : 100;
    // -- 9. ACTION ITEMS --
    const actionItems = [];
    if (overdueItems.length > 0) {
        actionItems.push({
            type: 'CHASE',
            description: `${overdueItems.length} overdue invoices ($${Math.round(totalDue - buckets.current).toLocaleString()})`,
        });
    }
    if (receiptTotal - receiptMatched > 5) {
        actionItems.push({
            type: 'CAPTURE',
            description: `${receiptTotal - receiptMatched} missing receipts (score: ${receiptScore}%)`,
        });
    }
    if (untagged > 10) {
        actionItems.push({
            type: 'TAG',
            description: `${untagged} untagged transactions (coverage: ${coverage}%)`,
        });
    }
    if (grantDeadlines.length > 0) {
        actionItems.push({
            type: 'GRANTS',
            description: `${grantDeadlines.length} deadline(s) within 14 days`,
        });
    }
    if (runway > 0 && runway < 6) {
        actionItems.push({
            type: 'RUNWAY',
            description: `${runway} months -- review burn rate`,
        });
    }
    return {
        weekOf: weekAgoStr,
        cashPosition: { balance, balanceChange, burnRate, runway },
        thisWeek: {
            income: weekIncome,
            expenses: weekExpenses,
            net: weekIncome - weekExpenses,
            topIncome,
            topExpenses,
            transactionCount: (weekTxns || []).length,
        },
        overdueInvoices: {
            count: overdueItems.length,
            totalDue,
            buckets,
            items: overdueItems,
        },
        receiptGap: {
            score: receiptScore,
            matched: receiptMatched,
            total: receiptTotal,
            missing: receiptTotal - receiptMatched,
        },
        projectSpend,
        grantDeadlines,
        rdSpend: {
            thisWeek: weekRd,
            ytd: ytdRd,
            offset435: ytdRd * 0.435,
        },
        dataQuality: { coverage, untagged, total: totalTx },
        actionItems,
    };
}
//# sourceMappingURL=weekly-review.js.map
/**
 * Overdue actions — aggregated overdue items across 5 finance sources.
 *
 * Extracted from Notion Workers Tool 36 (get_overdue_actions).
 */
export async function fetchOverdueActions(supabase) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString();
    const actions = [];
    // 1. Untagged transactions (>7 days, excl transfers)
    const { data: untagged, count: untaggedCount } = await supabase
        .from('xero_transactions')
        .select('contact_name, total, date', { count: 'exact' })
        .is('project_code', null)
        .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
        .lt('date', sevenDaysAgoStr)
        .order('total', { ascending: true })
        .limit(5);
    if ((untaggedCount || 0) > 0) {
        const topVendors = (untagged || [])
            .map((t) => `${t.contact_name || '?'} ($${Math.abs(Number(t.total)).toLocaleString()})`)
            .join(', ');
        actions.push({
            type: 'untagged_transactions',
            priority: (untaggedCount || 0) > 50 ? 'critical' : 'high',
            title: `${untaggedCount} untagged transactions (>7 days old)`,
            description: `Top: ${topVendors}`,
            estimatedMinutes: Math.ceil((untaggedCount || 0) / 10),
        });
    }
    // 2. Missing receipts (SPEND, no attachments, >7 days)
    const { count: missingReceiptCount } = await supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .in('type', ['SPEND', 'ACCPAY'])
        .or('has_attachments.is.null,has_attachments.eq.false')
        .lt('date', sevenDaysAgoStr);
    if ((missingReceiptCount || 0) > 0) {
        actions.push({
            type: 'missing_receipts',
            priority: (missingReceiptCount || 0) > 100 ? 'critical' : 'high',
            title: `${missingReceiptCount} spend transactions missing receipts`,
            description: 'ATO requires receipt retention for 5 years. Forward to Dext or mark as no-receipt-needed.',
            estimatedMinutes: Math.ceil((missingReceiptCount || 0) / 5),
        });
    }
    // 3. Overdue invoices (ACCREC past due_date, still AUTHORISED/SENT)
    const { data: overdueInvoices, count: overdueCount } = await supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, amount_due, due_date', { count: 'exact' })
        .eq('type', 'ACCREC')
        .in('status', ['AUTHORISED', 'SENT'])
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .limit(5);
    if ((overdueCount || 0) > 0) {
        const totalOverdue = (overdueInvoices || []).reduce((s, i) => s + Math.abs(Number(i.amount_due) || 0), 0);
        const invoiceList = (overdueInvoices || [])
            .map((i) => `${i.contact_name} #${i.invoice_number} ($${Math.abs(Number(i.amount_due)).toLocaleString()})`)
            .join(', ');
        actions.push({
            type: 'overdue_invoices',
            priority: 'critical',
            title: `${overdueCount} overdue invoices ($${Math.round(totalOverdue).toLocaleString()})`,
            description: invoiceList,
            estimatedMinutes: (overdueCount || 0) * 5,
        });
    }
    // 4. Grant deadlines passed
    const { data: passedGrants, count: grantCount } = await supabase
        .from('grant_applications')
        .select('funder_name, deadline, status', { count: 'exact' })
        .lt('deadline', today)
        .not('status', 'in', '("submitted","awarded","rejected","expired","lost")')
        .order('deadline', { ascending: true })
        .limit(5);
    if ((grantCount || 0) > 0) {
        const grantList = (passedGrants || [])
            .map((g) => `${g.funder_name} (deadline ${g.deadline}, status: ${g.status})`)
            .join(', ');
        actions.push({
            type: 'grant_deadlines',
            priority: 'high',
            title: `${grantCount} grant deadlines passed without submission`,
            description: grantList,
            estimatedMinutes: (grantCount || 0) * 10,
        });
    }
    // 5. Stuck pipeline items (>14 days in same stage, not reconciled)
    const { count: stuckCount } = await supabase
        .from('receipt_pipeline_status')
        .select('*', { count: 'exact', head: true })
        .not('stage', 'eq', 'reconciled')
        .lt('transaction_date', fourteenDaysAgoStr);
    if ((stuckCount || 0) > 0) {
        actions.push({
            type: 'stuck_pipeline',
            priority: 'medium',
            title: `${stuckCount} receipt pipeline items stuck >14 days`,
            description: 'Items not progressing through receipt pipeline.',
            estimatedMinutes: (stuckCount || 0) * 3,
        });
    }
    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    return { actions };
}
//# sourceMappingURL=overdue-actions.js.map
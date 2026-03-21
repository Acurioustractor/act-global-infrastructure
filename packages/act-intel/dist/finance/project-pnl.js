/**
 * Project P&L — monthly profit & loss for a specific project.
 *
 * Extracted from Notion Workers Tool 16 (get_project_pnl).
 */
export async function fetchProjectPnl(supabase, opts) {
    const code = opts.project_code.toUpperCase();
    const max = opts.months ?? 12;
    const { data, error } = await supabase
        .from('project_monthly_financials')
        .select('*')
        .eq('project_code', code)
        .order('month', { ascending: false })
        .limit(max);
    if (error)
        throw new Error(`Failed to fetch project P&L: ${error.message}`);
    if (!data?.length) {
        return { project_code: code, months: [], totalRevenue: 0, totalExpenses: 0 };
    }
    const rows = data.reverse();
    let totalRevenue = 0;
    let totalExpenses = 0;
    const months = rows.map((m) => {
        const rev = Number(m.revenue || 0);
        const exp = Number(m.expenses || 0);
        totalRevenue += rev;
        totalExpenses += exp;
        return {
            month: m.month,
            revenue: rev,
            expenses: exp,
            net: Number(m.net || 0),
            expense_breakdown: m.expense_breakdown || {},
            fy_ytd_revenue: m.fy_ytd_revenue != null ? Number(m.fy_ytd_revenue) : null,
            fy_ytd_expenses: m.fy_ytd_expenses != null ? Number(m.fy_ytd_expenses) : null,
            fy_ytd_net: m.fy_ytd_net != null ? Number(m.fy_ytd_net) : null,
        };
    });
    return { project_code: code, months, totalRevenue, totalExpenses };
}
//# sourceMappingURL=project-pnl.js.map
/**
 * Project close-off checklist — comprehensive wrap-up data for a project.
 *
 * Extracted from Notion Workers Tool 32 (get_project_closeoff).
 */
export async function fetchProjectCloseoff(supabase, opts) {
    const code = opts.project_code;
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString();
    // Parallel data fetch
    const [{ data: invoices }, { data: openActions }, { data: contacts }, { data: recentDecisions }, { data: grants }, { data: recentKnowledge },] = await Promise.all([
        supabase
            .from('xero_invoices')
            .select('invoice_number, contact_name, amount_due, due_date, status, type')
            .in('status', ['AUTHORISED', 'SENT', 'DRAFT'])
            .gt('amount_due', 0),
        supabase
            .from('project_knowledge')
            .select('title, recorded_at, importance, action_items, participants')
            .eq('project_code', code)
            .eq('action_required', true)
            .order('recorded_at', { ascending: false })
            .limit(30),
        supabase
            .from('ghl_contacts')
            .select('full_name, email, temperature, temperature_trend, engagement_status, projects, last_contacted_at')
            .not('full_name', 'is', null)
            .not('projects', 'is', null)
            .limit(200),
        supabase
            .from('project_knowledge')
            .select('title, content, decision_status, recorded_at')
            .eq('project_code', code)
            .eq('knowledge_type', 'decision')
            .gte('recorded_at', ninetyDaysAgoStr)
            .order('recorded_at', { ascending: false })
            .limit(20),
        supabase
            .from('grant_applications')
            .select('application_name, status, amount_requested, milestones')
            .eq('project_code', code),
        supabase
            .from('project_knowledge')
            .select('title, knowledge_type, recorded_at')
            .eq('project_code', code)
            .gte('recorded_at', ninetyDaysAgoStr)
            .order('recorded_at', { ascending: false })
            .limit(50),
    ]);
    // 1. FINANCIAL — filter invoices by tracking_category or contact_name containing code
    const projectInvoices = (invoices || []).filter((inv) => inv.tracking_category?.includes(code) ||
        inv.contact_name?.includes(code));
    const receivables = projectInvoices
        .filter((inv) => inv.type === 'ACCREC')
        .map((inv) => ({
        invoice_number: inv.invoice_number || null,
        contact_name: inv.contact_name || null,
        amount_due: Number(inv.amount_due || 0),
        due_date: inv.due_date || null,
        type: 'ACCREC',
    }));
    const payables = projectInvoices
        .filter((inv) => inv.type === 'ACCPAY')
        .map((inv) => ({
        invoice_number: inv.invoice_number || null,
        contact_name: inv.contact_name || null,
        amount_due: Number(inv.amount_due || 0),
        due_date: inv.due_date || null,
        type: 'ACCPAY',
    }));
    // 2. ACTIONS
    const actions = (openActions || []).map((a) => ({
        title: a.title,
        age_days: Math.floor((Date.now() - new Date(a.recorded_at).getTime()) / 86400000),
        importance: a.importance || null,
    }));
    // 3. CONTACTS — filter to project
    const projectContacts = (contacts || [])
        .filter((c) => {
        const projs = Array.isArray(c.projects) ? c.projects : [];
        return projs.some((p) => p.includes(code));
    })
        .map((c) => ({
        full_name: c.full_name,
        temperature_trend: c.temperature_trend || null,
        last_contacted_at: c.last_contacted_at
            ? new Date(c.last_contacted_at).toISOString().split('T')[0]
            : null,
    }));
    // 4. DECISIONS
    const decisions = (recentDecisions || []).map((d) => ({
        title: d.title,
        decision_status: d.decision_status || null,
        recorded_at: new Date(d.recorded_at).toISOString().split('T')[0],
    }));
    // 5. KNOWLEDGE ARTIFACTS
    const knowledgeByType = {};
    for (const k of (recentKnowledge || [])) {
        const t = k.knowledge_type || 'other';
        knowledgeByType[t] = (knowledgeByType[t] || 0) + 1;
    }
    // 6. GRANTS
    const grantEntries = (grants || []).map((g) => ({
        application_name: g.application_name,
        status: g.status,
        amount_requested: g.amount_requested ? Number(g.amount_requested) : null,
        openMilestones: (g.milestones || [])
            .filter((m) => !m.completed)
            .map((m) => ({ name: m.name || 'Milestone', due: m.due || null })),
    }));
    const totalItems = (receivables.length + payables.length) +
        actions.length +
        projectContacts.length +
        decisions.length +
        grantEntries.length;
    return {
        project_code: code,
        financial: { receivables, payables },
        actions,
        contacts: projectContacts,
        decisions,
        knowledge: knowledgeByType,
        grants: grantEntries,
        totalItems,
    };
}
//# sourceMappingURL=closeoff.js.map
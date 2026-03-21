/**
 * Email search — unanswered emails and triage from Supabase views.
 *
 * Note: Gmail API direct search stays in agent-tools.ts (Google SDK dependency).
 * This module handles the Supabase-backed email views used by both consumers.
 */
export async function fetchUnansweredEmails(supabase, opts = {}) {
    const max = opts.limit ?? 20;
    const { data, error } = await supabase
        .from('v_need_to_respond')
        .select('contact_name, contact_email, subject, summary, days_since, sentiment, topics')
        .order('occurred_at', { ascending: true })
        .limit(max);
    if (error)
        throw new Error(`Unanswered emails query failed: ${error.message}`);
    const emails = (data || []).map((e) => ({
        contact_name: e.contact_name,
        contact_email: e.contact_email,
        subject: e.subject,
        summary: e.summary,
        days_since: e.days_since,
        sentiment: e.sentiment,
        topics: e.topics,
    }));
    return { count: emails.length, emails };
}
const KEY_TAGS = ['partner', 'funder', 'board', 'investor', 'government', 'key_contact'];
export async function triageEmails(supabase, opts = {}) {
    const max = opts.limit ?? 10;
    const { data: emails, error } = await supabase
        .from('v_need_to_respond')
        .select('id, ghl_contact_id, contact_name, contact_email, subject, summary, days_since, sentiment, topics, occurred_at')
        .order('occurred_at', { ascending: false });
    if (error)
        throw new Error(`Email triage query failed: ${error.message}`);
    if (!emails?.length)
        return { total: 0, tier1: [], tier2: [], tier3: [] };
    const rows = emails;
    const contactIds = [...new Set(rows.map((e) => e.ghl_contact_id).filter(Boolean))];
    const { data: contacts } = contactIds.length > 0
        ? await supabase.from('ghl_contacts').select('ghl_id, tags').in('ghl_id', contactIds)
        : { data: [] };
    const tagMap = new Map((contacts || []).map((c) => [c.ghl_id, c.tags || []]));
    const tier1 = [];
    const tier2 = [];
    const tier3 = [];
    for (const email of rows) {
        const tags = tagMap.get(email.ghl_contact_id) || [];
        const isKeyContact = tags.some((t) => KEY_TAGS.some((k) => t.toLowerCase().includes(k)));
        const entry = {
            id: email.id,
            ghl_contact_id: email.ghl_contact_id,
            contact_name: email.contact_name,
            contact_email: email.contact_email,
            subject: email.subject,
            summary: email.summary,
            days_since: email.days_since,
            sentiment: email.sentiment,
            topics: email.topics,
            tier: isKeyContact ? 1 : (email.days_since || 0) <= 7 ? 2 : 3,
        };
        if (isKeyContact)
            tier1.push(entry);
        else if ((email.days_since || 0) <= 7)
            tier2.push(entry);
        else
            tier3.push(entry);
    }
    return {
        total: rows.length,
        tier1: tier1.slice(0, max),
        tier2: tier2.slice(0, max),
        tier3: tier3.slice(0, max),
    };
}
//# sourceMappingURL=search.js.map
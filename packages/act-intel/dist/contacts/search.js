/**
 * Contact search — find contacts by name/email/company and enrich with
 * last interaction and open pipeline value.
 *
 * Merges agent-tools (executeSearchContacts) and
 * Notion Workers (lookup_contact).
 */
export async function searchContacts(supabase, opts) {
    const { query, limit = 10 } = opts;
    const searchTerm = `%${query}%`;
    const { data, error } = await supabase
        .from('ghl_contacts')
        .select('id, ghl_id, full_name, first_name, last_name, email, phone, company_name, engagement_status, tags, projects, last_contact_date')
        .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
        .order('last_contact_date', { ascending: false })
        .limit(limit);
    if (error)
        throw new Error(`Contact search failed: ${error.message}`);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const contacts = await Promise.all((data || []).map(async (c) => {
        const ghlId = c.ghl_id;
        const contactId = c.id;
        const email = c.email;
        const fullName = c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
        const base = {
            id: contactId,
            ghl_id: ghlId,
            name: fullName,
            email,
            phone: c.phone,
            company: c.company_name,
            status: c.engagement_status,
            tags: c.tags || [],
            projects: c.projects || [],
            last_contact: c.last_contact_date,
            days_since_contact: c.last_contact_date
                ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
                : null,
            last_interaction_topic: null,
            last_interaction_date: null,
            open_pipeline_value: null,
            temperature: null,
            temperature_trend: null,
            signals: null,
            risk_flags: null,
            recent_comms_30d: null,
        };
        // Parallel enrichment: last comm, pipeline, health, recent comms count
        const [commResult, healthResult, commsCountResult, pipelineResult] = await Promise.all([
            supabase
                .from('communications_history')
                .select('subject, communication_date')
                .eq('contact_id', contactId)
                .order('communication_date', { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabase
                .from('relationship_health')
                .select('temperature, temperature_trend, email_score, calendar_score, financial_score, pipeline_score, risk_flags')
                .eq('ghl_contact_id', ghlId)
                .maybeSingle(),
            email
                ? supabase
                    .from('communications')
                    .select('id', { count: 'exact', head: true })
                    .or(`from_email.ilike.%${email}%,to_emails.cs.{${email}}`)
                    .gte('date', thirtyDaysAgo)
                : Promise.resolve({ count: null }),
            ghlId
                ? supabase
                    .from('ghl_opportunities')
                    .select('monetary_value')
                    .eq('contact_id', ghlId)
                    .eq('status', 'open')
                : Promise.resolve({ data: null }),
        ]);
        if (commResult.data) {
            const comm = commResult.data;
            base.last_interaction_topic = comm.subject;
            base.last_interaction_date = comm.communication_date;
        }
        if (healthResult.data) {
            const h = healthResult.data;
            base.temperature = h.temperature;
            base.temperature_trend = h.temperature_trend;
            base.signals = {
                email: h.email_score || 0,
                calendar: h.calendar_score || 0,
                financial: h.financial_score || 0,
                pipeline: h.pipeline_score || 0,
            };
            base.risk_flags = h.risk_flags || null;
        }
        base.recent_comms_30d = commsCountResult.count;
        const deals = pipelineResult.data || [];
        const total = deals.reduce((sum, d) => sum + (d.monetary_value || 0), 0);
        if (total > 0)
            base.open_pipeline_value = total;
        return base;
    }));
    return { query, count: contacts.length, contacts };
}
//# sourceMappingURL=search.js.map
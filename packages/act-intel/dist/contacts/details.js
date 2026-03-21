/**
 * Contact details — comprehensive contact card with health signals,
 * recent communications, pipeline, and next meeting.
 *
 * Extracted from agent-tools executeGetContactDetails.
 */
export async function fetchContactDetails(supabase, opts) {
    const { contact_id } = opts;
    // Try by UUID first, then by GHL ID
    let query = supabase.from('ghl_contacts').select('*');
    if (contact_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) {
        query = query.eq('id', contact_id);
    }
    else {
        query = query.eq('ghl_id', contact_id);
    }
    const { data: contact, error } = await query.maybeSingle();
    if (error)
        throw new Error(`Contact lookup failed: ${error.message}`);
    if (!contact)
        return null;
    const c = contact;
    const ghlId = c.ghl_id;
    const contactUuid = c.id;
    const [commsResult, healthResult, nextMeetingResult, pipelineResult] = await Promise.all([
        supabase
            .from('communications_history')
            .select('direction, channel, subject, summary, communication_date')
            .eq('contact_id', contactUuid)
            .order('communication_date', { ascending: false })
            .limit(5),
        supabase
            .from('relationship_health')
            .select('temperature, temperature_trend, last_temperature_change, lcaa_stage, risk_flags, email_score, calendar_score, financial_score, pipeline_score, knowledge_score')
            .eq('ghl_contact_id', ghlId)
            .maybeSingle(),
        supabase
            .from('calendar_events')
            .select('title, start_time, attendees')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(10),
        supabase
            .from('ghl_opportunities')
            .select('name, monetary_value, stage_name, status')
            .eq('contact_id', ghlId)
            .eq('status', 'open'),
    ]);
    const health = healthResult.data;
    const comms = (commsResult.data || []);
    const pipeline = (pipelineResult.data || []);
    // Find next meeting involving this contact
    const contactName = (c.full_name || '').toLowerCase();
    const contactEmail = (c.email || '').toLowerCase();
    const nextMeeting = (nextMeetingResult.data || []).find((e) => {
        const attendees = JSON.stringify(e.attendees || []).toLowerCase();
        const title = (e.title || '').toLowerCase();
        return (contactEmail && attendees.includes(contactEmail)) || (contactName && title.includes(contactName));
    });
    const now = new Date();
    const openPipelineValue = pipeline.reduce((sum, o) => sum + (o.monetary_value || 0), 0);
    return {
        id: contactUuid,
        ghl_id: ghlId,
        name: c.full_name || 'Unknown',
        email: c.email,
        phone: c.phone,
        company: c.company_name,
        status: c.engagement_status,
        tags: c.tags || [],
        projects: c.projects || [],
        last_contact: c.last_contact_date,
        days_since_contact: c.last_contact_date
            ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
            : null,
        relationship: health ? {
            temperature: health.temperature,
            trend: health.temperature_trend,
            last_change: health.last_temperature_change,
            lcaa_stage: health.lcaa_stage,
            risk_flags: health.risk_flags || [],
            signals: {
                email: health.email_score || 0,
                calendar: health.calendar_score || 0,
                financial: health.financial_score || 0,
                pipeline: health.pipeline_score || 0,
                knowledge: health.knowledge_score || 0,
            },
        } : null,
        open_pipeline: {
            count: pipeline.length,
            total_value: openPipelineValue,
            opportunities: pipeline.map((o) => ({
                name: o.name,
                value: o.monetary_value || null,
                stage: o.stage_name || null,
            })),
        },
        next_meeting: nextMeeting
            ? { title: nextMeeting.title, date: nextMeeting.start_time }
            : null,
        recent_communications: comms.map((cm) => ({
            direction: cm.direction,
            channel: cm.channel,
            subject: cm.subject,
            summary: cm.summary,
            date: cm.communication_date,
        })),
    };
}
//# sourceMappingURL=details.js.map
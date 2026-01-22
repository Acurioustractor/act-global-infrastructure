/**
 * Relationship Health Scoring Service
 * Calculates and tracks relationship strength with contacts
 *
 * Usage:
 *   npm run relationships:health           # Show all contacts needing attention
 *   npm run relationships:score <contactId> # Get specific contact score
 *   npm run relationships:update           # Recalculate all scores
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local for Main database credentials
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Scoring weights
const WEIGHTS = {
  recency: 0.35,        // How recently we communicated
  frequency: 0.25,      // How often we communicate
  engagement: 0.20,     // Quality of interactions (sentiment, depth)
  reciprocity: 0.20     // Balance of inbound/outbound
};

// Decay rates (days until score drops significantly)
const DECAY_RATES = {
  partner: 14,          // Partners need frequent touch
  client: 21,           // Clients need regular check-ins
  collaborator: 30,     // Collaborators can go longer
  community: 45,        // Community contacts are more flexible
  default: 30
};

/**
 * Calculate relationship health score for a contact
 */
export async function calculateContactScore(contactId) {
  // Get all communications with this contact from Main database
  const { data: comms, error } = await supabase
    .from('communications_history')
    .select('*')
    .eq('ghl_contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!comms || comms.length === 0) {
    return {
      contactId,
      score: 0,
      components: { recency: 0, frequency: 0, engagement: 0, reciprocity: 0 },
      status: 'no_history',
      recommendation: 'Initiate first contact'
    };
  }

  // Get contact type from ghl_contacts (match on ghl_id, not internal id)
  const { data: contactInfo } = await supabase
    .from('ghl_contacts')
    .select('tags, engagement_status')
    .eq('ghl_id', contactId)
    .single();

  // Map engagement_status to contact type for decay rates
  const statusToType = {
    'partner': 'partner',
    'client': 'client',
    'collaborator': 'collaborator',
    'lead': 'community',
    'prospect': 'community'
  };
  const contactType = statusToType[contactInfo?.engagement_status] || 'default';
  const decayRate = DECAY_RATES[contactType] || DECAY_RATES.default;

  // Calculate components
  const recencyScore = calculateRecencyScore(comms[0], decayRate);
  const frequencyScore = calculateFrequencyScore(comms, 90); // Last 90 days
  const engagementScore = calculateEngagementScore(comms);
  const reciprocityScore = calculateReciprocityScore(comms);

  // Weighted total
  const totalScore = Math.round(
    (recencyScore * WEIGHTS.recency +
     frequencyScore * WEIGHTS.frequency +
     engagementScore * WEIGHTS.engagement +
     reciprocityScore * WEIGHTS.reciprocity) * 100
  );

  // Determine status and recommendation
  const { status, recommendation } = getStatusAndRecommendation(
    totalScore,
    recencyScore,
    reciprocityScore,
    comms[0],
    decayRate
  );

  return {
    contactId,
    score: totalScore,
    components: {
      recency: Math.round(recencyScore * 100),
      frequency: Math.round(frequencyScore * 100),
      engagement: Math.round(engagementScore * 100),
      reciprocity: Math.round(reciprocityScore * 100)
    },
    status,
    recommendation,
    lastContact: comms[0].occurred_at,
    totalInteractions: comms.length,
    contactType
  };
}

/**
 * Calculate recency score (exponential decay)
 */
function calculateRecencyScore(lastComm, decayRate) {
  const daysSince = (Date.now() - new Date(lastComm.occurred_at).getTime()) / (1000 * 60 * 60 * 24);
  // Exponential decay: score = e^(-daysSince / decayRate)
  return Math.exp(-daysSince / decayRate);
}

/**
 * Calculate frequency score based on communication pattern
 */
function calculateFrequencyScore(comms, windowDays) {
  const windowStart = Date.now() - (windowDays * 24 * 60 * 60 * 1000);
  const recentComms = comms.filter(c => new Date(c.occurred_at).getTime() > windowStart);

  // Ideal frequency varies by relationship, but ~2-4 per month is healthy
  const commsPerMonth = (recentComms.length / windowDays) * 30;

  // Sigmoid function centered around 3 comms/month
  return 1 / (1 + Math.exp(-(commsPerMonth - 1.5)));
}

/**
 * Calculate engagement score based on interaction quality
 */
function calculateEngagementScore(comms) {
  if (comms.length === 0) return 0;

  // Average sentiment of recent interactions
  const recentComms = comms.slice(0, 10);
  // Convert text sentiment to numeric (Main uses 'positive'/'neutral'/'negative')
  const sentimentToScore = (s) => {
    if (s === 'positive') return 0.8;
    if (s === 'negative') return 0.2;
    return 0.5; // neutral or unknown
  };
  const avgSentiment = recentComms.reduce((sum, c) => sum + sentimentToScore(c.sentiment), 0) / recentComms.length;

  // Bonus for diverse communication channels (email, call, meeting, etc.)
  const channels = new Set(recentComms.map(c => c.channel));
  const diversityBonus = Math.min(channels.size / 3, 1) * 0.2;

  // Bonus for meetings (high engagement)
  const meetingRatio = recentComms.filter(c => c.channel === 'meeting' || c.channel === 'calendar').length / recentComms.length;
  const meetingBonus = meetingRatio * 0.2;

  return Math.min(avgSentiment + diversityBonus + meetingBonus, 1);
}

/**
 * Calculate reciprocity score (balance of inbound/outbound)
 */
function calculateReciprocityScore(comms) {
  if (comms.length < 2) return 0.5; // Neutral for limited data

  const inbound = comms.filter(c => c.direction === 'inbound').length;
  const outbound = comms.filter(c => c.direction === 'outbound').length;
  const total = inbound + outbound;

  if (total === 0) return 0.5;

  // Ideal is 40-60% inbound (they reach out too)
  const inboundRatio = inbound / total;

  // Score peaks at 50% and decreases towards extremes
  return 1 - Math.abs(inboundRatio - 0.5) * 2;
}

/**
 * Determine status and actionable recommendation
 */
function getStatusAndRecommendation(score, recency, reciprocity, lastComm, decayRate) {
  const daysSinceContact = (Date.now() - new Date(lastComm.occurred_at).getTime()) / (1000 * 60 * 60 * 24);

  // Critical: very low score or very overdue
  if (score < 20 || daysSinceContact > decayRate * 2) {
    return {
      status: 'critical',
      recommendation: `Urgent reconnect needed - ${Math.round(daysSinceContact)} days since last contact`
    };
  }

  // Needs attention: low score or overdue
  if (score < 40 || daysSinceContact > decayRate) {
    return {
      status: 'needs_attention',
      recommendation: `Schedule follow-up - last contact was ${Math.round(daysSinceContact)} days ago`
    };
  }

  // Imbalanced: we're doing all the reaching out
  if (reciprocity < 0.3) {
    return {
      status: 'imbalanced',
      recommendation: 'Consider different approach - relationship feels one-sided'
    };
  }

  // Healthy
  if (score >= 70) {
    return {
      status: 'healthy',
      recommendation: 'Maintain current cadence'
    };
  }

  // Good but could improve
  return {
    status: 'good',
    recommendation: 'Relationship is solid - consider deepening engagement'
  };
}

/**
 * Get all contacts needing attention
 */
export async function getContactsNeedingAttention(limit = 10) {
  // Get unique contact IDs from communications_history (Main database)
  const { data: contacts, error } = await supabase
    .from('communications_history')
    .select('ghl_contact_id')
    .not('ghl_contact_id', 'is', null)
    .order('occurred_at', { ascending: false });

  if (error) throw error;

  // Get unique contacts
  const uniqueContacts = [...new Set(contacts.map(c => c.ghl_contact_id))];

  // Calculate scores for each
  const scores = await Promise.all(
    uniqueContacts.map(async (contactId) => {
      try {
        return await calculateContactScore(contactId);
      } catch (e) {
        return null;
      }
    })
  );

  // Filter and sort by urgency
  return scores
    .filter(s => s && s.status !== 'healthy' && s.status !== 'no_history')
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

/**
 * Update all relationship scores in Supabase
 */
export async function updateAllScores() {
  // Get all unique contacts
  const { data: contacts } = await supabase
    .from('communications_history')
    .select('ghl_contact_id')
    .order('occurred_at', { ascending: false });

  const uniqueContacts = [...new Set(contacts.map(c => c.ghl_contact_id))];
  let updated = 0;

  for (const contactId of uniqueContacts) {
    try {
      const score = await calculateContactScore(contactId);

      // Update in relationship_health table
      await supabase.from('relationship_health').upsert({
        ghl_contact_id: contactId,
        temperature: score.score,
        lcaa_stage: score.status === 'healthy' ? 'commitment' :
                    score.status === 'good' ? 'advocacy' :
                    score.status === 'needs_attention' ? 'awareness' : 'curiosity',
        days_since_contact: score.lastContact ?
          Math.floor((Date.now() - new Date(score.lastContact).getTime()) / (1000 * 60 * 60 * 24)) : null,
        last_contact_at: score.lastContact,
        overall_sentiment: score.components.engagement > 70 ? 'positive' :
                          score.components.engagement > 40 ? 'neutral' : 'negative',
        temperature_trend: 'stable',
        risk_flags: score.status === 'critical' ? ['needs_urgent_attention'] : [],
        suggested_actions: [score.recommendation]
      }, {
        onConflict: 'ghl_contact_id'
      });

      updated++;
    } catch (e) {
      console.error(`Error updating ${contactId}:`, e.message);
    }
  }

  return { updated, total: uniqueContacts.length };
}

/**
 * Get contact name from ghl_contacts table (match on ghl_id)
 */
async function getContactName(contactId) {
  const { data } = await supabase
    .from('ghl_contacts')
    .select('first_name, last_name, full_name, email')
    .eq('ghl_id', contactId)
    .single();

  if (data) {
    return data.full_name || [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email || contactId;
  }
  return contactId;
}

// CLI Interface
const command = process.argv[2];

if (command === 'health' || !command) {
  console.log('\n🔍 Analyzing relationship health...\n');

  getContactsNeedingAttention(15)
    .then(async (contacts) => {
      if (contacts.length === 0) {
        console.log('✨ All relationships are healthy!');
        return;
      }

      console.log('Contacts Needing Attention:\n');
      console.log('Score | Status          | Last Contact | Recommendation');
      console.log('------|-----------------|--------------|---------------');

      for (const contact of contacts) {
        const name = await getContactName(contact.contactId);
        const lastContact = new Date(contact.lastContact).toLocaleDateString('en-AU');
        const statusEmoji = {
          critical: '🔴',
          needs_attention: '🟡',
          imbalanced: '🟠',
          good: '🟢'
        }[contact.status] || '⚪';

        console.log(
          `${String(contact.score).padStart(5)} | ${statusEmoji} ${contact.status.padEnd(14)} | ${lastContact.padEnd(12)} | ${contact.recommendation}`
        );
        console.log(`      | ${name.substring(0, 30)}`);
        console.log('------|-----------------|--------------|---------------');
      }
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

else if (command === 'score') {
  const contactId = process.argv[3];
  if (!contactId) {
    console.error('Usage: npm run relationships:score <contactId>');
    process.exit(1);
  }

  calculateContactScore(contactId)
    .then(async (score) => {
      const name = await getContactName(contactId);
      console.log(`\n📊 Relationship Health: ${name}\n`);
      console.log(`Overall Score: ${score.score}/100`);
      console.log(`Status: ${score.status}`);
      console.log(`\nComponents:`);
      console.log(`  Recency:     ${score.components.recency}%`);
      console.log(`  Frequency:   ${score.components.frequency}%`);
      console.log(`  Engagement:  ${score.components.engagement}%`);
      console.log(`  Reciprocity: ${score.components.reciprocity}%`);
      console.log(`\nLast Contact: ${new Date(score.lastContact).toLocaleDateString('en-AU')}`);
      console.log(`Total Interactions: ${score.totalInteractions}`);
      console.log(`\n💡 Recommendation: ${score.recommendation}`);
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

else if (command === 'update') {
  console.log('\n🔄 Updating all relationship scores...\n');

  updateAllScores()
    .then(result => {
      console.log(`✓ Updated ${result.updated}/${result.total} contact scores`);
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

else {
  console.log(`
Relationship Health Service

Commands:
  health              Show contacts needing attention
  score <contactId>   Get detailed score for a contact
  update              Recalculate all relationship scores

Scoring Components:
  - Recency (35%):     How recently you communicated
  - Frequency (25%):   How often you communicate
  - Engagement (20%):  Quality of interactions
  - Reciprocity (20%): Balance of who reaches out

Status Levels:
  🔴 Critical:        Urgent reconnect needed
  🟡 Needs Attention: Follow-up recommended
  🟠 Imbalanced:      One-sided communication
  🟢 Good/Healthy:    Relationship is solid
`);
}

#!/usr/bin/env node
/**
 * Seed the idea_board table with strategic ideas extracted from across the ACT ecosystem.
 * Run with: node scripts/seed-idea-board.mjs
 * Dry run:  node scripts/seed-idea-board.mjs --dry-run
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DRY_RUN = process.argv.includes('--dry-run');

// Compiled from 3 scout agents scanning plans, project knowledge, and cross-project synergies
// Deduplicated from ~106 raw ideas down to 72 unique ideas
const IDEAS = [
  // === REVENUE (16) ===
  { text: "Collect $603K in outstanding receivables immediately — Centrecorp $357K (26 days overdue), Rotary Eclub $82.5K (321 days), PICC $36K, SMART $30K, Just Reinvest $27.5K, Social Impact Hub $10.8K (378 days). This is earned revenue sitting unpaid.", category: "revenue", tags: ["finance", "xero", "collections", "receivables", "urgent"], project_code: "ACT-HQ", energy: 5 },
  { text: "R&D Tax Incentive refund: $87K-$130K cash back for FY2025-2026 eligible development spend. Deadline April 30, 2026 for advisor engagement. Requires Curious Tractor PTY setup verification and retrospective documentation of 7 R&D activities.", category: "revenue", tags: ["rd-tax", "finance", "tax", "refund", "deadline"], project_code: "ACT-HQ", energy: 5 },
  { text: "GrantScope SaaS launch: Build user accounts, multi-tenant redesign, API layer, Stripe billing. 8-10 weeks to first revenue. Target: 5-10 beta customers at $200/mo. Current state: 90% built, 14K grants, no monetization.", category: "revenue", tags: ["grantscope", "saas", "product", "grants", "mrr"], project_code: null, energy: 4 },
  { text: "Empathy Ledger first paying customer: Position PICC annual report as $50K setup + ongoing subscription. Proof case for EL commercial model. Product is 95% ready, just needs Stripe integration (4-6 weeks).", category: "revenue", tags: ["empathy-ledger", "saas", "picc", "product", "first-customer"], project_code: "ACT-EL", energy: 4 },
  { text: "Goods on Country WHSAC opportunity: 500 mattresses + 300 washers for Groote Eylandt = $1.7M potential. Follow up on relationship status and contact details.", category: "revenue", tags: ["goods", "sales", "groote", "indigenous", "whsac"], project_code: "ACT-GD", energy: 5 },
  { text: "JusticeHub as 'Australia's Recidiviz': Position for QLD Youth Justice data platform pilot ($200-500K/year). $3.9B NAJP procurement window is NOW. Government spends $1.3M/child on detention — platform ROI is 23x.", category: "revenue", tags: ["justicehub", "government", "contracts", "recidiviz", "procurement"], project_code: "ACT-JH", energy: 4 },
  { text: "Centre Corp Foundation order: 107 beds approved for Utopia Homelands ($107K). Follow up Randle Walker on delivery timeline and payment status.", category: "revenue", tags: ["goods", "sales", "centrecorp", "utopia"], project_code: "ACT-GD", energy: 4 },
  { text: "SEFA social impact loan: $500K in discussion (23 communications with Joel Bird). Contingent on PFI government co-investment for de-risking. For Goods manufacturing infrastructure.", category: "revenue", tags: ["goods", "sefa", "loan", "manufacturing"], project_code: "ACT-GD", energy: 4 },
  { text: "Apply for nonprofit software discounts: Google Workspace (free), Anthropic 75% off, GitHub free team, Canva free pro, Slack free (<250 users), OpenAI 75% off ChatGPT. Estimated savings: $15K-25K/year.", category: "revenue", tags: ["nonprofit", "discounts", "saas", "cost-savings"], project_code: "ACT-HQ", energy: 4 },
  { text: "Join Qantas Business Rewards (free until Mar 31) + NAB Qantas Business Sig card (150K bonus points). Year 1 value: ~240K points ($4,500+) from sign-up bonuses, ongoing spend, and pay.com.au SaaS routing.", category: "revenue", tags: ["finance", "loyalty", "points", "cost-savings", "deadline"], project_code: "ACT-HQ", energy: 4 },
  { text: "Finance automation SaaS: Package Xero pipeline (tagging, reconciliation, receipt processing) as $200-500/month product for small nonprofits. ACT's pipeline is 96% receipt coverage — others need this.", category: "revenue", tags: ["finance", "xero", "saas", "nonprofit"], project_code: "ACT-HQ", energy: 3 },
  { text: "Grant writing automation as a service: Productize GrantAgent for other nonprofits. 15-25% success fee model on grants won. GrantScope has the matching engine + draft automation.", category: "revenue", tags: ["grantscope", "grants", "automation", "service"], project_code: null, energy: 3 },
  { text: "Goods wholesale to Orange Sky — they operate 38 laundry vans nationally. If each van carries 5 spare mattresses for clients, that's 190 beds/year recurring revenue.", category: "revenue", tags: ["goods", "partnership", "recurring-revenue", "orange-sky"], project_code: "ACT-GD", energy: 4 },
  { text: "BCV eco-cottages revenue — 150-acre regeneration estate with accommodation. R&D residencies, artist residencies, corporate retreats. What's the nightly rate? What's annual capacity?", category: "revenue", tags: ["black-cockatoo-valley", "accommodation", "place-based"], project_code: "BCV", energy: 3 },
  { text: "The Harvest Arts & Heritage Levy play — Maleny has dedicated council arts levy. Harvest art space zone = direct council funding pathway for cultural programming + artist residencies.", category: "revenue", tags: ["harvest", "arts", "council-funding"], project_code: "ACT-HV", energy: 3 },
  { text: "June's Patch healthcare worker wellbeing — could this be funded by health orgs as 'nature prescription' program? Therapeutic landscapes + land-based healing = billable service to hospitals/clinics.", category: "revenue", tags: ["farm", "healthcare", "wellbeing"], project_code: "FARM", energy: 3 },

  // === GRANTS (3) ===
  { text: "Submit 5 grants closing this week: Ian Potter Foundation Arts ($150K, Mar 12), QLD Arts Project Fund ($150K, Mar 15), Regional Community Grants ($75K), QBE Foundation ($50K), NAB Foundation ($25K). Total potential: $425K.", category: "grant", tags: ["grants", "grantscope", "harvest", "arts", "deadline"], project_code: "ACT-HV", energy: 5 },
  { text: "The Harvest has $165K/yr operational gap from July 2026. GrantScope matched 360 grants. Submit top 3 matches by deadline.", category: "grant", tags: ["harvest", "urgent", "closing-soon", "arts"], project_code: "ACT-HV", energy: 5 },
  { text: "GrantScope for ACT projects — create org profiles for all 7 projects, run AI matching across 14K grants, build prioritized grant calendar. We built the tool, now use it.", category: "grant", tags: ["funding", "internal-tool-use", "low-hanging-fruit", "grantscope"], project_code: "ACT-HQ", energy: 5 },

  // === FOUNDATIONS (7) ===
  { text: "Goods PFI application: $640K repayable funding for containerised manufacturing facilities. Deadline March 15, 2026. Total proposal $3.2M, Year 3 revenue target $4M.", category: "foundation", tags: ["goods", "pfi", "manufacturing", "qld"], project_code: "ACT-GD", energy: 5 },
  { text: "Paul Ramsay Foundation for JusticeHub bridge funding: $100-300K/year. Position as 'Australia's Recidiviz' for justice outcomes. $1.7B youth justice spend, outcomes getting worse.", category: "foundation", tags: ["justicehub", "paul-ramsay", "justice", "philanthropy"], project_code: "ACT-JH", energy: 3 },
  { text: "Google.org AI for Good funding: $200-500K for AI/data infrastructure. JusticeHub's multi-provider LLM architecture + intervention effectiveness tracking fits perfectly.", category: "foundation", tags: ["justicehub", "google", "ai", "philanthropy"], project_code: "ACT-JH", energy: 3 },
  { text: "AWS Imagine Grant ANZ: $10K-100K+ competitive grant. 'Go Further, Faster' category for AI/ML/IoT. ACT fit: Claude bot, embeddings, intelligence platform. Applications open Sep-Nov 2026.", category: "foundation", tags: ["aws", "ai", "grant", "tech"], project_code: "ACT-HQ", energy: 3 },
  { text: "Snow Foundation ongoing relationship: $200K proposal pending Q1 2026 (Goods production facility). Sally Grimsley-Ballard is anchor partner. Already received $193K across multiple grants.", category: "foundation", tags: ["goods", "snow-foundation", "philanthropy"], project_code: "ACT-GD", energy: 4 },
  { text: "Minderoo Foundation for Goods: Scale + systems change funder. Sally recommended. Lucy Stronach contact. 20 comms documented. Large grants ($500K+) for proven models.", category: "foundation", tags: ["goods", "minderoo", "scale", "philanthropy"], project_code: "ACT-GD", energy: 3 },
  { text: "Foundation alignment agent auto-discovered 20 high-fit foundations (60-78% match): Funding Network Australia (78%), Rio Tinto Foundation (75%), UTS (75%), Amnesty Australia (70%). Pursue top 5.", category: "foundation", tags: ["ai-discovery", "alignment", "automation", "grantscope"], project_code: null, energy: 3 },

  // === PARTNERS (8) ===
  { text: "Partner with Recidiviz for JusticeHub: Learn from their 17-state US model (40% of US prison population). Explore AU partnership — they have the playbook, ACT has community-first approach.", category: "partner", tags: ["justicehub", "recidiviz", "partnership", "justice"], project_code: "ACT-JH", energy: 3 },
  { text: "SNAICC partnership for JusticeHub/EL: National authority on Aboriginal children, sector reach. JH brings outcome data + Closing the Gap dashboards. Natural institutional customer ($1-3K/mo tier).", category: "partner", tags: ["justicehub", "empathy-ledger", "snaicc", "indigenous"], project_code: "ACT-JH", energy: 3 },
  { text: "360Giving (UK) partnership for GrantScope: They built the UK model. Explore tech partnership, data sharing, or licensing. Position GrantScope as 'Australia's 360Giving'.", category: "partner", tags: ["grantscope", "360giving", "uk", "partnership"], project_code: null, energy: 3 },
  { text: "Oonchiumpa manufacturing partnership: Alice Springs facility for Goods containerised production. Kristy Bloomfield (Director), Fred Campbell (cultural lead). 2 years co-designing, warehouse options assessed.", category: "partner", tags: ["goods", "manufacturing", "oonchiumpa", "alice-springs"], project_code: "ACT-GD", energy: 4 },
  { text: "Giant Leap impact VC partnership: For ACT ecosystem scale-up. Sally (Snow Foundation) recommended. Target after revenue proof points ($500K+ ARR). Potential $500K-2M raise.", category: "partner", tags: ["investment", "impact", "giant-leap", "vc"], project_code: "ACT-HQ", energy: 2 },
  { text: "Paul Ramsay Foundation partnership — they fund EL, JH has Dusseldorp backing (Ramsay's family foundation). Position ACT as their 'innovation studio for justice + narrative sovereignty'.", category: "partner", tags: ["philanthropy", "strategic-partnership", "family-foundations"], project_code: "ACT-HQ", energy: 4 },
  { text: "Myer Foundation + Vincent Fairfax (JH bridge funding) — target $100-500K for JusticeHub as 'Australia's open justice data infrastructure'. Pitch alongside government pilot.", category: "partner", tags: ["philanthropy", "justicehub", "infrastructure"], project_code: "ACT-JH", energy: 3 },
  { text: "NJP partnership discussions proceeding — both parties see collaboration potential aligned with missions. Position JusticeHub as tech infrastructure for youth justice data.", category: "partner", tags: ["justicehub", "njp", "partnership", "justice"], project_code: "ACT-JH", energy: 3 },

  // === IDEAS (14) ===
  { text: "GrantScope + Notion bidirectional sync as sellable product: 'Grant discovery meets workflow automation.' Target nonprofits at $49-499/mo tiers. Competitive advantage: AI-powered discovery, no one else does this for AU market.", category: "idea", tags: ["grantscope", "notion", "saas", "product"], project_code: null, energy: 4 },
  { text: "Platform productization: 5 projects want the same bones (JusticeHub, EL, SMART Connect, Place Network, PICC Kiosk). Common requirements: story collection, consent management, community data sovereignty. Build once, sell multiple times.", category: "idea", tags: ["empathy-ledger", "platform", "saas", "product", "reusable-infrastructure"], project_code: "ACT-EL", energy: 5 },
  { text: "Agentic organization positioning: ACT is building what Paperclip open-sourced — but with community-sovereignty lens. 'Forkable organization' for social impact. Cultural protocols (OCAP, Elder review) are the moat.", category: "idea", tags: ["strategy", "ai", "agents", "positioning", "agentic-org"], project_code: "ACT-HQ", energy: 5 },
  { text: "Empathy Ledger four-mode platform: STORY (annual reports, impact summaries), MEMORY (RAG chatbot across all org knowledge), CAPTURE (voice notes, photos, project timelines), DIRECTION (track aspirations with evidence). 60% already exists in codebase.", category: "idea", tags: ["empathy-ledger", "product", "storytelling", "platform"], project_code: "ACT-EL", energy: 4 },
  { text: "Cross-subsidy pricing model: Institutions/corporates pay ($1K-15K/mo), communities get full platform free forever. Those with power fund those without. Already mission-aligned with ACT values.", category: "idea", tags: ["pricing", "strategy", "community", "equity"], project_code: null, energy: 4 },
  { text: "Harvest community hub model for generational wealth: Witta/Maleny property appreciation + community revenue streams (garden zone, kitchen zone, art space). Arts & Heritage Levy = direct council funding pathway.", category: "idea", tags: ["harvest", "witta", "community-hub", "revenue"], project_code: "ACT-HV", energy: 3 },
  { text: "Goods product portfolio expansion: Stretch Bed (389 deployed), Pakkimjalki Kari washer (5 deployed, 300+ requested), refrigeration (in development). Same containerised facility produces all three.", category: "idea", tags: ["goods", "product", "manufacturing", "portfolio"], project_code: "ACT-GD", energy: 3 },
  { text: "GOC telemetry data feeds EL storytelling — washing machine usage patterns become community impact narratives that tell the story of hygiene access in remote communities.", category: "idea", tags: ["cross-project", "data-to-story", "impact-narrative", "goods"], project_code: null, energy: 4 },
  { text: "JusticeHub + EL integration — justice-involved individuals tell their own stories with OCAP protections. Recidivism data meets narrative sovereignty.", category: "idea", tags: ["cross-project", "dignity", "data-sovereignty", "justicehub"], project_code: null, energy: 4 },
  { text: "The Harvest as community hub for Goods manufacturing — combine art space, kitchen zone, and workshop space. Goods beds built where community gathers.", category: "idea", tags: ["cross-project", "place-based", "manufacturing", "harvest"], project_code: null, energy: 4 },
  { text: "12-month revenue breakdown: Goods $1.18M (61%), SMART $92K, Photo Studio $84K, Farm $84K, Harvest $58K, EL $30K, JusticeHub $17K. Goods is the revenue engine — scale it.", category: "idea", tags: ["revenue", "analysis", "goods", "focus"], project_code: null, energy: 4 },
  { text: "Story infrastructure = economic sovereignty. Communities need to OWN the tech that tells their stories. EL world tour demo pitch: 'Click any voice. See dignity-centered reporting. Now imagine all your grantees reporting like this.'", category: "idea", tags: ["empathy-ledger", "sovereignty", "storytelling", "product"], project_code: "ACT-EL", energy: 5 },
  { text: "Design for obsolescence — not building to stay. ACT's north star: communities own narratives, land, economic futures. Platform should transfer power, not centralize it.", category: "idea", tags: ["philosophy", "sovereignty", "pto", "mission"], project_code: "ACT-HQ", energy: 5 },
  { text: "2026 strategy shift: narrow from 36 → 15 projects (Core 7 + Sustain 8 + Hand Over 5). Deep roots > wide reach. Focus on 5-7 partnerships: PICC, Bloomfields, Snow, OSA/SMART, Witta, TFFF, Iljiljarri.", category: "idea", tags: ["strategy", "focus", "partnerships", "2026"], project_code: "ACT-HQ", energy: 4 },

  // === TECH (10) ===
  { text: "Notion Workers as third interface: Alongside Telegram bot + Command Center. Already deployed 36 workers across 6 waves. Proves single data layer, multiple AI interfaces model works.", category: "tech", tags: ["notion", "agents", "workers", "ai"], project_code: "ACT-HQ", energy: 3 },
  { text: "Real-time integration layer: Replace 6-hour batch syncs with webhook receivers (GHL, Xero, Gmail push). Bring data freshness from hours to seconds. Architecture already scoped.", category: "tech", tags: ["integration", "realtime", "webhooks", "architecture"], project_code: "ACT-HQ", energy: 3 },
  { text: "Communications intelligence system: Auto-create GHL contacts from unknown emails, auto-link to projects via AI, replace daily digest with real-time intelligence feed.", category: "tech", tags: ["communications", "ai", "ghl", "automation"], project_code: "ACT-HQ", energy: 3 },
  { text: "Subscription intelligence layer: Detect recurring patterns in Xero, flag price increases, new vendors, missing charges. Auto-calculate nonprofit discount + annual billing opportunities. Projected savings $6-10K/year.", category: "tech", tags: ["finance", "xero", "subscriptions", "automation"], project_code: "ACT-HQ", energy: 3 },
  { text: "R&D time tracking system: Tag git commits with [RD-XX], log hours via Telegram bot, build contemporaneous record for ATO compliance. Builds FY2026+ claim groundwork while documenting FY2025 retrospectively.", category: "tech", tags: ["rd-tax", "git", "tracking", "compliance"], project_code: "ACT-HQ", energy: 3 },
  { text: "Daily priorities engine: Surface receivables to chase, grant deadlines closing this week, production pipeline status, relationship health checks. Already built — enhance with subscription renewals + R&D documentation prompts.", category: "tech", tags: ["dashboard", "priorities", "automation", "command-center"], project_code: "ACT-HQ", energy: 3 },
  { text: "Multi-provider LLM profiler as standalone tool: Gemini, DeepSeek, Kimi, Groq, Minimax, OpenAI, Perplexity, Anthropic auto-rotation on quota/rate errors. Package as cost-optimization service for other orgs.", category: "tech", tags: ["ai", "llm", "optimization", "saas"], project_code: null, energy: 2 },
  { text: "Cultural protocols as moat — OCAP-aligned, Elder review, tiered access. This is deeply differentiated and can't be easily replicated by Paperclip or other general-purpose tools.", category: "tech", tags: ["competitive-advantage", "cultural-sovereignty", "protocol"], project_code: "ACT-HQ", energy: 5 },
  { text: "Ditch Dext, enable JAX auto-reconciliation — saves $1,716/yr + reduces finance admin 80%. Bank feed + Xero Me + Gmail receipts = simpler stack. JAX auto-matches 80-90% of transactions.", category: "tech", tags: ["finance", "automation", "cost-saving", "xero"], project_code: "ACT-HQ", energy: 4 },
  { text: "Agent Command Center legibility = competitive advantage. Karpathy: 'Human orgs are not legible, CEOs can't see real-time stats.' ACT already has this. Package it for other orgs.", category: "tech", tags: ["agentic-org", "product", "legibility", "command-center"], project_code: "ACT-HQ", energy: 4 },

  // === PROJECTS (2) ===
  { text: "Farm and Harvest should be separate entities (decision confirmed). Harvest = community hub revenue model (garden/kitchen/art zones), Farm = regenerative ag + land-based healing. Different timescales.", category: "project", tags: ["structure", "harvest", "farm", "governance"], project_code: "ACT-HV", energy: 3 },
  { text: "The Harvest wealth mechanics: Witta land appreciation (median >$1M), 126 ag workers, 130 hospitality workers, 157 creative workers, $54M hinterland market economy. Regenerative farm = premium multiplier.", category: "project", tags: ["harvest", "witta", "wealth", "regenerative"], project_code: "ACT-HV", energy: 3 },

  // === QUESTIONS (12) ===
  { text: "Verify ACT Foundation/ACT Ventures control structure: If Foundation controls Ventures 50%+, Ventures only gets non-refundable R&D offset (useless without taxable income). CRITICAL for R&D Tax Incentive eligibility.", category: "question", tags: ["rd-tax", "legal", "structure", "foundation"], project_code: "ACT-HQ", energy: 5 },
  { text: "Which entity applies for PFI? A Curious Tractor Pty Ltd (trading) vs A Kind Tractor Ltd (CLG, ACNC charity). CLG ticks more boxes but financials may differ. Decision impacts eligibility and structure.", category: "question", tags: ["goods", "pfi", "legal", "structure"], project_code: "ACT-GD", energy: 4 },
  { text: "Should GrantScope have its own lightweight UI for non-Notion users? Or double down on Notion-native approach? Impacts go-to-market and customer acquisition strategy.", category: "question", tags: ["grantscope", "product", "ui", "strategy"], project_code: null, energy: 3 },
  { text: "Is '40% community share' for Goods a committed structure or aspirational? Need to clarify before using in grant applications. Consider 'community benefit model' language instead.", category: "question", tags: ["goods", "community", "governance", "grants"], project_code: "ACT-GD", energy: 3 },
  { text: "What's the actual manufacturing bottleneck for Goods? Cost to 2x production capacity from 1,500 to 3,500 units/year? Determines PFI funding allocation.", category: "question", tags: ["goods", "manufacturing", "capacity", "operations"], project_code: "ACT-GD", energy: 5 },
  { text: "WHSAC $1.7M opportunity — what's the relationship status? Who's the contact? What's needed to close? Groote Eylandt 500 mattresses + 300 washers request is largest single opportunity.", category: "question", tags: ["goods", "sales", "whsac", "groote"], project_code: "ACT-GD", energy: 5 },
  { text: "What's the consulting pipeline status? SMART Connect / Fairfax / PLACE Network work active or available? BK revenue target is $300K earned.", category: "question", tags: ["consulting", "revenue", "smart", "fairfax"], project_code: "ACT-HQ", energy: 3 },
  { text: "What's the 'forkable organization' business model? Communities fork ACT's operating system — do they pay license fees, or does ACT take equity in forks, or grant-funded deployments only?", category: "question", tags: ["business-model", "agentic-org", "strategy"], project_code: "ACT-HQ", energy: 4 },
  { text: "Should Goods pursue PFI ($640K) or focus on direct sales? PFI Stage 1 EOI deadline passed. Was it submitted? If not, is there appetite for Stage 2 or pivot to wholesale/partnerships?", category: "question", tags: ["goods", "funding", "strategy", "pfi"], project_code: "ACT-GD", energy: 4 },
  { text: "Art as revenue — ACT has 'Art' as a seed but no clear revenue model. Could artist residencies be paid (accommodation fees)? Could ACT commission + sell artworks? What's the Art business model?", category: "question", tags: ["art", "revenue", "creative-economy"], project_code: "ART", energy: 2 },
  { text: "360Giving for Australia — GrantScope is building it. But who pays for open data infrastructure? Foundations (grants transparency), consultancies (grant intelligence), or government (procurement data)?", category: "question", tags: ["grantscope", "business-model", "open-data"], project_code: null, energy: 4 },
  { text: "Ideas board as product — ACT's strategic thinking infrastructure (this board!) could be a product. 'Agentic strategic planning for community orgs.' Notion Agents + Command Center integration.", category: "question", tags: ["product", "meta", "agentic-org"], project_code: "ACT-HQ", energy: 4 },
];

async function main() {
  console.log(`Seeding ${IDEAS.length} ideas...`);
  if (DRY_RUN) {
    for (const idea of IDEAS.slice(0, 10)) {
      console.log(`  [${idea.category}] ${idea.text.slice(0, 60)}... (${idea.tags?.join(', ')}) @${idea.project_code || '-'} energy:${idea.energy}`);
    }
    console.log(`  ... and ${Math.max(0, IDEAS.length - 10)} more`);
    return;
  }

  // Insert all ideas
  const { data: inserted, error } = await supabase
    .from('idea_board')
    .insert(IDEAS.map(i => ({
      text: i.text,
      category: i.category,
      tags: i.tags || [],
      project_code: i.project_code || null,
      energy: i.energy || 0,
      status: 'open',
    })))
    .select('id, text, tags');

  if (error) {
    console.error('Insert error:', error.message);
    return;
  }

  console.log(`Inserted ${inserted.length} ideas`);

  // Auto-link ideas that share tags
  console.log('\nAuto-linking related ideas...');
  let linkCount = 0;
  for (let i = 0; i < inserted.length; i++) {
    const links = [];
    for (let j = 0; j < inserted.length; j++) {
      if (i === j) continue;
      const sharedTags = (inserted[i].tags || []).filter(t => (inserted[j].tags || []).includes(t));
      if (sharedTags.length >= 2) {
        links.push(inserted[j].id);
      }
    }
    if (links.length > 0) {
      await supabase
        .from('idea_board')
        .update({ links: links.slice(0, 5) }) // Max 5 links per idea
        .eq('id', inserted[i].id);
      linkCount += links.length;
    }
  }

  console.log(`Created ${linkCount} links between related ideas`);
  console.log('Done!');
}

main().catch(console.error);

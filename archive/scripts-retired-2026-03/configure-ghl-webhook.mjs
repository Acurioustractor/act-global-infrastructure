#!/usr/bin/env node
/**
 * GHL Webhook Configuration Guide
 *
 * Displays setup instructions for configuring the GHL webhook.
 * For Private Integration Tokens, webhooks must be configured in the GHL UI.
 *
 * Usage:
 *   node scripts/configure-ghl-webhook.mjs
 */

const WEBHOOK_URL = 'https://tednluwflfhxyucgwigh.supabase.co/functions/v1/ghl-webhook';

const EVENTS_TO_SUBSCRIBE = [
  'ContactCreate',
  'ContactUpdate',
  'ContactDelete',
  'ContactTagUpdate',
  'OpportunityCreate',
  'OpportunityUpdate',
  'OpportunityStatusUpdate',
];

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔗 GHL Webhook Configuration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('✅ Edge Function Deployed:');
console.log('   https://tednluwflfhxyucgwigh.supabase.co/functions/v1/ghl-webhook');
console.log('');
console.log('📋 Manual Setup Required:');
console.log('');
console.log('1. Open GHL Settings:');
console.log('   https://app.gohighlevel.com/settings/webhooks');
console.log('');
console.log('2. Click "Add Webhook"');
console.log('');
console.log('3. Enter this URL:');
console.log('   ' + WEBHOOK_URL);
console.log('');
console.log('4. Select these events:');
EVENTS_TO_SUBSCRIBE.forEach(e => console.log('   ☑️  ' + e));
console.log('');
console.log('5. Click Save');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('Once configured, any contact or opportunity changes in GHL will');
console.log('automatically sync to Supabase in real-time.');
console.log('');
console.log('Test with: npm run ghl:stats');
console.log('');

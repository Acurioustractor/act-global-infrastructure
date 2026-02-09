const dotenv = require('dotenv');
dotenv.config({ path: '/Users/benknight/Code/act-global-infrastructure/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Get ALL unique contacts and their payment methods
  const { data, error } = await supabase
    .from('xero_transactions')
    .select('contact_name, bank_account')
    .order('date', { ascending: false });

  if (error) { console.log('Error:', error.message); return; }

  const unique = {};
  data.forEach(t => {
    const key = t.contact_name || 'Unknown';
    if (!unique[key]) unique[key] = t.bank_account;
  });

  // Filter for subscription-like names
  const subKeywords = ['adobe', 'amazon', 'anthropic', 'apple', 'bitwarden', 'cursor', 'descript',
    'github', 'google', 'highlevel', 'gohighlevel', 'notion', 'railway', 'stripe', 'supabase',
    'vercel', 'webflow', 'xero', 'spotify', 'midjourney', 'linktree', 'docplay', 'dialpad',
    'mighty', 'firecrawl', 'belong', 'sumup', 'dext', 'linkedin', 'codeguide', 'vidzflow'];

  console.log('All unique contacts with bank accounts:');
  const entries = Object.entries(unique);

  // Show subscription matches first
  console.log('\n=== Subscription-related contacts ===');
  entries.forEach(([k, v]) => {
    const lowerK = k.toLowerCase();
    if (subKeywords.some(kw => lowerK.includes(kw))) {
      console.log('  ' + k + ' => ' + v);
    }
  });

  console.log('\n=== All contacts (sample) ===');
  entries.slice(0, 30).forEach(([k, v]) => console.log('  ' + k + ' => ' + v));
  console.log('\nTotal unique contacts:', entries.length);
})();

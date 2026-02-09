#!/usr/bin/env node
/**
 * Sync Payment Methods from Xero
 *
 * Looks up each subscription in Xero transactions to find which bank account
 * is used to pay for it, then updates the subscription's payment_method field.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Map Xero bank account names to friendly payment method names
const BANK_ACCOUNT_MAP = {
  'NAB Visa ACT #8815': 'visa_8815',
  'NJ Marchesi T/as ACT Everyday': 'bank_everyday',
  'NJ Marchesi T/as ACT Maximiser': 'bank_maximiser',
  'NM Personal': 'personal'
}

// Vendor name aliases for matching (Xero contact_name variations)
const VENDOR_ALIASES = {
  'Adobe': ['Adobe', 'ADOBE', 'Adobe Systems', 'Adobe Systems Software', 'Creative Cloud'],
  'Adobe Creative Cloud': ['Adobe', 'ADOBE', 'Adobe Systems', 'Adobe Systems Software', 'Creative Cloud'],
  'Amazon Prime': ['Amazon Prime', 'Amazon', 'AMAZON'],
  'Anthropic': ['Anthropic', 'ANTHROPIC'],
  'Apple': ['Apple', 'APPLE', 'Apple Pty'],
  'Bitwarden': ['Bitwarden', 'BITWARDEN'],
  'Descript': ['Descript', 'DESCRIPT'],
  'Dext': ['Dext', 'DEXT', 'Receipt Bank'],
  'Firecrawl': ['Firecrawl', 'FIRECRAWL'],
  'GitHub': ['GitHub', 'GITHUB', 'Github'],
  'Google': ['Google', 'GOOGLE'],
  'Google Workspace (The Harvest)': ['Google', 'Harvest'],
  'HighLevel': ['HighLevel', 'HIGHLEVEL', 'GoHighLevel'],
  'LinkedIn Premium': ['LinkedIn', 'LINKEDIN'],
  'MidJourney': ['MidJourney', 'Midjourney', 'MIDJOURNEY', 'Midjourney Inc'],
  'Notion Labs': ['Notion', 'NOTION'],
  'Railway': ['Railway', 'RAILWAY', 'Railway Corporation'],
  'Spotify': ['Spotify', 'SPOTIFY'],
  'Stripe': ['Stripe', 'STRIPE'],
  'SumUp': ['SumUp', 'SUMUP', 'Sum Up'],
  'Supabase': ['Supabase', 'SUPABASE'],
  'Vercel': ['Vercel', 'VERCEL'],
  'Webflow': ['Webflow', 'WEBFLOW'],
  'Xero': ['Xero', 'XERO'],
}

async function findPaymentMethod(vendorName) {
  // Get aliases for this vendor
  const aliases = VENDOR_ALIASES[vendorName] || [vendorName]

  // Search transactions for any alias match
  for (const alias of aliases) {
    const { data: txns, error } = await supabase
      .from('xero_transactions')
      .select('bank_account, contact_name')
      .ilike('contact_name', `%${alias}%`)
      .not('bank_account', 'is', null)
      .order('date', { ascending: false })
      .limit(1)

    if (error) {
      console.log(`  Error searching for ${alias}:`, error.message)
      continue
    }

    if (txns && txns.length > 0) {
      const bankAccount = txns[0].bank_account
      return BANK_ACCOUNT_MAP[bankAccount] || bankAccount
    }
  }

  return null
}

async function main() {
  console.log('Syncing payment methods from Xero...\n')

  // Get all active subscriptions without payment method
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, vendor_name, payment_method')
    .in('account_status', ['active', 'pending_migration'])

  if (error) {
    console.error('Error fetching subscriptions:', error.message)
    return
  }

  let updated = 0
  let notFound = []

  for (const sub of subs) {
    const paymentMethod = await findPaymentMethod(sub.vendor_name)

    if (paymentMethod) {
      // Only update if different
      if (sub.payment_method !== paymentMethod) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ payment_method: paymentMethod })
          .eq('id', sub.id)

        if (updateError) {
          console.log(`  ❌ ${sub.vendor_name}: ${updateError.message}`)
        } else {
          console.log(`  ✅ ${sub.vendor_name}: ${paymentMethod}`)
          updated++
        }
      } else {
        console.log(`  ⏭️  ${sub.vendor_name}: already set to ${paymentMethod}`)
      }
    } else {
      notFound.push(sub.vendor_name)
    }
  }

  console.log(`\n✅ Updated ${updated} subscriptions`)

  if (notFound.length > 0) {
    console.log(`\n⚠️  Could not find payment method for:`)
    notFound.forEach(v => console.log(`   - ${v}`))
  }
}

main().catch(console.error)

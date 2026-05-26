/**
 * Stripe Webhook Endpoint
 *
 * Captures payment events from Stripe for Goods on Country (ACT-GD) revenue tracking.
 *
 * Events handled:
 *   - payment_intent.succeeded → Records revenue in revenue_stream_entries
 *   - checkout.session.completed → Logs for reference (actual recording via payment_intent)
 *
 * Setup required:
 *   1. Set env vars: STRIPE_WEBHOOK_SECRET
 *   2. Apply migration: supabase/migrations/20260303_stripe_revenue_tracking.sql
 *   3. Configure webhook in Stripe Dashboard → Developers → Webhooks
 *      URL: https://command.act.place/api/webhooks/stripe
 *      Events: payment_intent.succeeded, checkout.session.completed
 *
 * Test locally:
 *   stripe listen --forward-to localhost:3001/api/webhooks/stripe
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

// Goods Sales stream ID from revenue_streams table
const GOODS_STREAM_ID = 'd487a0d3-f636-4d89-9ce0-5db598c91eec'
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)) {
    console.error('Stripe webhook: signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        const amount = (pi.amount || 0) / 100 // Stripe amounts are in cents
        const customerEmail = pi.receipt_email || pi.metadata?.email || null
        const description = pi.description || 'Stripe payment'
        const paymentDate = new Date(pi.created * 1000)
        const month = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}-01`

        // Determine stream from metadata or default to Goods Sales
        const streamId = pi.metadata?.stream_id || GOODS_STREAM_ID

        // Upsert to prevent duplicate entries from webhook retries
        const { error: insertError } = await supabase
          .from('revenue_stream_entries')
          .upsert({
            stream_id: streamId,
            month,
            amount,
            source: 'stripe',
            notes: description,
            stripe_payment_intent_id: pi.id,
            stripe_customer_id: pi.customer || null,
            customer_email: customerEmail,
            description,
            recorded_at: paymentDate.toISOString(),
          }, {
            onConflict: 'stripe_payment_intent_id',
            ignoreDuplicates: true,
          })

        if (insertError) {
          console.error('Stripe webhook: insert error:', insertError.message)
        } else {
          console.log(`Stripe: recorded $${amount} payment (${pi.id})`)
        }

        // Link to GHL contact if email known
        if (customerEmail) {
          const { data: contact } = await supabase
            .from('ghl_contacts')
            .select('ghl_id')
            .eq('email', customerEmail)
            .limit(1)
            .maybeSingle()

          if (contact) {
            await supabase
              .from('revenue_stream_entries')
              .update({ ghl_contact_id: contact.ghl_id })
              .eq('stripe_payment_intent_id', pi.id)
          }
        }
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object
        const amount = (session.amount_total || 0) / 100
        const email = session.customer_email || session.customer_details?.email
        console.log(`Stripe checkout: $${amount} from ${email || 'unknown'}`)
        break
      }

      default:
        console.log(`Stripe webhook: unhandled event ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ received: true }) // Always 200 to prevent retries
  }
}

/**
 * Verify Stripe webhook signature without the stripe npm package.
 * Implements Stripe's v1 signature scheme using Node.js crypto.
 */
function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  try {
    const parts = header.split(',')
    const timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
    const sig = parts.find(p => p.startsWith('v1='))?.slice(3)

    if (!timestamp || !sig) return false

    // Reject if timestamp is too old (5 min tolerance)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - parseInt(timestamp)) > 300) return false

    const signedPayload = `${timestamp}.${payload}`
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}

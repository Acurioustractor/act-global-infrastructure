import { NextResponse } from 'next/server'

export async function POST() {
  // Subscription discovery is handled by the script scripts/discover-subscriptions.mjs
  // This endpoint is a trigger placeholder
  return NextResponse.json({
    success: true,
    discovered: 0,
    matched: 0,
    new_subscriptions: [],
    price_changes: [],
    possibly_cancelled: [],
    message: 'Use scripts/discover-subscriptions.mjs for full discovery',
  })
}

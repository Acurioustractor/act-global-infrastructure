import { NextResponse } from 'next/server'

export async function POST() {
  // Placeholder — actual health check would ping all sites
  return NextResponse.json({ success: true, results: [] })
}

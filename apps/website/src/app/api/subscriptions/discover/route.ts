/**
 * Subscriptions Discovery
 *
 * Proxy endpoint to ACT Placemat subscription tracker
 * Triggers subscription discovery scan across Gmail, Xero, etc.
 */

import { NextRequest, NextResponse } from 'next/server';

const ACT_PLACEMAT_API_URL = process.env.ACT_PLACEMAT_API_URL || 'http://localhost:3002';
const ACT_PLACEMAT_API_KEY = process.env.ACT_PLACEMAT_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Extract query parameters and body
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'act-main';
    const rescan = searchParams.get('rescan') === 'true';

    // Build ACT Placemat API URL
    const placematUrl = `${ACT_PLACEMAT_API_URL}/api/v1/subscriptions/discover?tenantId=${tenantId}&rescan=${rescan}`;

    // Proxy request to ACT Placemat
    const response = await fetch(placematUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ACT_PLACEMAT_API_KEY && {
          'Authorization': `Bearer ${ACT_PLACEMAT_API_KEY}`
        })
      }
    });

    if (!response.ok) {
      throw new Error(`ACT Placemat API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
      meta: {
        source: 'act-placemat',
        tenantId,
        rescan,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Subscription discovery error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'DISCOVERY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to trigger subscription discovery'
      }
    }, { status: 500 });
  }
}

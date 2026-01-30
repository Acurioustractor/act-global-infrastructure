/**
 * Subscription Analytics - Summary
 *
 * Proxy endpoint to ACT Placemat subscription tracker
 * Returns overall subscription metrics and statistics
 */

import { NextRequest, NextResponse } from 'next/server';

const ACT_PLACEMAT_API_URL = process.env.ACT_PLACEMAT_API_URL || 'http://localhost:3002';
const ACT_PLACEMAT_API_KEY = process.env.ACT_PLACEMAT_API_KEY;

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'act-main';

    // Build ACT Placemat API URL
    const placematUrl = `${ACT_PLACEMAT_API_URL}/api/v1/subscriptions/analytics/summary?tenantId=${tenantId}`;

    // Proxy request to ACT Placemat
    const response = await fetch(placematUrl, {
      method: 'GET',
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
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Subscription analytics summary error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch subscription summary'
      }
    }, { status: 500 });
  }
}

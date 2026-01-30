/**
 * Subscriptions List
 *
 * Proxy endpoint to ACT Placemat subscription tracker
 * Returns paginated list of discovered subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';

const ACT_PLACEMAT_API_URL = process.env.ACT_PLACEMAT_API_URL || 'http://localhost:3002';
const ACT_PLACEMAT_API_KEY = process.env.ACT_PLACEMAT_API_KEY;

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'act-main';
    const status = searchParams.get('status') || 'active';
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';
    const sortBy = searchParams.get('sortBy') || 'confidence';

    // Build query string
    const query = new URLSearchParams({
      tenantId,
      status,
      limit,
      offset,
      sortBy
    });

    // Build ACT Placemat API URL
    const placematUrl = `${ACT_PLACEMAT_API_URL}/api/v1/subscriptions?${query}`;

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
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Subscriptions list error:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch subscriptions'
      }
    }, { status: 500 });
  }
}

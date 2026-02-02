import { NextResponse } from 'next/server'

/**
 * GET /api/connectors
 *
 * Returns status of all external integrations.
 * Checks which env vars are present to determine connection status.
 */
export async function GET() {
  const connectors = [
    {
      name: 'Supabase',
      type: 'database',
      status: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'connected' : 'disconnected',
      required: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
      missingVars: [
        ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [] : ['NEXT_PUBLIC_SUPABASE_URL']),
        ...(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY ? [] : ['SUPABASE_SERVICE_ROLE_KEY']),
      ],
    },
    {
      name: 'Xero',
      type: 'accounting',
      status: process.env.XERO_CLIENT_ID ? 'connected' : 'disconnected',
      required: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET', 'XERO_TENANT_ID'],
      missingVars: [
        ...(process.env.XERO_CLIENT_ID ? [] : ['XERO_CLIENT_ID']),
        ...(process.env.XERO_CLIENT_SECRET ? [] : ['XERO_CLIENT_SECRET']),
        ...(process.env.XERO_TENANT_ID ? [] : ['XERO_TENANT_ID']),
      ],
    },
    {
      name: 'GoHighLevel',
      type: 'crm',
      status: process.env.GHL_API_KEY ? 'connected' : 'disconnected',
      required: ['GHL_API_KEY', 'GHL_LOCATION_ID'],
      missingVars: [
        ...(process.env.GHL_API_KEY ? [] : ['GHL_API_KEY']),
        ...(process.env.GHL_LOCATION_ID ? [] : ['GHL_LOCATION_ID']),
      ],
    },
    {
      name: 'Google (Gmail + Calendar)',
      type: 'communication',
      status: process.env.GOOGLE_CLIENT_ID ? 'connected' : 'disconnected',
      required: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      missingVars: [
        ...(process.env.GOOGLE_CLIENT_ID ? [] : ['GOOGLE_CLIENT_ID']),
        ...(process.env.GOOGLE_CLIENT_SECRET ? [] : ['GOOGLE_CLIENT_SECRET']),
      ],
    },
    {
      name: 'Notion',
      type: 'knowledge',
      status: process.env.NOTION_TOKEN ? 'connected' : 'disconnected',
      required: ['NOTION_TOKEN'],
      missingVars: process.env.NOTION_TOKEN ? [] : ['NOTION_TOKEN'],
    },
    {
      name: 'Anthropic (Claude)',
      type: 'ai',
      status: process.env.ANTHROPIC_API_KEY ? 'connected' : 'disconnected',
      required: ['ANTHROPIC_API_KEY'],
      missingVars: process.env.ANTHROPIC_API_KEY ? [] : ['ANTHROPIC_API_KEY'],
    },
    {
      name: 'OpenAI',
      type: 'ai',
      status: process.env.OPENAI_API_KEY ? 'connected' : 'disconnected',
      required: ['OPENAI_API_KEY'],
      missingVars: process.env.OPENAI_API_KEY ? [] : ['OPENAI_API_KEY'],
    },
  ]

  return NextResponse.json(connectors)
}

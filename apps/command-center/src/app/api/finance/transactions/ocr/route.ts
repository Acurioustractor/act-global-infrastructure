import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { GoogleGenAI, Type } from '@google/genai'
// @ts-ignore - shared lib lives outside src
import { createXeroClient } from '../../../../../../../../scripts/lib/finance/xero-client.mjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    vendor_name: { type: Type.STRING },
    summary: { type: Type.STRING, description: 'One sentence describing what was bought, ≤120 chars.' },
    transaction_date: { type: Type.STRING },
    total_amount: { type: Type.NUMBER },
    gst_amount: { type: Type.NUMBER },
    currency: { type: Type.STRING },
    line_items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit_price: { type: Type.NUMBER },
          line_total: { type: Type.NUMBER },
        },
        required: ['description'],
      },
    },
    confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
    notes: { type: Type.STRING },
  },
  required: ['vendor_name', 'summary', 'transaction_date', 'total_amount', 'currency', 'line_items', 'confidence'],
}

const PROMPT = `You are extracting structured fields from an Australian business receipt or tax invoice.
Goals: (1) one-sentence summary of what was bought (under 120 chars), (2) every line item, (3) total/GST/date.
Convert dates to YYYY-MM-DD. Use the grand total including GST. Be specific in the summary (vendors, materials).`

function mediaType(contentType: string | null, filename: string): string {
  if (contentType && contentType !== 'application/octet-stream') return contentType
  const l = (filename || '').toLowerCase()
  if (l.endsWith('.pdf')) return 'application/pdf'
  if (l.endsWith('.png')) return 'image/png'
  if (l.endsWith('.jpg') || l.endsWith('.jpeg')) return 'image/jpeg'
  if (l.endsWith('.heic')) return 'image/heic'
  if (l.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

export async function POST(request: NextRequest) {
  try {
    const { id, source } = (await request.json()) as { id: string; source: 'bill' | 'spend' | 'spend-overpay' | 'receive' }
    if (!id || !source) return NextResponse.json({ error: 'id + source required' }, { status: 400 })

    const table = source === 'bill' ? 'xero_invoices' : 'xero_transactions'
    const xeroIdCol = source === 'bill' ? 'xero_id' : 'xero_transaction_id'
    const { data: row, error: e1 } = await supabase
      .from(table)
      .select(`id, ${xeroIdCol}, line_items, has_attachments`)
      .eq('id', id)
      .single()
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
    const xeroId = (row as any)[xeroIdCol] as string

    const xeroObject = source === 'bill' ? 'Invoices' : 'BankTransactions'
    const xero = await createXeroClient(supabase)

    // 1) List attachments
    const attList = await xero.request(`${xeroObject}/${xeroId}/Attachments`)
    const attachments = attList?.Attachments || []
    if (!attachments.length) return NextResponse.json({ error: 'no Xero attachments on this row' }, { status: 404 })
    attachments.sort((a: any, b: any) => (b.ContentLength || 0) - (a.ContentLength || 0))
    const att = attachments[0]

    // 2) Download bytes (need raw fetch via xero client request with custom Accept)
    const fileResp = await fetch(
      `https://api.xero.com/api.xro/2.0/${xeroObject}/${xeroId}/Attachments/${encodeURIComponent(att.FileName)}`,
      {
        headers: {
          Authorization: `Bearer ${xero.getAccessToken()}`,
          'xero-tenant-id': xero.getTenantId(),
          Accept: '*/*',
        },
      }
    )
    if (!fileResp.ok) return NextResponse.json({ error: `attachment download ${fileResp.status}` }, { status: 500 })
    const buf = Buffer.from(await fileResp.arrayBuffer())
    const mime = mediaType(fileResp.headers.get('content-type'), att.FileName)

    // 3) Send to Gemini
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const model = process.env.OCR_MODEL || 'gemini-2.5-flash-lite'
    const resp = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: mime, data: buf.toString('base64') } }] }],
      config: { responseMimeType: 'application/json', responseSchema: SCHEMA as any },
    })
    const text = resp.text || resp.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text) return NextResponse.json({ error: 'empty Gemini response' }, { status: 500 })
    const extracted = JSON.parse(text)

    // 4) Write _ocr blob into line_items[0]._ocr
    const li: any[] = Array.isArray(row.line_items) ? [...row.line_items] : []
    if (!li.length) li.push({ description: extracted.summary || '' })
    li[0] = {
      ...li[0],
      _ocr: {
        summary: extracted.summary,
        vendor: extracted.vendor_name,
        items: extracted.line_items,
        confidence: extracted.confidence,
        notes: extracted.notes,
        ocr_at: new Date().toISOString(),
        model,
      },
    }
    const { error: e2 } = await supabase.from(table).update({ line_items: li }).eq('id', id)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      summary: extracted.summary,
      vendor: extracted.vendor_name,
      confidence: extracted.confidence,
      line_items: extracted.line_items,
      notes: extracted.notes,
    })
  } catch (e: any) {
    console.error('OCR endpoint error', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

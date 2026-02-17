import OpenAI from 'openai'

export interface ExtractedReceipt {
  vendor: string
  amount: number
  date: string
  category?: string
}

export async function extractReceiptFromPhoto(base64Image: string, caption: string): Promise<ExtractedReceipt | null> {
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract receipt details from this image. Return ONLY valid JSON with these fields:
- vendor: string (store/company name)
- amount: number (total amount in AUD)
- date: string (YYYY-MM-DD format)
- category: string (one of: travel, supplies, food, subscription, utilities, other)

If you cannot identify receipt details, return null.${caption ? `\nUser caption: "${caption}"` : ''}`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
        ],
      },
    ],
    max_tokens: 200,
  })

  const text = response.choices[0]?.message?.content?.trim()
  if (!text || text === 'null') return null

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Modality } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    const formData = await req.formData()
    const image = formData.get('image') as File | null
    const prompt = formData.get('prompt') as string
    const style = formData.get('style') as string || 'architectural concept'

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

    const systemContext = `You are a visionary architectural and landscape designer creating concept art for ACT (A Curious Tractor), a regenerative innovation ecosystem in the Sunshine Coast hinterland, Queensland, Australia. The properties are on Jinibara Country.

Style: ${style}
Context: Two properties in Witta — The Harvest (community hub, cafe, garden centre, events space) and ACT Farm (regenerative land lab, 40 acres, studio practice base). The vision is to create a world-class destination blending art, nature, technology, and community — inspired by MONA Tasmania, Eden Project, teamLab, Inhotim Brazil, and Knepp Estate.

Design principles:
- Regenerative, not extractive — everything should enhance the land
- Site-specific art that responds to the landscape
- Multi-sensory experiences (not just visual)
- Night-time programming potential (projection mapping, light installations)
- Indigenous cultural protocols and respect for Jinibara Country
- Materials: timber, corrugated iron, recycled, natural — Australian vernacular
- Technology: IoT sensors, living dashboards, spatial computing overlays
- Must photograph beautifully for social sharing (the teamLab effect)

Generate a beautiful, photorealistic concept that brings the prompt to life.`

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []

    // Add image if provided
    if (image) {
      const bytes = await image.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      parts.push({
        inlineData: {
          mimeType: image.type || 'image/jpeg',
          data: base64,
        },
      })
      parts.push({
        text: `${systemContext}\n\nUsing this photo as the base landscape, transform it according to this vision:\n\n${prompt}`,
      })
    } else {
      parts.push({
        text: `${systemContext}\n\nCreate a concept image for:\n\n${prompt}`,
      })
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    })

    // Extract image and text from response
    const result: { image?: string; text?: string } = {}

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          result.image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        }
        if (part.text) {
          result.text = (result.text || '') + part.text
        }
      }
    }

    if (!result.image && !result.text) {
      return NextResponse.json({ error: 'No output generated', raw: JSON.stringify(response.candidates?.[0]) }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Vision generate error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Generation failed', details: message }, { status: 500 })
  }
}

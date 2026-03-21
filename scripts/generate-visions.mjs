import { GoogleGenAI, Modality } from '@google/genai'
import fs from 'fs'
import path from 'path'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDilDuv-4piaZnzqyMN__uaCdfYqZ1Dh-0'
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

const OUTPUT_DIR = path.join(process.cwd(), 'generated-images/vision')

const SYSTEM = `You are a visionary architectural and landscape designer creating concept art for ACT (A Curious Tractor), a regenerative innovation ecosystem in the Sunshine Coast hinterland, Queensland, Australia (Jinibara Country).

Design principles:
- Regenerative, not extractive — everything enhances the land
- Site-specific art that responds to the Australian subtropical landscape
- Multi-sensory experiences
- Materials: timber, corrugated iron, recycled, natural — Australian bush vernacular
- Must photograph beautifully for social sharing
- Respect the existing vegetation and topography — work WITH the land`

const VISIONS = [
  {
    image: 'farm-drone-original.jpg',
    name: 'farm-art-trail',
    prompt: `Transform this aerial farm view into a concept showing a winding art trail through the bush and open spaces. Add: a large mirrored sphere sculpture reflecting the canopy (like Anish Kapoor), a timber boardwalk threading through the dense forest area, 4-5 glamping bell tents on platforms in the cleared area near the existing buildings, a natural amphitheatre cut into the hillside with timber seating for 150 people, and solar-powered pathway lighting along the trails. Keep ALL existing vegetation. Photorealistic architectural render, golden hour lighting.`,
  },
  {
    image: 'farm-drone-original.jpg',
    name: 'farm-night-experience',
    prompt: `Reimagine this aerial farm view at NIGHT. The forest canopy is lit with subtle projection mapping — flowing patterns of light in blues and greens moving through the trees like bioluminescence. The open paddock has a large firepit circle with 30 people gathered around it, warm orange glow. Light paths (embedded LED strips in timber boardwalks) wind through the property connecting different zones. A timber pavilion near the existing buildings glows warmly from within. The sky above is full of stars — Milky Way visible. One area of the forest has a James Turrell-style light installation — a soft geometric glow emerging from within the trees. Magical, immersive, dreamlike but REAL. Photorealistic night photography style.`,
  },
  {
    image: 'farm-drone-original.jpg',
    name: 'farm-innovation-hub',
    prompt: `Add to this aerial farm view: a beautiful contemporary timber and glass workshop building (200sqm) nestled at the edge of the bush near the existing structures. It has a living green roof that blends with the landscape, large sliding glass doors opening to a timber deck overlooking the valley. Nearby, a food forest garden with raised beds, fruit trees, and a small greenhouse. A IoT sensor post (slim timber pole with small solar panel and sensors) visible in the paddock. A communal outdoor dining area with a long timber table under a shade sail between the buildings and the bush edge. Keep the property feeling wild and regenerative, not manicured. Photorealistic, soft overcast subtropical light.`,
  },
  {
    image: 'harvest-drone-original.jpg',
    name: 'harvest-community-hub',
    prompt: `Transform this aerial view of The Harvest (the building with the blue-green roof) into a thriving community hub. Add: outdoor dining area with timber tables and festoon string lights in the garden area, a market garden with raised beds and a small greenhouse on the open green lawn, a children's nature play area with timber structures. The parking area now has a covered farmers market structure (timber posts, corrugated iron roof) with colorful stalls visible. Native garden plantings line the road frontage. A chalk art wall is visible on the side of the main building. The whole scene is alive with activity — a Saturday morning market atmosphere. Warm, inviting, photorealistic. Subtropical Queensland light.`,
  },
  {
    image: 'harvest-drone-original.jpg',
    name: 'harvest-evening-event',
    prompt: `Show this property (The Harvest, building with blue-green roof) during an evening event. The garden is set up with a small outdoor stage (timber, fairy lights) for live music. 80-100 people are gathered across the property — some at outdoor dining tables, some standing with drinks, some kids running on the lawn. Festoon lights create a warm canopy overhead. The main building is glowing warmly from inside. A food truck or outdoor kitchen is set up near the parking area. Native plantings and garden beds frame the space. A banner reads "THE HARVEST — WITTA". Golden hour transitioning to evening. Photorealistic, community celebration atmosphere.`,
  },
]

async function generateVision(vision) {
  console.log(`\n🎨 Generating: ${vision.name}...`)

  const imagePath = path.join(OUTPUT_DIR, vision.image)
  const imageBuffer = fs.readFileSync(imagePath)
  const base64 = imageBuffer.toString('base64')

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64 } },
          { text: `${SYSTEM}\n\n${vision.prompt}` },
        ],
      }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    })

    let saved = false
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const ext = part.inlineData.mimeType?.includes('png') ? 'png' : 'jpg'
          const outPath = path.join(OUTPUT_DIR, `${vision.name}.${ext}`)
          fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, 'base64'))
          console.log(`  ✅ Saved: ${outPath}`)
          saved = true
        }
        if (part.text) {
          console.log(`  📝 ${part.text.slice(0, 200)}`)
        }
      }
    }

    if (!saved) {
      console.log(`  ⚠️  No image generated. Response:`, JSON.stringify(response.candidates?.[0]?.content?.parts?.map(p => p.text || '[image]')))
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`)
    if (err.message?.includes('rate')) {
      console.log('  ⏳ Rate limited, waiting 30s...')
      await new Promise(r => setTimeout(r, 30000))
      return generateVision(vision) // retry
    }
  }
}

console.log('🌿 ACT Vision Generator')
console.log(`📁 Output: ${OUTPUT_DIR}`)
console.log(`🖼️  ${VISIONS.length} visions to generate\n`)

// Generate sequentially to avoid rate limits
for (const vision of VISIONS) {
  await generateVision(vision)
  // Small delay between requests
  await new Promise(r => setTimeout(r, 2000))
}

console.log('\n✨ Done! Check generated-images/vision/')

'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Upload, Image as ImageIcon, Wand2, Download, Plus, Loader2, Mountain, Trees, Tent, Music, Lightbulb, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'

const VISION_PROMPTS = [
  {
    icon: Tent,
    label: 'Glamping Village',
    prompt: 'Add a cluster of 6 luxury glamping tents nestled among the trees with warm ambient lighting, timber decking platforms, and a central firepit gathering area. Winding gravel paths connect them through native gardens. Evening atmosphere with string lights.',
  },
  {
    icon: Palette,
    label: 'Art Trail',
    prompt: 'Create a winding art trail through the landscape with 5 large-scale site-specific sculptures — a James Turrell-style light installation built into the hillside, a mirrored sphere reflecting the bush, woven fiber art between trees, a sound sculpture that captures wind, and a kinetic metal piece that moves with breeze. Natural materials dominate.',
  },
  {
    icon: Mountain,
    label: 'Amphitheatre',
    prompt: 'Add a natural amphitheatre carved into the hillside with timber seating for 200 people, a simple stage platform with a corrugated iron and timber canopy. Native grasses on the terraced seating banks. Solar-powered LED strip lighting along the edges. A place for storytelling, music, and ceremony.',
  },
  {
    icon: Trees,
    label: 'Food Forest',
    prompt: 'Transform this into a productive food forest with layered plantings — canopy fruit trees, mid-story berry bushes, ground cover herbs and vegetables. Add a rustic timber and iron farm-to-table dining pavilion seating 40 people. A commercial kitchen garden with raised beds. Composting stations. Beehives on the perimeter.',
  },
  {
    icon: Music,
    label: 'Night Experience',
    prompt: 'Reimagine this landscape at night with projection mapping on the trees and buildings, interactive light paths that respond to foot traffic, a sound garden with speakers hidden in the landscape playing ambient compositions, firelight installations, and a stargazing platform with reclined timber seats. Magical, immersive, teamLab-inspired.',
  },
  {
    icon: Lightbulb,
    label: 'Innovation Hub',
    prompt: 'Add a contemporary timber and glass innovation workshop building — open-plan maker space with large sliding doors opening to the landscape. Solar panels on the roof, living green wall, outdoor collaboration decks. A digital display showing real-time IoT data from the farm (soil health, biodiversity counts, weather). Workshop tables, whiteboards, 3D printers visible through glass.',
  },
]

const STYLES = [
  'Photorealistic architectural render',
  'Watercolor concept sketch',
  'Aerial masterplan view',
  'Warm evening photography',
  'Misty morning atmosphere',
  'Drone perspective',
]

export default function VisionBuilderPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState(STYLES[0])
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<Array<{ image?: string; text?: string; prompt: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const generate = useCallback(async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt
    if (!finalPrompt) return

    setGenerating(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('prompt', finalPrompt)
      formData.append('style', style)
      if (uploadedFile) {
        formData.append('image', uploadedFile)
      }

      const res = await fetch('/api/vision/generate', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error + (data.details ? ': ' + data.details : ''))
      }

      setResults(prev => [{ ...data, prompt: finalPrompt }, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [prompt, style, uploadedFile])

  const downloadImage = useCallback((dataUrl: string, index: number) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `act-vision-${index + 1}.png`
    link.click()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-emerald-950/30">
      {/* Header */}
      <header className="p-4 md:px-8 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white/80 transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-400" />
            Vision Builder
          </h1>
          <span className="text-xs text-white/30 ml-2">
            The Harvest + ACT Farm — Dream it, see it, build it
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Top Section: Upload + Prompt */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Image Upload */}
          <div className="lg:col-span-1">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden',
                'hover:border-emerald-400/50 hover:bg-emerald-400/5',
                uploadedImage ? 'border-emerald-400/30 h-64' : 'border-white/20 h-64 flex items-center justify-center',
              )}
            >
              {uploadedImage ? (
                <>
                  <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Change photo</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <Upload className="h-10 w-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 text-sm font-medium">Drop a drone shot here</p>
                  <p className="text-white/30 text-xs mt-1">or click to upload — JPG, PNG</p>
                  <p className="text-emerald-400/50 text-xs mt-3">Optional: generate from scratch without a photo</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Prompt + Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Your Vision</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to see... e.g. 'A timber pavilion overlooking the valley with hanging art installations and native gardens...'"
                className="w-full h-28 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/20 text-sm resize-none focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
              />
            </div>

            {/* Style Selector */}
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs transition-all',
                    style === s
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/5 text-white/40 border border-white/10 hover:border-white/20',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Generate Button */}
            <button
              onClick={() => generate()}
              disabled={generating || !prompt}
              className={cn(
                'w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
                generating
                  ? 'bg-emerald-500/20 text-emerald-300 cursor-wait'
                  : prompt
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-white/5 text-white/20 cursor-not-allowed',
              )}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dreaming...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Vision
                </>
              )}
            </button>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Quick Vision Buttons */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Quick Visions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {VISION_PROMPTS.map((v) => (
              <button
                key={v.label}
                onClick={() => {
                  setPrompt(v.prompt)
                  generate(v.prompt)
                }}
                disabled={generating}
                className={cn(
                  'p-4 rounded-xl border transition-all text-left group',
                  'bg-white/[0.02] border-white/10 hover:border-emerald-400/30 hover:bg-emerald-400/5',
                  generating && 'opacity-50 cursor-not-allowed',
                )}
              >
                <v.icon className="h-6 w-6 text-emerald-400/60 group-hover:text-emerald-400 transition mb-2" />
                <span className="text-white/70 text-xs font-medium">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Gallery */}
        {results.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Generated Visions ({results.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((r, i) => (
                <div key={i} className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] group">
                  {r.image && (
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img src={r.image} alt={r.prompt} className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button
                          onClick={() => downloadImage(r.image!, i)}
                          className="p-2 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setPrompt(r.prompt + ' — iterate further: ')
                          }}
                          className="p-2 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-white/50 text-xs leading-relaxed">{r.prompt}</p>
                    {r.text && (
                      <p className="text-emerald-300/70 text-xs mt-2 italic">{r.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && !generating && (
          <div className="text-center py-16">
            <Mountain className="h-16 w-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-lg">Upload a drone shot and dream big</p>
            <p className="text-white/15 text-sm mt-2">
              Or hit a Quick Vision to generate from scratch
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

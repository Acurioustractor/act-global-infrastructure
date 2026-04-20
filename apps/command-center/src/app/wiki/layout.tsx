import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tractorpedia',
  description: 'The living knowledge base for A Curious Tractor',
  manifest: '/tractorpedia-manifest.json',
}

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return children
}

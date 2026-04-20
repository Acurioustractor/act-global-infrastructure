import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import '@/styles/globals.css'
import { TopNav } from '@/components/top-nav'
import { Sidebar } from '@/components/sidebar/sidebar'
import { SidebarProvider } from '@/components/sidebar/sidebar-context'
import { Providers } from '@/components/providers'
import { ErrorBoundary } from '@/components/error-boundary'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const WIKI_HOST = 'wiki.act.place'

export const metadata: Metadata = {
  title: 'ACT Command Center',
  description: 'Orchestrating regenerative futures through technology',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0f1a',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const host = (await headers()).get('host') ?? ''
  const isWikiHost = host === WIKI_HOST || host.startsWith(`${WIKI_HOST}:`)

  // wiki.act.place is the public wiki-only face — skip the app chrome
  // (TopNav + Sidebar). The /wiki page renders its own internal nav.
  if (isWikiHost) {
    return (
      <html lang="en" className="dark">
        <body className={`${inter.variable} font-sans antialiased`}>
          <Providers>
            <ErrorBoundary>{children}</ErrorBoundary>
          </Providers>
        </body>
      </html>
    )
  }

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <SidebarProvider>
            <TopNav />
            <div className="flex">
              <Sidebar />
              <main className="flex-1 min-h-[calc(100vh-3.5rem)] overflow-x-hidden">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  )
}

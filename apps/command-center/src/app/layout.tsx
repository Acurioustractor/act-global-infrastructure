import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { TopNav } from '@/components/top-nav'
import { Sidebar } from '@/components/sidebar/sidebar'
import { SidebarProvider } from '@/components/sidebar/sidebar-context'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <SidebarProvider>
            <TopNav />
            <div className="flex">
              <Sidebar />
              <main className="flex-1 min-h-[calc(100vh-3.5rem)] overflow-x-hidden">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { ChutkuPet } from '@/components/chutku/ChutkuPet'

export const metadata: Metadata = {
  title: 'ResolveAI — Autonomous Customer Resolution Agent',
  description:
    'ResolveAI is an autonomous customer resolution agent that investigates, acts, adapts, and verifies — pure evidence, zero hallucination.',
  keywords: ['customer support', 'agentic AI', 'autonomous resolution', 'operations'],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          {children}
          <ChutkuPet />
        </Providers>
      </body>
    </html>
  )
}

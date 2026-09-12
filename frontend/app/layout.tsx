import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ResolveAI — Autonomous Customer Resolution',
  description:
    'ResolveAI is an autonomous customer resolution agent that investigates, acts, adapts, and verifies — not a chatbot.',
  keywords: ['customer support', 'agentic AI', 'autonomous resolution', 'operations'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}

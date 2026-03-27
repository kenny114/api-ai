import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LeadAPI — Automated Outreach at Scale',
  description:
    'Find leads, generate personalized messages, and send them — all via a simple REST API.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

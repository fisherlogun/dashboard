import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SessionProvider } from '@/components/session-provider'
import { Toaster } from 'sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _jetbrains = JetBrains_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: 'NEXUS // Control Center',
  description: 'Advanced Roblox game server command and control. Real-time telemetry, player management, and remote operations.',
}

export const viewport: Viewport = {
  themeColor: '#0a0e17',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '0px',
              border: '1px solid #1e293b',
              background: '#0f1420',
              color: '#c8d6e5',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}

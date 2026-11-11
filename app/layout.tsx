import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import { SessionProvider } from '@/components/session-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

const _jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })

export const metadata: Metadata = {
  title: "Scuba Ops — Scuba Simulator Owner Console",
  description: "A private, game-themed operations console for Scuba Simulator live events, players, and announcements.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#101216",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${_jetbrains.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" storageKey="scuba-theme">
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
            borderRadius: '3px',
            border: '1px solid rgba(158, 134, 96, .5)',
              background: 'var(--card)',
              color: 'var(--card-foreground)',
            },
          }}
        />
      </body>
    </html>
  )
}

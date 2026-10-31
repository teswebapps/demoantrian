import type { Metadata, Viewport } from 'next'
import './globals.css' // sesuaikan jika file css utama Anda berbeda namanya

export const metadata: Metadata = {
  title: 'UFO Malang Kebonsari - Sistem Antrian',
  description: 'Aplikasi Manajemen Antrian Promotor',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-ufo.png',
    apple: '/logo-ufo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'UFO Antrian',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09090b',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo-ufo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
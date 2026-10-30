import React from "react"
import type { Metadata } from 'next'
import { Instrument_Sans, Poppins, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: '--font-instrument'
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: '--font-poppins'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-jetbrains'
});

export const metadata: Metadata = {
  title: 'CHAPNET — Envoyez. Touchez. Rassurez.',
  description: 'Chapnet est la plateforme professionnelle pour envoyer des campagnes WhatsApp, Email et SMS depuis un seul endroit. Créez, prévisualisez et distribuez à des milliers de destinataires.',
  generator: 'v0.app',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${instrumentSans.variable} ${poppins.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-right" richColors closeButton theme="light" />
        <Analytics />
      </body>
    </html>
  )
}

import React from "react"
import type { Metadata } from 'next'
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const instrumentSans = Instrument_Sans({ 
  subsets: ["latin"],
  variable: '--font-instrument'
});

const instrumentSerif = Instrument_Serif({ 
  subsets: ["latin"],
  weight: "400",
  variable: '--font-instrument-serif'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains'
});

export const metadata: Metadata = {
  title: 'KINEET — Communiquez avec des milliers de personnes depuis une seule plateforme',
  description: 'Kineet est la plateforme professionnelle pour envoyer des campagnes WhatsApp, Email et SMS depuis un seul endroit. Créez, prévisualisez et distribuez à des milliers de destinataires.',
  generator: 'v0.app',
  icons: {
    icon: '/icone.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-right" richColors closeButton theme="dark" />
        <Analytics />
      </body>
    </html>
  )
}

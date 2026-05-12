import type { Metadata } from 'next'
import { Poppins, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Reading List Vote',
  description: 'Team reading list voting — propose, vote, decide.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-canvas text-zinc-950 antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast: 'rounded-[2rem] font-sans text-sm font-semibold px-5 py-4 shadow-hero border-0',
              success: 'bg-lime-50 text-lime-900 ring-1 ring-lime-200',
              error: 'bg-red-50 text-red-900 ring-1 ring-red-200',
              info: 'bg-white text-zinc-950 ring-1 ring-zinc-200',
            },
          }}
        />
      </body>
    </html>
  )
}

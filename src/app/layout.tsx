import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { PerformanceProvider } from '@/components/PerformanceProvider'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Dominate Local Leads AI',
  description: 'Lead management system for roofing businesses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        <PerformanceProvider>
          {children}
        </PerformanceProvider>
      </body>
    </html>
  )
}
import type { Metadata } from 'next'
import { PerformanceProvider } from '@/components/PerformanceProvider'
import './globals.css'

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
    <html lang="en">
      <body>
        <PerformanceProvider>
          {children}
        </PerformanceProvider>
      </body>
    </html>
  )
}
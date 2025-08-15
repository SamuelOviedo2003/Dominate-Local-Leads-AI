import { ReactNode } from 'react'
import DashboardLayoutComponent from '@/components/DashboardLayout'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardLayoutComponent>
      {children}
    </DashboardLayoutComponent>
  )
}
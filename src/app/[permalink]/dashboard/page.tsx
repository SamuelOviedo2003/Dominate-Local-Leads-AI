import { DashboardClientOptimized } from '@/components/DashboardClientOptimized'

export const dynamic = 'force-dynamic'

interface PermalinkDashboardPageProps {
  params: { permalink: string }
}

/**
 * Optimized permalink-based dashboard page
 * Uses cached authentication data from AuthDataProvider
 * Eliminates redundant getAuthenticatedUserFromRequest() call
 */
export default function PermalinkDashboardPage({
  params
}: PermalinkDashboardPageProps) {
  console.log('[DASHBOARD_PAGE_OPTIMIZED] Rendering dashboard with cached auth data')

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout

  return <DashboardClientOptimized />
}
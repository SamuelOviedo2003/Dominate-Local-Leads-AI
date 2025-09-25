import { ActionsClientOptimized } from '@/components/ActionsClientOptimized'

export const dynamic = 'force-dynamic'

interface ActionsPageProps {
  params: {
    permalink: string
    leadId: string
  }
}

/**
 * Optimized Actions page that uses cached authentication data from AuthDataProvider
 * Eliminates redundant getAuthenticatedUserFromRequest() call
 */
export default function ActionsPage({ params }: ActionsPageProps) {
  console.log('[ACTIONS_PAGE_OPTIMIZED] Rendering actions page with cached auth data')

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout

  return <ActionsClientOptimized />
}
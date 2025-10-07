import { IncomingCallsClientOptimized } from '@/components/IncomingCallsClientOptimized'

export const dynamic = 'force-dynamic'

interface PermalinkIncomingCallsPageProps {
  params: { permalink: string }
}

/**
 * Optimized permalink-based incoming calls page
 * Uses cached authentication data from AuthDataProvider
 * Eliminates redundant getAuthenticatedUserFromRequest() call
 */
export default function PermalinkIncomingCallsPage({
  params
}: PermalinkIncomingCallsPageProps) {
  console.log('[INCOMING_CALLS_PAGE_OPTIMIZED] Rendering incoming calls with cached auth data')

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout

  return <IncomingCallsClientOptimized />
}
import { NewLeadsClientOptimized } from '@/components/NewLeadsClientOptimized'

export const dynamic = 'force-dynamic'

interface PermalinkNewLeadsPageProps {
  params: { permalink: string }
}

/**
 * Optimized permalink-based new leads page
 * Uses cached authentication data from AuthDataProvider
 * Eliminates redundant getAuthenticatedUserFromRequest() call
 */
export default function PermalinkNewLeadsPage({
  params
}: PermalinkNewLeadsPageProps) {
  console.log('[NEW_LEADS_PAGE_OPTIMIZED] Rendering new leads with cached auth data')

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout

  return <NewLeadsClientOptimized />
}
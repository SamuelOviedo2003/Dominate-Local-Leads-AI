import { FollowUpClient } from '@/components/FollowUpClient'

export const dynamic = 'force-dynamic'

interface PermalinkFollowUpPageProps {
  params: { permalink: string }
}

/**
 * Optimized permalink-based follow-up page
 * Uses cached authentication data from AuthDataProvider
 * Eliminates redundant getAuthenticatedUserFromRequest() call
 */
export default function PermalinkFollowUpPage({
  params
}: PermalinkFollowUpPageProps) {
  console.log('[FOLLOW_UP_PAGE_OPTIMIZED] Rendering follow-up with cached auth data')

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout

  return <FollowUpClient />
}

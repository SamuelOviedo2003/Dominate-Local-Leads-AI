import { WaitingToCallClient } from '@/components/WaitingToCallClient'

export const dynamic = 'force-dynamic'

interface WaitingToCallPageProps {
  params: { permalink: string; business_id: string }
}

/**
 * Waiting to Call page - displays leads marked for calling
 * Shows leads across all businesses the user has access to
 * Uses permission-based filtering (super admin or profile_businesses)
 */
export default function WaitingToCallPage({
  params
}: WaitingToCallPageProps) {
  console.log('[WAITING_TO_CALL_PAGE] Rendering waiting to call section')

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout
  // Permission filtering happens at API level in /api/leads/waiting-to-call

  return <WaitingToCallClient />
}

import { WaitingToCallClient } from '@/components/WaitingToCallClient'

export const dynamic = 'force-dynamic'

interface WaitingToCallPageProps {
  params: { permalink: string; business_id: string }
}

/**
 * Speed to Lead page - displays highest priority leads
 * Shows stage 1 leads across all businesses the user has access to
 * Uses permission-based filtering (super admin or profile_businesses)
 */
export default function WaitingToCallPage({
  params
}: WaitingToCallPageProps) {
  console.log('[SPEED_TO_LEAD_PAGE] Rendering speed to lead section')

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout
  // Permission filtering happens at API level in /api/leads/waiting-to-call

  return <WaitingToCallClient />
}

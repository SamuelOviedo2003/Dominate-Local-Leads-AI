import { WaitingToCallDetailsClient } from '@/components/WaitingToCallDetailsClient'

export const dynamic = 'force-dynamic'

interface WaitingToCallDetailsPageProps {
  params: {
    permalink: string
    leadId: string
  }
}

/**
 * Waiting to Call Lead Details page that includes the "Call Next Lead" button
 * This is a specialized version of the lead-details page for leads from the waiting-to-call section
 */
export default function WaitingToCallDetailsPage({ params }: WaitingToCallDetailsPageProps) {
  console.log('[WAITING_TO_CALL_DETAILS_PAGE] Rendering waiting to call lead details page')

  return <WaitingToCallDetailsClient />
}

import { LeadDetailsClientOptimized } from '@/components/LeadDetailsClientOptimized'

export const dynamic = 'force-dynamic'

interface LeadDetailsPageProps {
  params: {
    permalink: string
    leadId: string
  }
}

/**
 * Optimized Lead Details page that uses cached authentication data from AuthDataProvider
 * Eliminates redundant getAuthenticatedUserFromRequest() call
 */
export default function LeadDetailsPage({ params }: LeadDetailsPageProps) {
  console.log('[LEAD_DETAILS_PAGE_OPTIMIZED] Rendering lead details page with cached auth data')

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout

  return <LeadDetailsClientOptimized />
}
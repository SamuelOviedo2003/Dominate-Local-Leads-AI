import { PropertyDetailsClientOptimized } from '@/components/PropertyDetailsClientOptimized'

export const dynamic = 'force-dynamic'

interface PropertyDetailsPageProps {
  params: {
    permalink: string
    leadId: string
  }
}

/**
 * Optimized Property Details page that uses cached authentication data from AuthDataProvider
 * Eliminates redundant getAuthenticatedUserFromRequest() call
 */
export default function PropertyDetailsPage({ params }: PropertyDetailsPageProps) {
  console.log('[PROPERTY_DETAILS_PAGE_OPTIMIZED] Rendering property details page with cached auth data')

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout

  return <PropertyDetailsClientOptimized />
}
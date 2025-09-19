import { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
import { redirect } from 'next/navigation'
import PropertyDetailsPageOptimized from './client-optimized'

export const dynamic = 'force-dynamic'

interface PropertyDetailsPageProps {
  params: {
    permalink: string
    leadId: string
  }
}

/**
 * Optimized Property Details page that provides unified loading experience
 * Eliminates the two-step loading pattern by using consolidated data fetching
 */
export default async function PropertyDetailsPage({ params }: PropertyDetailsPageProps) {
  // Check authentication
  const user = await getAuthenticatedUserFromRequest()

  if (!user) {
    redirect('/login')
  }

  // Check if user has access to any businesses
  if (!user.accessibleBusinesses || user.accessibleBusinesses.length === 0) {
    redirect(`/${params.permalink}/dashboard`)
  }

  // Render the optimized client component
  return <PropertyDetailsPageOptimized />
}
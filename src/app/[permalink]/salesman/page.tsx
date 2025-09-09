import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { SalesmanClient } from '@/app/(dashboard)/salesman/client'

export const dynamic = 'force-dynamic'

interface PermalinkSalesmanPageProps {
  params: { permalink: string }
}

/**
 * Permalink-based salesman (bookings) page that handles /{permalink}/salesman routes
 * This leverages the business context established by the permalink layout
 * and reuses the existing SalesmanClient component
 */
export default async function PermalinkSalesmanPage({ 
  params 
}: PermalinkSalesmanPageProps) {
  // Get authenticated user on server side
  const user = await getAuthenticatedUser()
  
  // Check if user has access to any businesses using the new profile_businesses system
  if (!user.accessibleBusinesses || user.accessibleBusinesses.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-red-600">No business access assigned. Please contact support.</div>
          </div>
        </div>
      </div>
    )
  }

  // The permalink layout has already validated:
  // 1. User authentication
  // 2. Business exists in database 
  // 3. User has access to this business
  // 4. Business context is provided via data attributes
  
  // The SalesmanClient will use the BusinessContext which should be set up
  // to use the business from the permalink route
  // For now, we'll pass the first accessible business ID as fallback
  const businessId = user.accessibleBusinesses[0]!.business_id

  return (
    <SalesmanClient 
      businessId={businessId} 
      userRole={user.profile?.role}
    />
  )
}
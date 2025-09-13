import { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
import { IncomingCallsClient } from './client'

export const dynamic = 'force-dynamic'

export default async function IncomingCallsPage() {
  // Get authenticated user on server side using cookie-based auth
  const user = await getAuthenticatedUserFromRequest()
  
  // Check if user exists and has access to any businesses
  if (!user || !user.accessibleBusinesses || user.accessibleBusinesses.length === 0) {
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

  // Use the first accessible business (for regular users this will be their assigned business)
  // TypeScript assertion is safe here because we've already checked length > 0
  const businessId = user.accessibleBusinesses[0]!.business_id

  return (
    <IncomingCallsClient 
      businessId={businessId}
      userRole={user.profile?.role}
    />
  )
}
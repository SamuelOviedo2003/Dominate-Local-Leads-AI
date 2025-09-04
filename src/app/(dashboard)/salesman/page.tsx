import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { SalesmanClient } from './client'

export const dynamic = 'force-dynamic'

export default async function SalesmanPage() {
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

  // Use the first accessible business (for regular users this will be their assigned business)
  // TypeScript assertion is safe here because we've already checked length > 0
  const businessId = user.accessibleBusinesses[0]!.business_id

  return (
    <SalesmanClient 
      businessId={businessId} 
      userRole={user.profile?.role}
    />
  )
}
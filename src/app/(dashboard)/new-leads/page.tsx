import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { NewLeadsClient } from './client'

export const dynamic = 'force-dynamic'

export default async function NewLeadsPage() {
  // Get authenticated user on server side
  const user = await getAuthenticatedUser()
  
  if (!user.profile?.business_id) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-red-600">Error: No business associated with your account. Please contact support.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <NewLeadsClient 
      businessId={user.profile.business_id.toString()} 
      userRole={user.profile.role}
    />
  )
}
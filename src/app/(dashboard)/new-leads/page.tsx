import { getHeaderData } from '@/lib/auth-helpers'
import UniversalHeader from '@/components/UniversalHeader'
import { logout } from '@/app/home/actions'
import { NewLeadsClient } from './client'

export default async function NewLeadsPage() {
  // Get authenticated user and header data on server side
  const { user, availableBusinesses } = await getHeaderData()
  
  if (!user.profile?.business_id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UniversalHeader 
          user={user} 
          logoutAction={logout}
          availableBusinesses={availableBusinesses}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <div className="text-red-600">Error: No business associated with your account. Please contact support.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UniversalHeader 
        user={user} 
        logoutAction={logout}
        availableBusinesses={availableBusinesses}
      />
      <NewLeadsClient businessId={user.profile.business_id} />
    </div>
  )
}
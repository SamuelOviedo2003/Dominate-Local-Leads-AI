import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { DashboardClient } from './client'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // Get authenticated user on server side
  const user = await getAuthenticatedUser()
  
  console.log('Dashboard page - User data:', {
    userId: user.id,
    email: user.email,
    role: user.profile?.role,
    accessibleBusinessesCount: user.accessibleBusinesses?.length || 0,
    accessibleBusinesses: user.accessibleBusinesses
  })
  
  // Check if user has access to any businesses using the new profile_businesses system
  if (!user.accessibleBusinesses || user.accessibleBusinesses.length === 0) {
    console.warn(`User ${user.email} has no accessible businesses - showing error message`)
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-red-600">
              No businesses accessible with your account. Please contact support.
            </div>
          </div>
        </div>
      </div>
    )
  }

  console.log(`User ${user.email} has access to ${user.accessibleBusinesses.length} businesses - loading dashboard`)

  return (
    <DashboardClient 
      userRole={user.profile?.role ?? undefined}
      accessibleBusinesses={user.accessibleBusinesses}
    />
  )
}
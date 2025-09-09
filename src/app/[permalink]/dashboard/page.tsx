import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { DashboardClient } from '@/app/(dashboard)/dashboard/client'

export const dynamic = 'force-dynamic'

interface PermalinkDashboardPageProps {
  params: { permalink: string }
}

/**
 * Permalink-based dashboard page that handles /{permalink}/dashboard routes
 * This leverages the business context established by the permalink layout
 * and reuses the existing DashboardClient component
 */
export default async function PermalinkDashboardPage({ 
  params 
}: PermalinkDashboardPageProps) {
  // Get authenticated user on server side
  const user = await getAuthenticatedUser()
  
  // Check if user has access to any businesses using the new profile_businesses system
  if (!user.accessibleBusinesses || user.accessibleBusinesses.length === 0) {
    // User has no accessible businesses - showing error message
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

  // The permalink layout has already validated:
  // 1. User authentication
  // 2. Business exists in database 
  // 3. User has access to this business
  // 4. Business context is provided via data attributes
  
  // The DashboardClient will use the BusinessContext which should be set up
  // to use the business from the permalink route
  return (
    <DashboardClient 
      userRole={user.profile?.role ?? undefined}
      accessibleBusinesses={user.accessibleBusinesses}
    />
  )
}
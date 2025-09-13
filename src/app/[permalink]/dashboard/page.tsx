import { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
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

  // The permalink layout has already validated:
  // 1. User authentication
  // 2. Business exists in database
  // 3. User has access to this business
  // 4. Business context is provided via BusinessContextProvider in the layout

  // The DashboardClient will use the BusinessContext from the layout
  return (
    <DashboardClient
      userRole={user.profile?.role ?? undefined}
      accessibleBusinesses={user.accessibleBusinesses}
    />
  )
}
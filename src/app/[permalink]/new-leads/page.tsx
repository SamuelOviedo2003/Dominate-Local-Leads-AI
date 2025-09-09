import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { NewLeadsClient } from '@/app/(dashboard)/new-leads/client'

export const dynamic = 'force-dynamic'

interface PermalinkNewLeadsPageProps {
  params: { permalink: string }
}

/**
 * Permalink-based new leads page that handles /{permalink}/new-leads routes
 * This leverages the business context established by the permalink layout
 * and reuses the existing NewLeadsClient component
 */
export default async function PermalinkNewLeadsPage({ 
  params 
}: PermalinkNewLeadsPageProps) {
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
  // 4. Business context is provided via BusinessContextProvider in the layout
  
  // The NewLeadsClient will use the BusinessContext from the layout
  return (
    <NewLeadsClient 
      userRole={user.profile?.role}
    />
  )
}
'use client'

import { useAuthData } from '@/contexts/AuthDataContext'
import { NewLeadsClient } from '@/app/(dashboard)/new-leads/client'

/**
 * Optimized wrapper for NewLeadsClient that uses cached authentication data
 * Eliminates the need to pass auth props - gets data from AuthDataProvider
 */
export function NewLeadsClientOptimized() {
  const { user } = useAuthData()

  console.log('[NEW_LEADS_CLIENT_OPTIMIZED] Using cached auth data from context')

  // Validate user data (should always be available due to parent layout validation)
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

  // Pass cached data to the original NewLeadsClient
  return (
    <NewLeadsClient
      userRole={user.profile?.role ?? undefined}
    />
  )
}
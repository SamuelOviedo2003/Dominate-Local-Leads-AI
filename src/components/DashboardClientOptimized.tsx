'use client'

import { useAuthData } from '@/contexts/AuthDataContext'
import { DashboardClient } from '@/app/(dashboard)/dashboard/client'

/**
 * Optimized wrapper for DashboardClient that uses cached authentication data
 * Eliminates the need to pass auth props - gets data from AuthDataProvider
 */
export function DashboardClientOptimized() {
  const { user } = useAuthData()

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

  // Pass cached data to the original DashboardClient
  return (
    <DashboardClient
      userRole={user.profile?.role ?? undefined}
      accessibleBusinesses={user.accessibleBusinesses}
    />
  )
}
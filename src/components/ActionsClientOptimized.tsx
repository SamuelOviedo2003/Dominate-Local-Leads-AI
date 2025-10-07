'use client'

import { useAuthData } from '@/contexts/AuthDataContext'
import ActionsPageOptimized from '@/app/[business_id]/[permalink]/actions/[leadId]/client-optimized'

/**
 * Optimized wrapper for ActionsPageOptimized that uses cached authentication data
 * Eliminates the need to pass auth props - gets data from AuthDataProvider
 */
export function ActionsClientOptimized() {
  const { user } = useAuthData()

  console.log('[ACTIONS_CLIENT_OPTIMIZED] Using cached auth data from context')

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

  // Pass cached data to the original ActionsPageOptimized
  // Use first accessible business as fallback (BusinessContext will override with current business)
  return <ActionsPageOptimized />
}
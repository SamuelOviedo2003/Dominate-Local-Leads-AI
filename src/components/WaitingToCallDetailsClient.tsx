'use client'

import { useAuthData } from '@/contexts/AuthDataContext'
import WaitingToCallDetailsPageOptimized from '@/app/[business_id]/[permalink]/waiting-to-call-details/[leadId]/client-optimized'

/**
 * Wrapper for WaitingToCallDetailsPageOptimized that uses cached authentication data
 * This is the version with the "Call Next Lead" button
 */
export function WaitingToCallDetailsClient() {
  const { user } = useAuthData()

  console.log('[WAITING_TO_CALL_DETAILS_CLIENT] Using cached auth data from context')

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

  return <WaitingToCallDetailsPageOptimized />
}

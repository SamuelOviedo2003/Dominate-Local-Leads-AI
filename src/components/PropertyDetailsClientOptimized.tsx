'use client'

import { useAuthData } from '@/contexts/AuthDataContext'
import PropertyDetailsPageOptimized from '@/app/[business_id]/[permalink]/property-details/[leadId]/client-optimized'

/**
 * Optimized wrapper for PropertyDetailsPageOptimized that uses cached authentication data
 * Eliminates the need to pass auth props - gets data from AuthDataProvider
 */
export function PropertyDetailsClientOptimized() {
  const { user } = useAuthData()

  console.log('[PROPERTY_DETAILS_CLIENT_OPTIMIZED] Using cached auth data from context')

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

  // Pass cached data to the original PropertyDetailsPageOptimized
  // Use first accessible business as fallback (BusinessContext will override with current business)
  return <PropertyDetailsPageOptimized />
}
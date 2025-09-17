'use client'

import React, { useMemo, useCallback, memo } from 'react'
import { PropertyInfo } from '@/types/leads'
import { Home, MapPin, DollarSign, Clock, Route } from 'lucide-react'
import { LoadingSystem } from '@/components/LoadingSystem'
import ImageWithFallback from '@/components/ImageWithFallback'

interface PropertyInformationProps {
  property?: PropertyInfo | null
  isLoading?: boolean
  error?: string | null
}

const PropertyInformationComponent = ({ property, isLoading = false, error = null }: PropertyInformationProps) => {
  const formatDistance = useCallback((meters: number | null) => {
    if (!meters) return 'N/A'
    
    const miles = meters * 0.000621371
    return miles < 1 
      ? `${Math.round(meters * 3.28084)} ft` 
      : `${miles.toFixed(1)} mi`
  }, [])

  const formatDuration = useCallback((seconds: number | null) => {
    if (!seconds) return 'N/A'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`
    }
    return `${minutes} min`
  }, [])

  const generateGoogleMapsUrl = useCallback((address: string) => {
    const encodedAddress = encodeURIComponent(address)
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
  }, [])

  // Handle loading state with same structure as CallWindows
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Home className="w-6 h-6 text-green-600" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Property Information</h3>
        </div>
        <div className="flex items-center justify-center flex-1">
          <LoadingSystem size="md" message="Loading property information..." />
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Home className="w-6 h-6 text-green-600" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Property Information</h3>
        </div>
        <div className="text-center flex-1 flex items-center justify-center">
          <div>
            <div className="text-red-500 text-lg font-medium mb-2 flex items-center gap-2 justify-center">
              <Home className="w-5 h-5" />
              Error Loading Property Data
            </div>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col w-full">
      {/* Header with House Icon */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Home className="w-6 h-6 text-green-600" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Property Information</h3>
      </div>

      {/* Property Content */}
      <div className="flex-1 flex flex-col space-y-4">
        {property ? (
          <>
            {/* Property Image - Top Section */}
            <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
              {property.house_url ? (
                <ImageWithFallback
                  src={property.house_url}
                  alt="Property"
                  className="w-full h-full object-cover"
                  fallbackBehavior="placeholder"
                  fallbackText="IMAGE COMING SOON"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center">
                  <Home className="w-8 h-8 text-gray-400 mb-2" />
                  <div className="text-gray-500 text-xs font-medium">IMAGE COMING SOON</div>
                </div>
              )}
            </div>

            {/* Property Details Cards */}
            <div className="space-y-3 flex-1">
              {/* Address Card */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                      Address
                    </div>
                    <div className="text-gray-900 text-xs leading-relaxed break-words">
                      {property.full_address || 'Address not available'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Value Card */}
              {property.house_value && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                        Property Value
                      </div>
                      <div className="text-gray-900 font-semibold text-sm">
                        ${property.house_value.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Distance & Duration Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-2.5 border border-purple-100">
                  <div className="flex items-center gap-2">
                    <Route className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-0.5">
                        Distance
                      </div>
                      <div className="text-gray-900 font-medium text-xs">
                        {formatDistance(property.distance_meters)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-2.5 border border-yellow-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-0.5">
                        Duration
                      </div>
                      <div className="text-gray-900 font-medium text-xs">
                        {formatDuration(property.duration_seconds)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* View on Maps Link */}
              {property.full_address && (
                <div className="pt-2">
                  <a
                    href={generateGoogleMapsUrl(property.full_address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors bg-blue-50 hover:bg-blue-100 rounded-lg py-2 px-3 border border-blue-200"
                  >
                    View on Maps
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty State - Same structure as CallWindows */
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 text-center flex-1 flex flex-col items-center justify-center border border-green-100">
            <div className="relative mb-4">
              <Home className="w-12 h-12 text-green-400 mx-auto" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full" />
            </div>
            
            <div className="space-y-2">
              <p className="text-gray-600 font-medium flex items-center gap-2 justify-center">
                <Home className="w-4 h-4" />
                No Property Data Available
              </p>
              <p className="text-gray-500 text-sm">Property information will appear here when available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const PropertyInformation = memo(PropertyInformationComponent)

// Also provide a default export for better compatibility
export default PropertyInformation
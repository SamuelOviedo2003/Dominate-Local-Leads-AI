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

interface InfoCardProps {
  icon: React.ReactNode
  title: string
  value: string
}

const InfoCard = ({ icon, title, value }: InfoCardProps) => (
  <div className="group bg-gradient-to-r from-white to-brand-slate-50/30 rounded-lg p-2.5 border border-brand-slate-200/50 hover:border-brand-orange-200 transition-all duration-200 hover:shadow-sm">
    <div className="flex items-center space-x-2.5">
      <div className="w-7 h-7 bg-brand-orange-100 rounded-lg flex items-center justify-center text-brand-orange-600 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-brand-slate-500 uppercase tracking-wide mb-0.5">
          {title}
        </div>
        <div className="text-brand-slate-900 font-medium text-xs break-words">
          {value}
        </div>
      </div>
    </div>
  </div>
)

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

  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-center flex-1">
          <LoadingSystem size="md" message="Loading property information..." />
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 h-full flex flex-col overflow-hidden">
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
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 h-full flex flex-col overflow-hidden">
      {/* Header Section - Following Lead Info Style */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-600">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Property Information
          </span>
        </div>
      </div>

      {/* Property Content - Two Column Layout */}
      <div className="p-4 flex-1">
        {property ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Column - Property Image */}
            <div className="flex flex-col">
              <div className="w-full h-48 lg:h-full bg-gray-100 rounded-lg overflow-hidden">
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
            </div>

            {/* Right Column - Property Data using Lead Info Style */}
            <div className="flex flex-col space-y-4">
              {/* Address */}
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="text-xs text-gray-500">Address</span>
                <p className="font-medium text-gray-900 text-sm">
                  {property.full_address || 'Address not available'}
                </p>
              </div>

              {/* Property Value */}
              {property.house_value && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <span className="text-xs text-gray-500">Property Value</span>
                  <p className="font-medium text-gray-900 text-sm">
                    ${property.house_value.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Distance */}
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="text-xs text-gray-500">Distance</span>
                <p className="font-medium text-gray-900 text-sm">
                  {formatDistance(property.distance_meters)}
                </p>
              </div>

              {/* Duration */}
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="text-xs text-gray-500">Duration</span>
                <p className="font-medium text-gray-900 text-sm">
                  {formatDuration(property.duration_seconds)}
                </p>
              </div>

              {/* View on Maps Link */}
              {property.full_address && (
                <div className="pt-2">
                  <a
                    href={generateGoogleMapsUrl(property.full_address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors bg-blue-50 hover:bg-blue-100 rounded-lg py-3 px-4 border border-blue-200"
                  >
                    View on Maps
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty State */
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
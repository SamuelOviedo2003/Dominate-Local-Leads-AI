'use client'

import { PropertyInfo } from '@/types/leads'
import ImageWithFallback from '@/components/ImageWithFallback'
import { useCallback, memo } from 'react'

interface PropertyOverviewProps {
  property?: PropertyInfo | null
}

const PropertyOverviewComponent = ({ property }: PropertyOverviewProps) => {
  const formatDistance = useCallback((meters: number | null) => {
    if (!meters) return null
    
    const miles = meters * 0.000621371
    return miles < 1 
      ? `${Math.round(meters * 3.28084)} ft` 
      : `${miles.toFixed(1)} mi`
  }, [])

  const formatDuration = useCallback((seconds: number | null) => {
    if (!seconds) return null
    
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

  return (
    <div>
      {/* Property Details */}
      <div>
        {/* Property Address */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Property Address
          </h3>
          <p className="text-gray-900 text-sm leading-relaxed">
            {property?.full_address || 'Address not available'}
          </p>
        </div>

        {/* Property Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Distance
            </div>
            <div className="text-gray-900 font-medium text-sm">
              {property?.distance_meters ? formatDistance(property.distance_meters) : 'N/A'}
            </div>
          </div>
          
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Duration
            </div>
            <div className="text-gray-900 font-medium text-sm">
              {property?.duration_seconds ? formatDuration(property.duration_seconds) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Property Value */}
        {property?.house_value && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Property Value
            </div>
            <div className="text-gray-900 font-medium text-sm">
              ${property.house_value.toLocaleString()}
            </div>
          </div>
        )}

        {/* View on Maps Link */}
        {property?.full_address && (
          <a
            href={generateGoogleMapsUrl(property.full_address)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            View on Maps
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const PropertyOverview = memo(PropertyOverviewComponent)
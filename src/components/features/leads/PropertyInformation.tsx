'use client'

import React, { useMemo, useCallback, memo, useState } from 'react'
import { PropertyInfo } from '@/types/leads'
import { Home, MapPin, DollarSign, Clock, Route, Edit3, X } from 'lucide-react'
import { LoadingSystem } from '@/components/LoadingSystem'
import ImageWithFallback from '@/components/ImageWithFallback'

interface PropertyInformationProps {
  property?: PropertyInfo | null
  isLoading?: boolean
  error?: string | null
  leadId?: string
  accountId?: string
  businessId?: string | number
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

const PropertyInformationComponent = ({ property, isLoading = false, error = null, leadId, accountId, businessId }: PropertyInformationProps) => {
  const [showEditModal, setShowEditModal] = useState(false)
  const [streetName, setStreetName] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleEditAddress = () => {
    // Pre-fill current values if available
    if (property?.full_address) {
      setStreetName(property.full_address.split(',')[0] || '')
    }
    setPostalCode('')
    setShowEditModal(true)
  }

  const handleUpdateAddress = async () => {
    if (!streetName || !postalCode) {
      setUpdateMessage({ type: 'error', text: 'Please fill in all fields' })
      setTimeout(() => setUpdateMessage(null), 3000)
      return
    }

    setIsUpdating(true)
    setUpdateMessage(null)

    try {
      const webhookUrl = 'https://n8nio-n8n-pbq4r3.sliplane.app/webhook/update-address'

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: leadId,
          account_id: accountId,
          street_name: streetName,
          postal_code: postalCode,
          business_id: businessId
        })
      })

      if (response.ok) {
        setUpdateMessage({ type: 'success', text: 'Address updated successfully!' })
        setTimeout(() => {
          setShowEditModal(false)
          setUpdateMessage(null)
          setStreetName('')
          setPostalCode('')
        }, 2000)
      } else {
        throw new Error('Failed to update address')
      }
    } catch (error) {
      setUpdateMessage({ type: 'error', text: 'Failed to update address. Please try again.' })
      setTimeout(() => setUpdateMessage(null), 3000)
    } finally {
      setIsUpdating(false)
    }
  }

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
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Address</span>
                  {leadId && accountId && businessId && (
                    <button
                      onClick={handleEditAddress}
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs font-medium transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                </div>
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

      {/* Edit Address Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Edit Address</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setStreetName('')
                  setPostalCode('')
                  setUpdateMessage(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Success/Error Messages */}
              {updateMessage && (
                <div className={`p-3 rounded-md ${
                  updateMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${
                    updateMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {updateMessage.text}
                  </p>
                </div>
              )}

              {/* Street Name Field */}
              <div>
                <label htmlFor="streetName" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Name *
                </label>
                <input
                  type="text"
                  id="streetName"
                  value={streetName}
                  onChange={(e) => setStreetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter street name"
                  disabled={isUpdating}
                />
              </div>

              {/* Postal Code Field */}
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code *
                </label>
                <input
                  type="text"
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter postal code"
                  disabled={isUpdating}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setStreetName('')
                  setPostalCode('')
                  setUpdateMessage(null)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAddress}
                disabled={isUpdating || !streetName || !postalCode}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUpdating && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{isUpdating ? 'Updating...' : 'Update'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const PropertyInformation = memo(PropertyInformationComponent)

// Also provide a default export for better compatibility
export default PropertyInformation
'use client'

import { memo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { LeadInformation } from '@/components/features/leads/LeadInformation'
import { CommunicationsHistory } from '@/components/features/leads/CommunicationsHistory'
import { PropertyInformation } from '@/components/features/leads/PropertyInformation'
import { CallNowButton } from '@/components/CallNowButton'
import { useCurrentBusiness } from '@/contexts/BusinessContext'
import { useLeadDetailsData } from '@/hooks/useLeadDetailsData'
import { usePermalinkNavigation } from '@/lib/permalink-navigation'

const PropertyDetailsPage = () => {
  const params = useParams()
  const selectedCompany = useCurrentBusiness()
  const { navigateToSection } = usePermalinkNavigation()
  
  const leadId = params.leadId as string
  const businessId = selectedCompany?.business_id

  const {
    leadDetails,
    isLeadInfoLoading,
    isCommunicationsLoading,
    leadInfoError,
    communicationsError,
    error,
    refetch
  } = useLeadDetailsData({
    leadId,
    businessId: businessId || ''
  })

  // Handle global error (like "Lead not found") - use useEffect for navigation
  // IMPORTANT: This useEffect must be before any conditional returns to follow React hooks rules
  useEffect(() => {
    if (error && error.includes('Lead not found')) {
      navigateToSection('bookings')
    }
  }, [error, navigateToSection])

  const handleGoBack = () => {
    navigateToSection('bookings')
  }

  // Handle cases where we don't have required data yet
  if (!leadId || !businessId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Bookings
            </button>

            {/* Placeholder for Call Now button during loading */}
            <div className="w-32 h-12 bg-gray-200 rounded-full animate-pulse"></div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg font-medium">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state if redirecting due to "Lead not found" error
  if (error && error.includes('Lead not found')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg font-medium">Redirecting...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Back Navigation and Call Now Button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </button>

          <CallNowButton
            phone={leadDetails?.lead?.phone}
            dialpadPhone={leadDetails?.dialpadPhone}
            leadId={leadId}
          />
        </div>

        {/* Top Section: Lead Info - Full Width */}
        <div className="w-full mb-6">
          <LeadInformation
            lead={leadDetails?.lead || null}
            property={leadDetails?.property || null}
            isLoading={isLeadInfoLoading}
            error={leadInfoError}
          />
        </div>

        {/* Bottom Section: Communications and Property Information - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Communications History */}
          <div className="w-full">
            <CommunicationsHistory
              communications={leadDetails?.communications || null}
              isLoading={isCommunicationsLoading}
              error={communicationsError}
              leadId={leadId}
              businessId={businessId}
            />
          </div>

          {/* Right Column - Property Information */}
          <div className="w-full">
            <PropertyInformation
              property={leadDetails?.property || null}
              isLoading={isLeadInfoLoading}
              error={leadInfoError}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Export the memoized component to prevent unnecessary re-renders
export default memo(PropertyDetailsPage)
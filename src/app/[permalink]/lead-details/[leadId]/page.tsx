'use client'

import { memo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { LeadInformation } from '@/components/features/leads/LeadInformation'
import { CommunicationsHistory } from '@/components/features/leads/CommunicationsHistory'
import { CallWindows } from '@/components/features/leads/CallWindows'
import { useCurrentBusiness } from '@/contexts/BusinessContext'
import { useLeadDetailsData } from '@/hooks/useLeadDetailsData'
import { usePermalinkNavigation } from '@/lib/permalink-navigation'

const LeadDetailsPage = () => {
  const params = useParams()
  const selectedCompany = useCurrentBusiness()
  const { navigateToSection } = usePermalinkNavigation()
  
  const leadId = params.leadId as string
  const businessId = selectedCompany?.business_id

  const {
    leadDetails,
    isLeadInfoLoading,
    isCallWindowsLoading,
    isCommunicationsLoading,
    leadInfoError,
    callWindowsError,
    communicationsError,
    error,
    refetch
  } = useLeadDetailsData({
    leadId,
    businessId: businessId || ''
  })

  const handleGoBack = () => {
    navigateToSection('new-leads')
  }

  // Handle cases where we don't have required data yet
  if (!leadId || !businessId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 mb-8"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to New Leads
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg font-medium">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Handle global error (like "Lead not found") - use useEffect for navigation
  useEffect(() => {
    if (error && error.includes('Lead not found')) {
      navigateToSection('new-leads')
    }
  }, [error, navigateToSection])

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
        {/* Header with Back Navigation */}
        <div className="mb-6">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to New Leads
          </button>
        </div>


        {/* Top Section: Lead Info + Call Windows */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          {/* Left section - Lead Information (70-75% width) */}
          <div className="flex-1 lg:flex-[3] min-h-[540px] h-[540px]">
            <LeadInformation 
              lead={leadDetails?.lead || null}
              property={leadDetails?.property || null}
              isLoading={isLeadInfoLoading}
              error={leadInfoError}
            />
          </div>
          
          {/* Right section - Call Windows (25-30% width) */}
          <div className="lg:flex-1 lg:max-w-[320px] h-[540px]">
            <CallWindows 
              callWindows={leadDetails?.callWindows || null}
              isLoading={isCallWindowsLoading}
              error={callWindowsError}
              businessTimezone={leadDetails?.businessTimezone}
            />
          </div>
        </div>

        {/* Bottom Section: Communications History - Full Width */}
        <div className="w-full">
          <CommunicationsHistory 
            communications={leadDetails?.communications || null}
            isLoading={isCommunicationsLoading}
            error={communicationsError}
            leadId={leadId}
            businessId={businessId}
          />
        </div>
      </div>
    </div>
  )
}

// Export the memoized component to prevent unnecessary re-renders
export default memo(LeadDetailsPage)
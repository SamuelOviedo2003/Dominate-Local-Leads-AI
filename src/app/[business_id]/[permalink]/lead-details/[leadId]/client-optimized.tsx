'use client'

import { memo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { LeadInformation } from '@/components/features/leads/LeadInformation'
import { CommunicationsHistory } from '@/components/features/leads/CommunicationsHistory'
import { CallWindows } from '@/components/features/leads/CallWindows'
import { CallNowButton } from '@/components/CallNowButton'
import { LeadStageDropdown } from '@/components/LeadStageDropdown'
import { BookingButton } from '@/components/BookingButton'
import { CircularTimer } from '@/components/features/leads/CircularTimer'
import { useCurrentBusiness } from '@/contexts/BusinessContext'
import { useLeadDetailsDataOptimized } from '@/hooks/useLeadDetailsDataOptimized'
import { usePermalinkNavigation } from '@/lib/permalink-navigation'
import { ComponentLoading } from '@/components/LoadingSystem'

// Unified loading component for the entire Lead Details page
function UnifiedLoadingState() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with placeholders */}
        <div className="mb-6 flex items-center justify-between">
          <div className="w-40 h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-32 h-12 bg-gray-200 rounded-full animate-pulse"></div>
        </div>

        {/* Main loading area */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-center py-16">
            <ComponentLoading message="Loading lead details..." />
          </div>
        </div>
      </div>
    </div>
  )
}

// Error component
function ErrorDisplay({ message, onRetry, onGoBack }: { message: string; onRetry: () => void; onGoBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center">
          <button
            onClick={onGoBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to New Leads
          </button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Lead Details</h3>
              <div className="mt-2 text-sm text-red-700">{message}</div>
              <div className="mt-4">
                <button
                  onClick={onRetry}
                  className="bg-red-100 text-red-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const LeadDetailsPageOptimized = () => {
  const params = useParams()
  const selectedCompany = useCurrentBusiness()
  const { navigateToSection } = usePermalinkNavigation()

  const leadId = params.leadId as string
  const businessId = selectedCompany?.business_id

  const {
    leadDetails,
    isLoading,
    error,
    refetch
  } = useLeadDetailsDataOptimized({
    leadId,
    businessId: businessId || ''
  })

  // Handle global error (like "Lead not found") - use useEffect for navigation
  // IMPORTANT: This useEffect must be before any conditional returns to follow React hooks rules
  useEffect(() => {
    if (error && error.includes('Lead not found')) {
      navigateToSection('new-leads')
    }
  }, [error, navigateToSection])

  const handleGoBack = () => {
    navigateToSection('new-leads')
  }

  // Handle cases where we don't have required data yet
  if (!leadId || !businessId) {
    return <UnifiedLoadingState />
  }

  // Show unified loading state while data is loading
  if (isLoading) {
    return <UnifiedLoadingState />
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

  // Show error state for other errors
  if (error && !error.includes('Lead not found')) {
    return <ErrorDisplay message={error} onRetry={refetch} onGoBack={handleGoBack} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Back Navigation, Circular Timer, Stage Dropdown, and Call Now Button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to New Leads
            </button>

            {/* Circular Timer */}
            <CircularTimer
              callWindows={leadDetails?.callWindows || null}
              businessTimezone={leadDetails?.businessTimezone}
              size="lg"
            />
          </div>

          <div className="flex items-center gap-4">
            {leadDetails?.lead && (
              <LeadStageDropdown
                leadId={leadId}
                currentStage={leadDetails.lead.stage}
              />
            )}
            {leadDetails?.lead && (
              <BookingButton
                leadId={leadId}
                accountId={leadDetails.lead.account_id}
              />
            )}
            <CallNowButton
              phone={leadDetails?.lead?.phone}
              dialpadPhone={leadDetails?.dialpadPhone}
              leadId={leadId}
            />
          </div>
        </div>

        {/* Top Section: Lead Info - Full Width */}
        <div className="w-full mb-6">
          <LeadInformation
            lead={leadDetails?.lead || null}
            property={leadDetails?.property || null}
            isLoading={false} // No individual loading since we have unified loading
            error={null} // No individual errors since we handle errors globally
            businessTimezone={leadDetails?.businessTimezone}
          />
        </div>

        {/* Bottom Section: Communications and Call Windows - Adjusted for better balance */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Communications History (60% width) */}
          <div className="lg:col-span-3 w-full">
            {(() => {
              console.log('[LeadDetailsClient] Phone data:', {
                leadPhone: leadDetails?.lead?.phone,
                businessPhone: leadDetails?.dialpadPhone,
                hasLead: !!leadDetails?.lead,
                leadData: leadDetails?.lead
              })
              return null
            })()}
            <CommunicationsHistory
              communications={leadDetails?.communications || null}
              callWindows={leadDetails?.callWindows || null}
              isLoading={false} // No individual loading since we have unified loading
              error={null} // No individual errors since we handle errors globally
              leadId={leadId}
              businessId={businessId}
              businessTimezone={leadDetails?.businessTimezone}
              leadPhone={leadDetails?.lead?.phone}
              businessPhone={leadDetails?.dialpadPhone}
            />
          </div>

          {/* Right Column - Call Windows (40% width) */}
          <div className="lg:col-span-2 w-full">
            <CallWindows
              callWindows={leadDetails?.callWindows || null}
              isLoading={false} // No individual loading since we have unified loading
              error={null} // No individual errors since we handle errors globally
              businessTimezone={leadDetails?.businessTimezone}
              workingHours={leadDetails?.lead?.working_hours}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Export the memoized component to prevent unnecessary re-renders
export default memo(LeadDetailsPageOptimized)
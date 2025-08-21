'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LeadDetails, ApiResponse } from '@/types/leads'
import { LeadInformation } from '@/components/features/leads/LeadInformation'
import { CommunicationsHistory } from '@/components/features/leads/CommunicationsHistory'
import { CallWindows } from '@/components/features/leads/CallWindows'
import { useCompany } from '@/contexts/CompanyContext'

const LeadDetailsPage = () => {
  const params = useParams()
  const router = useRouter()
  const { selectedCompany } = useCompany()
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const leadId = params.leadId as string

  useEffect(() => {
    if (!leadId || !selectedCompany?.business_id) {
      return
    }

    fetchLeadDetails()
  }, [leadId, selectedCompany?.business_id])

  const fetchLeadDetails = useCallback(async () => {
    if (!leadId || !selectedCompany?.business_id) {
      setError('Missing required parameters')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const url = new URL(`/api/leads/${leadId}`, window.location.origin)
      url.searchParams.set('businessId', selectedCompany.business_id)

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch lead details')
      }

      const result: ApiResponse<LeadDetails> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch lead details')
      }

      setLeadDetails(result.data)
    } catch (error) {
      console.error('Error fetching lead details:', error)
      
      // If the error is "Lead not found", redirect to new leads instead of showing error
      if (error instanceof Error && error.message === 'Lead not found') {
        router.push('/new-leads')
        return
      }
      
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [leadId, selectedCompany?.business_id])

  const handleGoBack = useCallback(() => {
    router.push('/new-leads')
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
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
              <div className="text-red-500 text-lg font-medium mb-2">Error Loading Lead Details</div>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={fetchLeadDetails}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!leadDetails) {
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
              <div className="text-gray-500 text-lg font-medium">Lead not found</div>
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


        {/* Lead details layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <LeadInformation 
              lead={leadDetails.lead} 
              property={leadDetails.property}
            />
          </div>
          
          {/* Right column - Call Windows */}
          <div className="lg:col-span-1">
            <CallWindows callWindows={leadDetails.callWindows} />
          </div>
        </div>

        {/* Communications History - Full Width */}
        <div className="mt-6">
          <CommunicationsHistory communications={leadDetails.communications} />
        </div>
      </div>
    </div>
  )
}

// Export the memoized component to prevent unnecessary re-renders
export default memo(LeadDetailsPage)
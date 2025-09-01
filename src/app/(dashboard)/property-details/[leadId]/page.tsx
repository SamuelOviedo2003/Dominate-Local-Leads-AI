'use client'

import { memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PropertyOverview } from '@/components/features/leads/PropertyOverview'
import { CommunicationsHistory } from '@/components/features/leads/CommunicationsHistory'
import { useCompany } from '@/contexts/CompanyContext'
import { useLeadDetailsData } from '@/hooks/useLeadDetailsData'
import ImageWithFallback from '@/components/ImageWithFallback'

const PropertyDetailsPage = () => {
  const params = useParams()
  const router = useRouter()
  const { selectedCompany } = useCompany()
  
  const leadId = params.leadId as string
  const businessId = selectedCompany?.business_id

  const {
    leadDetails,
    isLeadInfoLoading,
    isCommunicationsLoading,
    leadInfoError,
    communicationsError,
    error
  } = useLeadDetailsData({
    leadId,
    businessId: businessId || ''
  })

  const handleGoBack = () => {
    router.push('/salesman')
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
            Back to Salesman
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

  // Handle global error (like "Lead not found")
  if (error && error.includes('Lead not found')) {
    router.push('/salesman')
    return null
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
            Back to Salesman
          </button>
        </div>

        {/* Top Section: Property Info + Property Image */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          {/* Left section - Property Information (70-75% width) */}
          <div className="flex-1 lg:flex-[3] min-h-[540px] h-[540px]">
            <div className="bg-white rounded-lg shadow-sm p-6 h-full overflow-y-auto">
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  Property Details
                </h1>
                <p className="text-gray-600 mt-1">
                  {leadDetails?.lead.first_name} {leadDetails?.lead.last_name}
                </p>
              </div>
              
              <PropertyOverview 
                property={leadDetails?.property || null} 
              />
            </div>
          </div>
          
          {/* Right section - Property Image (25-30% width) */}
          <div className="lg:flex-1 lg:max-w-[320px] h-[540px]">
            <div className="bg-white rounded-lg shadow-sm h-full overflow-hidden">
              {leadDetails?.property?.house_url ? (
                <ImageWithFallback
                  src={leadDetails.property.house_url}
                  alt="Property"
                  className="w-full h-full object-cover"
                  fallbackBehavior="placeholder"
                  fallbackText="IMAGE COMING SOON"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-gray-500 text-lg font-medium">IMAGE COMING SOON</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Communications History - Full Width */}
        <div className="w-full">
          <CommunicationsHistory 
            communications={leadDetails?.communications || null}
            isLoading={isCommunicationsLoading}
            error={communicationsError}
          />
        </div>
      </div>
    </div>
  )
}

// Export the memoized component to prevent unnecessary re-renders
export default memo(PropertyDetailsPage)
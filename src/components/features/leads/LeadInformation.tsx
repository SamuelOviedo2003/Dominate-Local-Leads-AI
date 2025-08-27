'use client'

import { Lead, PropertyInfo } from '@/types/leads'
import { useMemo, useCallback, memo } from 'react'
import { LoadingSystem } from '@/components/LoadingSystem'

interface LeadInformationProps {
  lead?: Lead | null
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

const LeadInformationComponent = ({ lead, property, isLoading = false, error = null }: LeadInformationProps) => {
  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
        <div className="flex items-center justify-center flex-1">
          <LoadingSystem size="md" message="Loading lead information..." />
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
        <div className="text-center flex-1 flex items-center justify-center">
          <div>
            <div className="text-red-500 text-lg font-medium mb-2">Error Loading Lead Information</div>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Handle no data state
  if (!lead) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
        <div className="text-center flex-1 flex items-center justify-center">
          <div className="text-gray-500 text-lg font-medium">No lead information available</div>
        </div>
      </div>
    )
  }

  const leadAnalysis = useMemo(() => {
    const service = lead.service || 'Service'
    const source = lead.source || 'Unknown source'
    const propertyValue = property?.house_value ? `$${property.house_value.toLocaleString()}` : '$262k'
    
    // Generate recommended actions based on score and communications count
    const recommendedActions = []
    if (lead.score >= 70) {
      recommendedActions.push('Schedule follow up')
    } else {
      recommendedActions.push('Schedule follow up')
    }
    
    if (lead.communications_count === 0) {
      recommendedActions.unshift('First contact')
    }
    
    return {
      description: `${service} from ${source} on 16-20 yr roof, homeowner with ${propertyValue} property.`,
      recommendedActions
    }
  }, [lead, property])

  const getSourceDisplay = useCallback((source: string | null | undefined) => {
    if (!source) return 'Unknown'
    
    // Format common source names nicely
    switch (source.toLowerCase()) {
      case 'facebook':
      case 'facebook ads':
        return 'Facebook Ads'
      case 'google':
      case 'google ads':
        return 'Google Ads'
      case 'website':
        return 'Website'
      case 'referral':
        return 'Referral'
      default:
        return source.charAt(0).toUpperCase() + source.slice(1)
    }
  }, [])

  const scoreConfig = useMemo(() => {
    const score = lead.score
    if (score <= 33) {
      return {
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        label: 'Low Priority',
        icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5C3.312 18.167 4.274 19 5.814 19z'
      }
    } else if (score <= 66) {
      return {
        bgColor: 'bg-yellow-500',
        textColor: 'text-gray-900',
        label: 'Medium Priority',
        icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      }
    }
    return {
      bgColor: 'bg-green-500',
      textColor: 'text-white',
      label: 'Strong Lead',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  }, [lead.score])

  const displaySummary = useMemo(() => {
    return lead.summary || lead.score_summary || 'No summary available'
  }, [lead.summary, lead.score_summary])

  const handleQuickAction = useCallback((action: string) => {
    // In a real implementation, this would trigger the appropriate action
    // Quick action logic would be implemented here
    // Example: window.location.href = `tel:${lead.phone}`
  }, [lead])


  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 h-full flex flex-col overflow-hidden backdrop-blur-sm">
      {/* Modern Header Section with Gradient Background */}
      <div className="relative bg-gradient-to-br from-brand-slate-50 via-white to-brand-slate-50 p-6 border-b border-gray-100">
        {/* Subtle decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-orange-100/20 to-transparent rounded-bl-full"></div>
        
        {/* Lead Name and Score */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {/* Score indicator circle */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md ${scoreConfig.bgColor}`}>
              {Math.round(lead.score)}
            </div>
            
            <div>
              <h1 className="text-xl font-bold text-brand-slate-900 break-words">
                {lead.first_name} {lead.last_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-brand-slate-500 bg-brand-slate-100 px-2 py-1 rounded-full">
                  {scoreConfig.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Summary with Modern Card Design */}
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-brand-slate-200/50 shadow-sm">
          <p className="text-brand-slate-700 text-xs leading-relaxed break-words">
            {displaySummary}
          </p>
        </div>
      </div>

      {/* Content Section - Two Column Layout */}
      <div className="flex-1 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Left Column - Contact Information */}
          <div className="space-y-3">
            {/* Email Card */}
            <div className="group bg-gradient-to-r from-white to-brand-slate-50/50 rounded-lg p-3 border border-brand-slate-200/50 hover:border-brand-orange-300 transition-all duration-200 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 bg-brand-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-brand-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-brand-slate-500 uppercase tracking-wide">Email</div>
                    <div className="text-brand-slate-900 font-medium text-xs truncate">{lead.email}</div>
                  </div>
                </div>
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div className="group bg-gradient-to-r from-white to-brand-slate-50/50 rounded-lg p-3 border border-brand-slate-200/50 hover:border-brand-orange-300 transition-all duration-200 hover:shadow-md">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 bg-brand-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-brand-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-brand-slate-500 uppercase tracking-wide">Phone</div>
                  <div className="text-brand-slate-900 font-medium text-xs">{lead.phone}</div>
                </div>
              </div>
            </div>

            {/* Service Information */}
            <InfoCard
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.952 22.952 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
              }
              title="Service Needed"
              value={lead.service || 'Not specified'}
            />
            
            <InfoCard
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
              }
              title="Lead Source"
              value={getSourceDisplay(lead.source)}
            />
          </div>

          {/* Right Column - Property & Lead Information */}
          <div className="space-y-3">
            <InfoCard
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              }
              title="Next Step"
              value={lead.next_step || 'No next step defined'}
            />

            <InfoCard
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              }
              title="Roof Age"
              value="16-20 years old"
            />
            
            <InfoCard
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              }
              title="Created"
              value={new Date(lead.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const LeadInformation = memo(LeadInformationComponent)
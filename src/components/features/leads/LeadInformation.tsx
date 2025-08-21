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
    const howSoon = lead.how_soon?.toLowerCase() === 'month' ? 'next month' : lead.how_soon?.toLowerCase() || 'soon'
    const propertyValue = property?.house_value ? `$${property.house_value.toLocaleString()}` : '$262k'
    
    // Determine urgency level
    const urgencyLevel = lead.how_soon?.toLowerCase() === 'asap' ? 'High' : 
                        lead.how_soon?.toLowerCase() === 'week' ? 'Medium' : 'Low'
    
    // Generate recommended actions based on score and urgency
    const recommendedActions = []
    if (lead.score >= 70) {
      recommendedActions.push('Schedule appointment')
    } else {
      recommendedActions.push('Schedule follow up')
    }
    
    return {
      description: `${service} ${howSoon} on 16-20 yr roof, homeowner with ${propertyValue} property— ${urgencyLevel.toLowerCase()} urgency.`,
      urgencyLevel,
      recommendedActions
    }
  }, [lead, property])

  const getHowSoonDisplay = useCallback((howSoon: string) => {
    switch (howSoon?.toLowerCase()) {
      case 'asap':
        return 'ASAP'
      case 'week':
        return 'This week'
      case 'month':
        return 'Next month'
      default:
        return howSoon || 'Not specified'
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
      label: 'High Priority',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  }, [lead.score])

  const handleQuickAction = useCallback((action: string) => {
    // In a real implementation, this would trigger the appropriate action
    console.log(`Quick action triggered: ${action} for lead ${lead.lead_id}`)
    // Example: window.location.href = `tel:${lead.phone}`
  }, [lead])


  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col overflow-y-auto">
      {/* Lead Name Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4 break-words">
        {lead.first_name} {lead.last_name}
      </h1>
      
      {/* Lead Quality Score */}
      <div className={`${scoreConfig.bgColor} rounded-lg p-4 mb-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className={scoreConfig.textColor}>
            <div className="text-2xl font-bold">{Math.round(lead.score)}%</div>
            <div className="text-sm font-medium opacity-90">{scoreConfig.label}</div>
          </div>
          <svg className={`w-8 h-8 ${scoreConfig.textColor} opacity-80`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={scoreConfig.icon} />
          </svg>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {leadAnalysis.recommendedActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickAction(action)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                scoreConfig.textColor === 'text-white' 
                  ? 'border-white/30 hover:bg-white/10' 
                  : 'border-gray-900/30 hover:bg-gray-900/10'
              } ${scoreConfig.textColor}`}
            >
              {action}
            </button>
          ))}
        </div>
      </div>
      
      {/* Contact Information */}
      <div className="mb-4 space-y-2">
        <div className="flex items-start space-x-2">
          <span className="text-gray-600 text-sm flex-shrink-0">Email:</span>
          <div className="flex items-center space-x-1 min-w-0 flex-1">
            <span className="text-gray-900 text-sm truncate">{lead.email}</span>
            {/* Email validation checkmark */}
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <span className="text-gray-600 text-sm flex-shrink-0">Phone:</span>
          <span className="text-gray-900 text-sm break-all">{lead.phone}</span>
        </div>
      </div>

      {/* Lead Description & Urgency */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 space-y-2 sm:space-y-0">
          <p className="text-gray-700 text-sm leading-relaxed flex-1 break-words pr-0 sm:pr-3">
            {leadAnalysis.description}
          </p>
          <span className={`self-start flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
            leadAnalysis.urgencyLevel === 'High' ? 'bg-red-100 text-red-800' :
            leadAnalysis.urgencyLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {leadAnalysis.urgencyLevel} Urgency
          </span>
        </div>
        
      </div>

      {/* Service Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        {/* Left Column */}
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Service Needed
            </div>
            <div className="text-gray-900 font-medium text-sm break-words">
              {lead.service || 'Not specified'}
            </div>
          </div>
          
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Lead Source
            </div>
            <div className="text-gray-900 font-medium text-sm">
              Facebook Ads
            </div>
          </div>
          
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Status
            </div>
            <div className="flex items-center">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                lead.contacted ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {lead.contacted ? 'Contacted' : 'New Lead'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              How Soon
            </div>
            <div className="text-gray-900 font-medium text-sm break-words">
              {getHowSoonDisplay(lead.how_soon)}
            </div>
          </div>
          
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Roof Age
            </div>
            <div className="text-gray-900 font-medium text-sm">
              16-20 years old
            </div>
          </div>
          
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Created
            </div>
            <div className="text-gray-900 font-medium text-sm">
              {new Date(lead.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const LeadInformation = memo(LeadInformationComponent)
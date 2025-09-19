'use client'

import Link from 'next/link'
import { useState, memo, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'
import { LeadWithClient } from '@/types/leads'
import { usePermalinkNavigation, usePermalinkUrl } from '@/lib/permalink-navigation'

interface LeadsTableProps {
  leads: LeadWithClient[] | null
  isLoading: boolean
  error: string | null
  navigationTarget?: 'lead-details' | 'property-details' | 'actions'
  title?: string
}

function LeadsTableComponent({ leads, isLoading, error, navigationTarget = 'lead-details', title = 'Recent Leads' }: LeadsTableProps) {
  const { navigate } = usePermalinkNavigation()
  const buildUrl = usePermalinkUrl()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  // Removed getScoreColor function - no longer needed for calls count circle

  const truncateService = useCallback((service: string | null | undefined, maxLength: number = 25) => {
    if (!service) return ''
    if (service.length <= maxLength) return service
    return service.substring(0, maxLength) + '...'
  }, [])

  const getWorkingHoursIcon = useCallback((workingHours: boolean | null | undefined) => {
    // If working_hours is false, show moon icon
    // If working_hours is true or null, show sun icon
    if (workingHours === false) {
      return <Moon className="w-3 h-3 text-blue-300" />
    } else {
      return <Sun className="w-3 h-3 text-yellow-400" />
    }
  }, [])

  const getHowSoonTagStyle = useCallback((howSoon: string | null | undefined) => {
    if (!howSoon) return ''

    const lowerHowSoon = howSoon.toLowerCase()

    if (lowerHowSoon.includes('asap') || lowerHowSoon.includes('immediately') || lowerHowSoon.includes('urgent')) {
      return 'bg-red-100 text-red-800 border-red-200'
    } else if (lowerHowSoon.includes('week') || lowerHowSoon.includes('7') || lowerHowSoon.includes('soon')) {
      return 'bg-orange-100 text-orange-800 border-orange-200'
    } else if (lowerHowSoon.includes('month') || lowerHowSoon.includes('30')) {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }, [])

  const getRowBackground = useCallback(() => {
    // Default style: No background color
    return 'hover:bg-gray-50'
  }, [])

  const getSourceColor = (source: string | null | undefined) => {
    if (!source) return 'text-gray-600 bg-gray-50'
    
    switch (source.toLowerCase()) {
      case 'facebook':
      case 'facebook ads':
        return 'text-blue-600 bg-blue-50'
      case 'google':
      case 'google ads':
        return 'text-green-600 bg-green-50'
      case 'website':
        return 'text-purple-600 bg-purple-50'
      case 'referral':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatSourceDisplay = (source: string | null | undefined) => {
    if (!source) return 'Unknown'

    switch (source.toLowerCase()) {
      case 'facebook':
      case 'facebook ads':
        return 'Facebook'
      case 'google':
      case 'google ads':
        return 'Google'
      case 'website':
        return 'Website'
      case 'referral':
        return 'Referral'
      default:
        return source.charAt(0).toUpperCase() + source.slice(1)
    }
  }

  // Helper function to parse purposes from array-like string
  const parsePurposes = useCallback((purposesText: string | null | undefined): string[] => {
    if (!purposesText) return []

    // Handle array-like strings: ["Appointment", "Meeting"] or ['Appointment', 'Meeting']
    if (purposesText.startsWith('[') && purposesText.endsWith(']')) {
      try {
        // Parse as JSON array
        const parsed = JSON.parse(purposesText)
        if (Array.isArray(parsed)) {
          return parsed.map(item => String(item).trim()).filter(item => item.length > 0)
        }
      } catch (error) {
        // If JSON parsing fails, try manual extraction
        return purposesText
          .slice(1, -1) // Remove brackets
          .split(',') // Split by comma
          .map(item => item.trim().replace(/^["']|["']$/g, '')) // Remove quotes and trim
          .filter(item => item.length > 0)
      }
    }

    // Fallback: split by common delimiters for non-array strings
    return purposesText
      .split(/[,;|\n]/)
      .map(purpose => purpose.trim())
      .filter(purpose => purpose.length > 0)
  }, [])

  // Helper function to get purpose tag styling (same as RecentLeadsTable)
  const getPurposeTagStyle = useCallback((purpose: string) => {
    const lowerPurpose = purpose.toLowerCase()

    // Color coding based on purpose priority/urgency
    if (lowerPurpose.includes('urgent') || lowerPurpose.includes('immediate') || lowerPurpose.includes('asap')) {
      return 'bg-red-100 text-red-800 border-red-200'
    } else if (lowerPurpose.includes('follow') || lowerPurpose.includes('callback') || lowerPurpose.includes('schedule')) {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    } else if (lowerPurpose.includes('quote') || lowerPurpose.includes('estimate') || lowerPurpose.includes('proposal')) {
      return 'bg-green-100 text-green-800 border-green-200'
    } else if (lowerPurpose.includes('info') || lowerPurpose.includes('question') || lowerPurpose.includes('inquiry')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }, [])


  const handleRowClick = (e: React.MouseEvent, leadId: string) => {
    // Allow default behavior for right-clicks, ctrl+clicks, middle clicks, etc.
    if (e.ctrlKey || e.metaKey || e.button === 1 || e.button === 2) {
      return
    }
    
    e.preventDefault()
    setNavigatingId(leadId)
    try {
      navigate(`/${navigationTarget}/${leadId}`)
    } catch (error) {
      setNavigatingId(null)
    }
  }


  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-6">
          <div className="text-red-500 text-sm">Error loading leads: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      {isLoading ? (
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
          </div>
        </div>
      ) : leads && leads.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Step
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => {
                const rowBackground = getRowBackground()
                const leadUrl = buildUrl(`/${navigationTarget}/${lead.lead_id}`)

                return (
                    <tr
                      key={lead.lead_id}
                      onClick={(e) => handleRowClick(e, lead.lead_id)}
                      className={`cursor-pointer transition-all duration-200 ${
                        rowBackground
                      } ${
                        navigatingId === lead.lead_id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                      }`}
                    >
                    {/* Lead Name with Calls Count Circle */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {navigatingId === lead.lead_id ? (
                          <div className="h-8 w-8 rounded-full flex items-center justify-center mr-3">
                            <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                          </div>
                        ) : (
                          <div className="relative h-8 w-8 rounded-full flex items-center justify-center bg-gray-400 text-white text-sm font-medium mr-3">
                            {lead.calls_count || 0}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
                              {getWorkingHoursIcon(lead.working_hours)}
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{truncateService(lead.service)}</span>
                            {lead.how_soon && (
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${getHowSoonTagStyle(lead.how_soon)}`}>
                                {lead.how_soon}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    
                    {/* Source Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSourceColor(lead.source)}`}>
                        {formatSourceDisplay(lead.source)}
                      </span>
                    </td>

                    {/* Date Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(lead.created_at)}
                    </td>
                    
                    {/* Next Step Column with AI Recap Purpose Tags */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">
                          {lead.next_step || 'Not set'}
                        </span>
                        {lead.ai_recap_purposes && (
                          <div className="flex flex-wrap gap-1">
                            {parsePurposes(lead.ai_recap_purposes).map((purpose, index) => (
                              <span
                                key={index}
                                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${getPurposeTagStyle(purpose)}`}
                              >
                                {purpose}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6">
          <div className="text-gray-500 text-center py-8">No leads found for the selected period</div>
        </div>
      )}
    </div>
  )
}

// Export memoized component for performance optimization
export const LeadsTable = memo(LeadsTableComponent)
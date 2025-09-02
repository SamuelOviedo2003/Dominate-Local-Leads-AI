'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, memo, useCallback } from 'react'
import { LeadWithClient } from '@/types/leads'

interface LeadsTableProps {
  leads: LeadWithClient[] | null
  isLoading: boolean
  error: string | null
  navigationTarget?: 'lead-details' | 'property-details'
  usePriorityColors?: boolean
}

function LeadsTableComponent({ leads, isLoading, error, navigationTarget = 'lead-details', usePriorityColors = false }: LeadsTableProps) {
  const router = useRouter()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  const getScoreColor = useCallback((score: number) => {
    if (score <= 33) return 'bg-red-500'
    if (score <= 66) return 'bg-yellow-500'
    return 'bg-green-500'
  }, [])

  const getRowBackground = useCallback((priority: 1 | 2 | 3 | null | undefined) => {
    // Only apply priority colors if usePriorityColors is true
    if (usePriorityColors) {
      if (priority === 1) {
        // High Priority: Reddish background tone
        return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500'
      }
      
      if (priority === 2) {
        // Medium Priority: Yellow background tone  
        return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500'
      }
    }
    
    // Normal Priority or default style: No background color
    return 'hover:bg-gray-50'
  }, [usePriorityColors])

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
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
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


  const handleRowClick = (e: React.MouseEvent, leadId: string) => {
    // Allow default behavior for right-clicks, ctrl+clicks, middle clicks, etc.
    if (e.ctrlKey || e.metaKey || e.button === 1 || e.button === 2) {
      return
    }
    
    e.preventDefault()
    setNavigatingId(leadId)
    try {
      router.push(`/${navigationTarget}/${leadId}`)
    } catch (error) {
      setNavigatingId(null)
    }
  }


  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Leads</h3>
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
        <h3 className="text-lg font-semibold text-gray-900">Recent Leads</h3>
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
                  Communications Count
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
                const rowBackground = getRowBackground(lead.call_now_status)
                const leadUrl = `/${navigationTarget}/${lead.lead_id}`
                
                return (
                  <Link 
                    key={lead.lead_id}
                    href={leadUrl}
                    className="contents"
                  >
                    <tr 
                      onClick={(e) => handleRowClick(e, lead.lead_id)}
                      className={`cursor-pointer transition-all duration-200 ${
                        rowBackground
                      } ${
                        navigatingId === lead.lead_id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                      }`}
                    >
                    {/* Lead Name with Score Circle */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {navigatingId === lead.lead_id ? (
                          <div className="h-8 w-8 rounded-full flex items-center justify-center mr-3">
                            <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                          </div>
                        ) : (
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 ${
                            getScoreColor(lead.score)
                          }`}>
                            {Math.round(lead.score)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {lead.service || ''}
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
                    
                    {/* Communications Count Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">
                        {lead.communications_count || 0}
                      </span>
                    </td>
                    
                    {/* Date Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(lead.created_at)}
                    </td>
                    
                    {/* Next Step Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.next_step || 'Not set'}
                    </td>
                    </tr>
                  </Link>
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
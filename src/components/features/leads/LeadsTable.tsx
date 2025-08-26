'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LeadWithClient } from '@/types/leads'

interface LeadsTableProps {
  leads: LeadWithClient[] | null
  isLoading: boolean
  error: string | null
  navigationTarget?: 'lead-details' | 'property-details'
}

export function LeadsTable({ leads, isLoading, error, navigationTarget = 'lead-details' }: LeadsTableProps) {
  const router = useRouter()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  const getScoreColor = (score: number) => {
    if (score <= 33) return 'bg-red-500'
    if (score <= 66) return 'bg-yellow-500'
    return 'bg-green-500'
  }

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

  const getCallPriorityConfig = (callNowStatus: 1 | 2 | 3 | null | undefined) => {
    if (!callNowStatus || callNowStatus === 3) {
      // Normal priority or no status - subtle gray indicator
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        label: 'Normal',
        icon: '●'
      }
    }
    
    if (callNowStatus === 1) {
      // High priority - distinct red shade (darker than scoring system)
      return {
        bgColor: 'bg-red-600',
        textColor: 'text-white',
        label: 'High Priority',
        icon: '🔥'
      }
    }
    
    if (callNowStatus === 2) {
      // Medium priority - distinct orange (different from scoring system yellow)
      return {
        bgColor: 'bg-orange-500',
        textColor: 'text-white',
        label: 'Medium Priority',
        icon: '⚡'
      }
    }

    // Fallback
    return {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
      label: 'Normal',
      icon: '●'
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

  const handleRowClick = async (leadId: string) => {
    setNavigatingId(leadId)
    try {
      await router.push(`/${navigationTarget}/${leadId}`)
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
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comms
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
              {leads.map((lead) => (
                <tr 
                  key={lead.lead_id}
                  onClick={() => handleRowClick(lead.lead_id)}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors relative ${
                    navigatingId === lead.lead_id ? 'bg-purple-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {navigatingId === lead.lead_id ? (
                        <div className="h-8 w-8 rounded-full flex items-center justify-center mr-3">
                          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
                        </div>
                      ) : (
                        <div 
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 ${getScoreColor(lead.score)}`}
                        >
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const priorityConfig = getCallPriorityConfig(lead.call_now_status)
                      return (
                        <div className="flex items-center">
                          <div 
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.textColor}`}
                            title={priorityConfig.label}
                          >
                            <span className="mr-1">{priorityConfig.icon}</span>
                            <span className="hidden sm:inline">{priorityConfig.label}</span>
                          </div>
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSourceColor(lead.source)}`}>
                      {formatSourceDisplay(lead.source)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">
                      {lead.communications_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(lead.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.next_step || 'Not set'}
                  </td>
                </tr>
              ))}
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
'use client'

import Link from 'next/link'
import { useState, memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Moon } from 'lucide-react'
import { WaitingToCallLead } from '@/types/leads'
import { CallWindowHistoryIcons } from '@/components/ui/CallWindowHistoryIcons'
import { ContextMenu } from '@/components/ui/ContextMenu'

interface WaitingToCallTableProps {
  leads: WaitingToCallLead[] | null
  isLoading: boolean
  error: string | null
  navigationTarget?: 'waiting-to-call-details' | 'lead-details' | 'property-details' | 'actions'
  title?: string
}

function WaitingToCallTableComponent({
  leads,
  isLoading,
  error,
  navigationTarget = 'waiting-to-call-details',
  title = 'Waiting to Call'
}: WaitingToCallTableProps) {
  const router = useRouter()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; leadId: string; businessId: string; permalink: string } | null>(null)

  const truncateService = useCallback((service: string | null | undefined, maxLength: number = 25) => {
    if (!service) return ''
    if (service.length <= maxLength) return service
    return service.substring(0, maxLength) + '...'
  }, [])

  const getWorkingHoursIcon = useCallback((workingHours: boolean | null | undefined) => {
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
        return source
    }
  }

  const handleRowClick = async (e: React.MouseEvent, leadId: string, leadBusinessId: string, leadPermalink: string) => {
    // Prevent navigation if clicking on links or buttons
    const target = e.target as HTMLElement
    if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button')) {
      return
    }

    // Set loading state
    setNavigatingId(leadId)

    // IMPORTANT: For Waiting to Call, we need to preserve the CURRENT business context in the URL
    // while passing the LEAD's business_id as a query parameter for data fetching
    // This prevents the app from switching businesses when clicking leads from different businesses

    // Get current business context from URL
    const pathSegments = window.location.pathname.split('/').filter(Boolean)
    const currentBusinessId = pathSegments[0] // Current business_id from URL
    const currentPermalink = pathSegments[1] // Current permalink from URL

    // Check if we're in "Waiting to Call" mode (navigationTarget is 'waiting-to-call-details')
    const isWaitingToCallMode = navigationTarget === 'waiting-to-call-details'

    if (isWaitingToCallMode && currentBusinessId && currentPermalink) {
      // Stay in the current business context, but pass the lead's actual business_id as query param
      const url = `/${currentBusinessId}/${currentPermalink}/${navigationTarget}/${leadId}?leadBusinessId=${leadBusinessId}`
      router.push(url)
    } else {
      // For other navigation targets (lead-details, property-details, actions), use the lead's business context
      const url = `/${leadBusinessId}/${leadPermalink}/${navigationTarget}/${leadId}`
      router.push(url)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, leadId: string, leadBusinessId: string, leadPermalink: string) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      leadId,
      businessId: leadBusinessId,
      permalink: leadPermalink
    })
  }

  const handleOpenInNewTab = () => {
    if (contextMenu) {
      // Get current business context for Waiting to Call mode
      const pathSegments = window.location.pathname.split('/').filter(Boolean)
      const currentBusinessId = pathSegments[0]
      const currentPermalink = pathSegments[1]
      const isWaitingToCallMode = navigationTarget === 'waiting-to-call-details'

      let leadUrl: string
      if (isWaitingToCallMode && currentBusinessId && currentPermalink) {
        // Preserve current business context with query param
        leadUrl = `/${currentBusinessId}/${currentPermalink}/${navigationTarget}/${contextMenu.leadId}?leadBusinessId=${contextMenu.businessId}`
      } else {
        // Use lead's business context for other modes
        leadUrl = `/${contextMenu.businessId}/${contextMenu.permalink}/${navigationTarget}/${contextMenu.leadId}`
      }

      window.open(leadUrl, '_blank')
      setContextMenu(null)
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
          </div>
        </div>
      </div>
    )
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <pre className="text-gray-400 text-base font-mono select-none pointer-events-none leading-relaxed">
{`+------------------------------+
|                              |
|          NO DATA             |
|                              |
+------------------------------+`}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {/* Timer column - no label */}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => {
                const rowBackground = getRowBackground()
                const permalink = lead.business_permalink || 'unknown'

                return (
                  <tr
                    key={lead.lead_id}
                    onClick={(e) => handleRowClick(e, lead.lead_id, lead.business_id, permalink)}
                    onContextMenu={(e) => handleContextMenu(e, lead.lead_id, lead.business_id, permalink)}
                    className={`cursor-pointer transition-all duration-200 ${rowBackground} ${
                      navigatingId === lead.lead_id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                    }`}
                  >
                    {/* Lead Name */}
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

                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </div>

                          {/* Service and How Soon */}
                          <div className="flex items-center gap-2 mt-1">
                            {lead.service && (
                              <span className="text-xs text-gray-500">
                                {truncateService(lead.service)}
                              </span>
                            )}
                            {lead.how_soon && (
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded border ${getHowSoonTagStyle(
                                  lead.how_soon
                                )}`}
                              >
                                {lead.how_soon}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Business Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.business_name}
                      </div>
                    </td>

                    {/* Source */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded ${getSourceColor(
                          lead.source
                        )}`}
                      >
                        {formatSourceDisplay(lead.source)}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(lead.created_at)}
                    </td>

                    {/* Call Window History Icons */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end">
                        <CallWindowHistoryIcons callWindows={lead.callWindows || []} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onOpenInNewTab={handleOpenInNewTab}
        />
      )}
    </>
  )
}

export const WaitingToCallTable = memo(WaitingToCallTableComponent)

'use client'

import { useRouter } from 'next/navigation'
import { LeadWithClient } from '@/types/leads'

interface LeadsTableProps {
  leads: LeadWithClient[] | null
  isLoading: boolean
  error: string | null
  navigationTarget?: 'lead-details' | 'property-details'
}

export function LeadsTable({ leads, isLoading, error, navigationTarget = 'lead-details' }: LeadsTableProps) {
  const router = useRouter()

  const getScoreColor = (score: number) => {
    if (score <= 33) return 'bg-red-500'
    if (score <= 66) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getHowSoonColor = (howSoon: string) => {
    switch (howSoon.toLowerCase()) {
      case 'asap':
        return 'text-red-600 bg-red-50'
      case 'week':
        return 'text-orange-600 bg-orange-50'
      case 'month':
        return 'text-blue-600 bg-blue-50'
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

  const handleRowClick = (leadId: string) => {
    router.push(`/${navigationTarget}/${leadId}`)
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
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
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
                  How Soon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
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
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 ${getScoreColor(lead.score)}`}
                      >
                        {Math.round(lead.score)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.first_name} {lead.last_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getHowSoonColor(lead.how_soon)}`}>
                      {lead.how_soon}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.service || 'No service specified'}
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
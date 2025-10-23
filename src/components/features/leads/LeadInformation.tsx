'use client'

import React, { useMemo, useCallback, memo } from 'react'
import { Lead, PropertyInfo } from '@/types/leads'
import { LoadingSystem } from '@/components/LoadingSystem'
import { createDialpadUrl, isValidDialpadPhone, createBusinessDialpadUrl } from '@/lib/utils/phoneUtils'
import { formatReceivedTimestamp } from '@/lib/utils/dateFormat'
import { TimezoneBadge } from '@/components/TimezoneIndicator'
import { logTimezoneOperation } from '@/lib/utils/timezoneDebug'

interface LeadInformationProps {
  lead?: Lead | null
  property?: PropertyInfo | null
  isLoading?: boolean
  error?: string | null
  businessTimezone?: string // IANA timezone identifier (e.g., 'America/New_York')
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

const LeadInformationComponent = ({ lead, property, isLoading = false, error = null, businessTimezone = 'UTC' }: LeadInformationProps) => {
  // All hooks must be called before any conditional returns

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

  const sourceIconConfig = useMemo(() => {
    if (!lead?.source) return {
      bgColor: 'bg-gray-500',
      icon: (
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Unknown'
    }

    const source = lead.source.toLowerCase()

    if (source.includes('facebook')) {
      return {
        bgColor: 'bg-blue-600',
        icon: (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        ),
        label: 'Facebook'
      }
    } else if (source.includes('google')) {
      return {
        bgColor: 'bg-red-500',
        icon: (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        ),
        label: 'Google'
      }
    } else if (source.includes('website')) {
      return {
        bgColor: 'bg-purple-600',
        icon: (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
          </svg>
        ),
        label: 'Website'
      }
    } else if (source.includes('referral')) {
      return {
        bgColor: 'bg-green-600',
        icon: (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
        ),
        label: 'Referral'
      }
    } else {
      return {
        bgColor: 'bg-orange-500',
        icon: (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
        ),
        label: getSourceDisplay(lead.source)
      }
    }
  }, [lead, getSourceDisplay])


  const handleQuickAction = useCallback((action: string) => {
    if (!lead) return
    // In a real implementation, this would trigger the appropriate action
    // Quick action logic would be implemented here
    // Example: window.location.href = `tel:${lead.phone}`
  }, [lead])

  // Now handle conditional returns after all hooks are called
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
        <div className="flex items-center justify-center flex-1">
          <LoadingSystem size="md" message="Loading lead information..." />
        </div>
      </div>
    )
  }

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

  if (!lead) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
        <div className="text-center flex-1 flex items-center justify-center">
          <div className="text-gray-500 text-lg font-medium">No lead information available</div>
        </div>
      </div>
    )
  }

  // Now we can safely use the hook results since we know lead exists


  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 h-full flex flex-col overflow-hidden">
      {/* Header Section - Following Reference Image Layout */}
      <div className="p-4 border-b border-gray-100">
        {/* Top Row: Source Icon + Source Name + Lead Name + Homeowner Status + Received Date */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {/* Source Icon */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${sourceIconConfig.bgColor}`}>
              {React.cloneElement(sourceIconConfig.icon as React.ReactElement, {
                className: "w-4 h-4 text-white"
              })}
            </div>

            {/* Source Name */}
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              {sourceIconConfig.label}
            </span>

            {/* Lead Name */}
            <span className="text-lg font-bold text-gray-900">
              {lead.first_name} {lead.last_name}
            </span>

            {/* Homeowner Status Tag */}
            {lead.homeowner !== null && lead.homeowner !== undefined && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                lead.homeowner
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {lead.homeowner ? 'Homeowner' : 'Not Homeowner'}
              </span>
            )}
          </div>

          {/* Received Date (Feature 5 - Format: Fri Oct 3, 3:50PM) - Using Business Timezone */}
          <div className="hidden sm:flex items-center gap-2">
            <p className="text-sm text-gray-500">
              <span className="font-semibold uppercase">RECEIVED</span> {formatReceivedTimestamp(lead.created_at, businessTimezone)}
            </p>
            <TimezoneBadge timezone={businessTimezone} />
          </div>
        </div>

        {/* Second Row: Contact Details */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Phone Number with Verification Checkmark */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{lead.phone}</span>
            <div className="w-4 h-4 rounded-full flex items-center justify-center bg-green-100">
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Email with Verification Text Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{lead.email}</span>
            {lead.email_valid !== null && lead.email_valid !== undefined && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                lead.email_valid
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {lead.email_valid ? 'Verified' : 'Bounced'}
              </span>
            )}
          </div>
        </div>

        {/* Mobile: Show received date (Feature 5 - Format: Fri Oct 3, 3:50PM) - Using Business Timezone */}
        <div className="sm:hidden mt-2 flex items-center gap-2">
          <p className="text-sm text-gray-500">
            <span className="font-semibold uppercase">RECEIVED</span> {formatReceivedTimestamp(lead.created_at, businessTimezone)}
          </p>
          <TimezoneBadge timezone={businessTimezone} />
        </div>
      </div>

      {/* Lead Attributes Section - 4 Column Grid */}
      <div className="p-4 flex-1">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-min">
          {/* Service */}
          {lead.service && (
            <div className="rounded-lg bg-gray-50 p-3">
              <span className="text-xs text-gray-500">Service</span>
              <p className="font-medium text-gray-900 text-sm">{lead.service}</p>
            </div>
          )}

          {/* How Soon */}
          {lead.how_soon && (
            <div className="rounded-lg bg-gray-50 p-3">
              <span className="text-xs text-gray-500">How Soon</span>
              <p className="font-medium text-gray-900 text-sm">{lead.how_soon}</p>
            </div>
          )}

          {/* Payment Type */}
          {lead.payment_type && (
            <div className="rounded-lg bg-gray-50 p-3">
              <span className="text-xs text-gray-500">Payment</span>
              <p className="font-medium text-gray-900 text-sm">{lead.payment_type}</p>
            </div>
          )}

          {/* Roof Age - only if not null */}
          {lead.roof_age && (
            <div className="rounded-lg bg-gray-50 p-3">
              <span className="text-xs text-gray-500">Roof Age</span>
              <p className="font-medium text-gray-900 text-sm">{lead.roof_age}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const LeadInformation = memo(LeadInformationComponent)
'use client'

import { useState } from 'react'
import { DollarSign, ChevronDown, ChevronRight } from 'lucide-react'
import { EnhancedDashboardMetrics, TimePeriod } from '@/types/leads'

interface PlatformSpendCardProps {
  platformSpendMetrics: EnhancedDashboardMetrics
  timePeriod: TimePeriod
}

export function PlatformSpendCard({ platformSpendMetrics, timePeriod }: PlatformSpendCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const hasPlatformBreakdown = platformSpendMetrics.platformSpends && 
    platformSpendMetrics.platformSpends.length > 0
  
  const hasMultiplePlatforms = platformSpendMetrics.platformSpends && 
    platformSpendMetrics.platformSpends.length > 1

  // Format currency value
  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <DollarSign className="w-8 h-8 text-purple-600" />
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">Platform Spend</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(platformSpendMetrics.totalSpend)}
              </p>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                last {timePeriod} days
              </span>
            </div>
          </div>
        </div>
        
        {/* Expand/Collapse Button - Only show if there are multiple platforms */}
        {hasMultiplePlatforms && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
            aria-label={isExpanded ? 'Collapse platform breakdown' : 'Expand platform breakdown'}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Platform Breakdown - For multiple platforms */}
      {hasPlatformBreakdown && hasMultiplePlatforms && (
        <div className={`mt-4 transition-all duration-200 ease-in-out ${
          isExpanded ? 'opacity-100' : 'opacity-0 max-h-0 overflow-hidden'
        }`}>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
              Platform Breakdown
            </p>
            <div className="space-y-3">
              {platformSpendMetrics.platformSpends.map((platform, index) => (
                <div 
                  key={`${platform.platform}-${index}`}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-700">
                      {platform.platform}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(platform.spend)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Single Platform Display - Show immediately if only one platform */}
      {hasPlatformBreakdown && !hasMultiplePlatforms && platformSpendMetrics.platformSpends?.[0] && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Platform Breakdown
          </p>
          <div className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-purple-700">
                {platformSpendMetrics.platformSpends[0].platform}
              </span>
            </div>
            <span className="text-sm font-semibold text-purple-900">
              {formatCurrency(platformSpendMetrics.platformSpends[0].spend)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
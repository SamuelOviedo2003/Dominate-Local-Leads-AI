'use client'

import { EnhancedDashboardMetrics, TimePeriod } from '@/types/leads'

interface PlatformSpendCardProps {
  platformSpendMetrics: EnhancedDashboardMetrics
  timePeriod: TimePeriod
}

export function PlatformSpendCard({ platformSpendMetrics, timePeriod }: PlatformSpendCardProps) {
  const hasPlatformBreakdown = platformSpendMetrics.platformSpends &&
    platformSpendMetrics.platformSpends.length > 0

  // Calculate total spend from all platforms
  const totalSpend = platformSpendMetrics.platformSpends?.reduce((sum, platform) => sum + platform.spend, 0) || 0

  // Format currency value without cents for cleaner display
  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  // Platform icon components
  const getPlatformIcon = (platformName: string) => {
    const platform = platformName.toLowerCase()

    if (platform.includes('facebook') || platform.includes('meta')) {
      return (
        <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center">
          <svg aria-hidden="true" className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path clipRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" fillRule="evenodd"></path>
          </svg>
        </div>
      )
    }

    if (platform.includes('google')) {
      return (
        <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center border border-gray-200">
          <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </div>
      )
    }

    // Default icon for other platforms
    return (
      <div className="bg-gray-500 rounded-full w-12 h-12 flex items-center justify-center">
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    )
  }

  if (!hasPlatformBreakdown) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">No platform data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Breakdown</h3>

      {/* Total Spend Summary */}
      <div className="mb-6 p-4 text-center">
        <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
        <p className="text-sm text-gray-600 mt-1">Total platform spend</p>
      </div>

      {/* Individual Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platformSpendMetrics.platformSpends.map((platform, index) => (
          <div
            key={`${platform.platform}-${index}`}
            className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors flex items-center p-4"
          >
            <div className="flex items-center gap-4 flex-shrink-0">
              {getPlatformIcon(platform.platform)}
              <span className="text-gray-900 font-semibold text-lg">
                {platform.platform}
              </span>
            </div>
            <div className="ml-auto text-right">
              <p className="text-gray-600 text-xs font-medium uppercase tracking-wider">
                Spend
              </p>
              <p className="text-gray-900 font-bold text-2xl tracking-tighter">
                {formatCurrency(platform.spend)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
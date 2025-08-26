'use client'

import { CallWindow } from '@/types/leads'
import { useMemo, useCallback, memo } from 'react'
import { Clock, Phone } from 'lucide-react'
import { LoadingSystem } from '@/components/LoadingSystem'

interface CallWindowsProps {
  callWindows?: CallWindow[] | null
  isLoading?: boolean
  error?: string | null
}

const CallWindowsComponent = ({ callWindows, isLoading = false, error = null }: CallWindowsProps) => {
  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Windows</h3>
        <div className="flex items-center justify-center flex-1">
          <LoadingSystem size="md" message="Loading call windows..." />
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Windows</h3>
        <div className="text-center flex-1 flex items-center justify-center">
          <div>
            <div className="text-red-500 text-lg font-medium mb-2">Error Loading Call Windows</div>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }, [])

  const getMedalIcon = useCallback((medalTier: 'gold' | 'silver' | 'bronze' | null) => {
    switch (medalTier) {
      case 'gold':
        return <span className="text-2xl" title="Gold Medal - Response time < 1 minute">🥇</span>
      case 'silver':
        return <span className="text-2xl" title="Silver Medal - Response time 1-2 minutes">🥈</span>
      case 'bronze':
        return <span className="text-2xl" title="Bronze Medal - Response time 2-5 minutes">🥉</span>
      default:
        return null
    }
  }, [])

  // Sort call windows by call number - only show actual calls, no placeholders
  const sortedCallWindows = useMemo(() => {
    if (!callWindows) return []
    
    return [...callWindows].sort((a, b) => a.callNumber - b.callNumber)
  }, [callWindows])


  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Windows</h3>
      
      <div className="overflow-y-auto space-y-3 pr-2 flex-1">
        {sortedCallWindows.map((window) => {
          const isCall1 = window.callNumber === 1
          const isNoCaller = !window.calledAt && (window.status === 'No call' || !window.status)
          
          return (
            <div 
              key={window.callNumber} 
              className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200"
            >
              {/* Call Number with Medal and Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
                    {window.callNumber}
                  </div>
                  
                  {/* Medal for Call 1 - only show when in response time mode (working_hours = true) */}
                  {isCall1 && window.medalTier && window.responseTime !== undefined && (
                    <div className="flex items-center">
                      {getMedalIcon(window.medalTier)}
                    </div>
                  )}
                </div>
                
                {/* Main Content */}
                <div className="flex-1 text-right">
                  {isCall1 ? (
                    /* Call 1 - Conditional display based on working_hours */
                    window.responseTime !== undefined ? (
                      /* working_hours = true: Show response time */
                      <div className="text-lg font-semibold text-purple-600">
                        {window.responseTime || 'Not called'}
                      </div>
                    ) : (
                      /* working_hours = false: Show timestamp like other calls */
                      <div className="text-sm">
                        {window.calledAt ? (
                          <div className="text-green-700 font-medium">
                            {formatTime(window.calledAt)}
                          </div>
                        ) : (
                          <span className="text-gray-500">
                            Not called
                          </span>
                        )}
                      </div>
                    )
                  ) : (
                    /* Calls 2-6 - Show timestamp or "Not called" */
                    <div className="text-sm">
                      {window.calledAt ? (
                        <div className="text-green-700 font-medium">
                          {formatTime(window.calledAt)}
                        </div>
                      ) : (
                        <span className="text-gray-500">
                          Not called
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(!callWindows || callWindows.length === 0) && (
        <div className="bg-gray-50 rounded-lg p-4 text-center flex-1 flex flex-col items-center justify-center">
          <div className="text-gray-400 mb-2">
            <Clock className="w-8 h-8 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">No call windows scheduled</p>
          <p className="text-gray-400 text-xs mt-1">Call windows will appear when created</p>
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const CallWindows = memo(CallWindowsComponent)
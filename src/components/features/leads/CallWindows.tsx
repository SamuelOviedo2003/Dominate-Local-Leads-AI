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
    <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Windows</h3>
      
      <div className="overflow-y-auto space-y-4 pr-2" style={{ height: '480px', maxHeight: '480px' }}>
        {sortedCallWindows.map((window) => {
          const isCall1 = window.callNumber === 1
          const isNoCaller = !window.calledAt && (window.status === 'No call' || !window.status)
          
          return (
            <div 
              key={window.callNumber} 
              className="bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 min-h-[200px]"
            >
              {/* Call Number Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center text-lg font-bold">
                    {window.callNumber}
                  </div>
                  <div className="text-xl font-semibold text-gray-900">
                    Call {window.callNumber}
                  </div>
                </div>
                
                {/* Medal for Call 1 */}
                {isCall1 && window.medalTier && (
                  <div className="flex items-center space-x-2">
                    {getMedalIcon(window.medalTier)}
                  </div>
                )}
              </div>

              {/* Call Content */}
              <div className="space-y-6">
                {isCall1 ? (
                  /* Call 1 - Show response time */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Response Time
                      </div>
                      <div className="text-lg font-medium text-gray-900">
                        {window.responseTime || 'N/A'}
                      </div>
                    </div>
                    {window.calledAt && (
                      <div>
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Called At
                        </div>
                        <div className="text-lg font-medium text-gray-900">
                          {formatTime(window.calledAt)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Calls 2-6 - Show call status */
                  <div>
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Call Status
                    </div>
                    <div className="text-lg font-medium">
                      {window.calledAt ? (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-5 h-5 text-green-500" />
                          <div>
                            <div className="text-green-700 font-medium">Called</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {formatTime(window.calledAt)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-600">
                            {window.status === 'No call' || isNoCaller ? 'No call' : 'Pending'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {(!callWindows || callWindows.length === 0) && (
        <div className="bg-gray-50 rounded-lg p-6 text-center mt-4">
          <div className="text-gray-400 mb-2">
            <Clock className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">No call windows scheduled for this lead</p>
          <p className="text-gray-400 text-xs mt-1">Call windows will appear here when they are created</p>
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const CallWindows = memo(CallWindowsComponent)
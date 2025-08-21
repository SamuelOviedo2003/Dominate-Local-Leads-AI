'use client'

import { CallWindow } from '@/types/leads'
import { useMemo, useCallback, memo } from 'react'

interface CallWindowsProps {
  callWindows?: CallWindow[]
}

const CallWindowsComponent = ({ callWindows }: CallWindowsProps) => {
  const formatCallWindowDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Windows</h3>
      {callWindows && callWindows.length > 0 ? (
        <div className="space-y-3">
          {callWindows.map((window, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Window Start
                  </div>
                  <div className="text-gray-900 font-medium text-sm">
                    {formatCallWindowDate(window.window_start_at)}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Window End
                  </div>
                  <div className="text-gray-900 font-medium text-sm">
                    {formatCallWindowDate(window.window_end_at)}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Call Status
                  </div>
                  <div className="text-gray-900 font-medium text-sm">
                    {window.called_at ? (
                      <span className="inline-flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Called at {formatCallWindowDate(window.called_at)}
                      </span>
                    ) : window.called_out ? (
                      <span className="inline-flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Called out at {formatCallWindowDate(window.called_out)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        Not called yet
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
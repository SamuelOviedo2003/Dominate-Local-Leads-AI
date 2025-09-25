'use client'

import { memo } from 'react'
import { CallWindow } from '@/types/leads'

interface CallWindowHistoryIconsProps {
  callWindows?: CallWindow[] | null
  className?: string
}

/**
 * Mini Call Window History Icons Component
 * Displays up to 6 call window icons in a 2-column, 3-row grid
 * Shows all non-null status call windows for quick lead interaction history
 */
const CallWindowHistoryIconsComponent = ({ callWindows, className = '' }: CallWindowHistoryIconsProps) => {
  // Filter and prepare call windows data
  const validCallWindows = (callWindows || [])
    .filter(cw => cw.status !== null && cw.status !== undefined)
    .slice(0, 6) // Maximum of 6 icons
    .sort((a, b) => a.callNumber - b.callNumber) // Sort by call number

  // Get color scheme based on status (consistent with other components)
  const getStatusColor = (status: number): string => {
    switch (status) {
      case 1: // Green - Done on time
        return 'bg-green-500'
      case 2: // Orange - Done late
        return 'bg-orange-500'
      case 3: // Yellow - Due
        return 'bg-yellow-500'
      case 4: // Red - Missed
        return 'bg-red-500'
      case 10: // Diamond
        return 'bg-gradient-to-br from-blue-100 to-indigo-200'
      case 11: // Gold
        return 'bg-gradient-to-br from-yellow-400 to-yellow-600'
      case 12: // Silver
        return 'bg-gradient-to-br from-gray-400 to-gray-600'
      case 13: // Bronze (Copper tone)
        return 'bg-gradient-to-br from-orange-600 to-red-800'
      default:
        return 'bg-gray-400'
    }
  }

  // Get text color based on status
  const getTextColor = (status: number): string => {
    switch (status) {
      case 10: // Diamond - needs dark text
        return 'text-blue-900'
      default:
        return 'text-white'
    }
  }

  // If no valid call windows, return empty div
  if (validCallWindows.length === 0) {
    return <div className={`w-12 ${className}`} /> // Placeholder to maintain layout
  }

  // Create grid with up to 6 slots (2 columns, 3 rows)
  const gridSlots = Array.from({ length: 6 }, (_, index) => {
    const callWindow = validCallWindows[index]
    return callWindow || null
  })

  return (
    <div className={`inline-flex flex-col gap-0.5 w-12 ${className}`}>
      {/* Grid: 2 columns, up to 3 rows */}
      <div className="grid grid-cols-2 gap-0.5">
        {gridSlots.map((callWindow, index) => (
          <div
            key={index}
            className={`
              w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold leading-none
              ${callWindow
                ? `${getStatusColor(callWindow.status!)} ${getTextColor(callWindow.status!)} shadow-sm`
                : 'bg-transparent'
              }
            `}
            title={callWindow ? `Call ${callWindow.callNumber} - Status ${callWindow.status}` : undefined}
          >
            {callWindow && (
              <>
                {callWindow.callNumber}
                {/* Diamond sparkle effect for status 10 */}
                {callWindow.status === 10 && (
                  <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse opacity-60" />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export const CallWindowHistoryIcons = memo(CallWindowHistoryIconsComponent)
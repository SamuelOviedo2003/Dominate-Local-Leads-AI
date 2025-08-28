'use client'

import { useEffect, useRef } from 'react'
import { CallerTypeDistribution } from '@/types/leads'

interface HoverCallerTypePopupProps {
  source: string
  data: CallerTypeDistribution[] | null
  isLoading: boolean
  position: { x: number; y: number }
  onClose: () => void
}

export function HoverCallerTypePopup({ 
  source, 
  data, 
  isLoading, 
  position, 
  onClose 
}: HoverCallerTypePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position to avoid clipping
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 280), // 280px is popup width + some margin
    y: Math.max(position.y - 10, 10) // Offset slightly above cursor, min 10px from top
  }

  const colors = ['bg-indigo-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500']

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64 transform transition-all duration-200 ease-out animate-in fade-in slide-in-from-bottom-2"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {/* Header */}
      <div className="mb-3 pb-2 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900 truncate">
          Caller Types for "{source}"
        </h4>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <span className="ml-2 text-xs text-gray-500">Loading...</span>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500">No caller type data available</p>
          </div>
        ) : (
          <>
            {data.slice(0, 5).map((item, index) => {
              const maxValue = Math.max(...data.map(d => d.count))
              const percentage = (item.count / maxValue) * 100
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700 truncate max-w-32">
                      {item.caller_type}
                    </span>
                    <span className="text-xs text-gray-600 ml-2">
                      {item.count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${colors[index % colors.length]} transition-all duration-300`}
                      style={{ width: `${Math.max(percentage, 8)}%` }}
                    />
                  </div>
                </div>
              )
            })}
            
            {data.length > 5 && (
              <div className="text-center pt-1">
                <span className="text-xs text-gray-400">
                  +{data.length - 5} more
                </span>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}
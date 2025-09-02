'use client'

import { CallWindow } from '@/types/leads'
import { memo } from 'react'
import { PremiumMetallicCard } from './PremiumMetallicCard'
import { Crown, Award, Medal, Phone, PhoneCall, PhoneOutgoing, Gem, X } from 'lucide-react'

interface MetallicTierCardProps {
  window: CallWindow
  formatTime: (dateString: string) => string
}

const MetallicTierCardComponent = ({ window, formatTime }: MetallicTierCardProps) => {
  const isCall1 = window.callNumber === 1

  // Determine if we should use the premium metallic card
  const shouldUsePremiumCard = window.medalTier && isCall1 && window.responseTime !== undefined
  
  // New logic for Call 1 color coding
  const getCall1ColorScheme = () => {
    if (window.calledAt) {
      // Called: Blue color scheme
      return 'blue'
    } else if (window.calledOut) {
      // Called out but not answered: Blue color scheme
      return 'blue'
    } else {
      // Not called: Red color scheme
      return 'red'
    }
  }
  
  // Get the appropriate icon for Call 1
  const getCall1Icon = () => {
    if (window.calledAt) {
      return <PhoneCall className="w-2.5 h-2.5 text-green-600" />
    } else {
      return <X className="w-2.5 h-2.5 text-red-600" />
    }
  }
  
  const cardContent = (
    <div className="flex items-center justify-between">
      {/* Call Number Circle with Enhanced Call Context */}
      <div className="flex items-center gap-2">
        <div className={`
          w-12 h-12 rounded-full text-white flex items-center justify-center relative
          shadow-lg ring-2
          ${shouldUsePremiumCard 
            ? getCircleStyles(window.medalTier as 'diamond' | 'gold' | 'silver' | 'bronze')
            : isCall1
              ? (getCall1ColorScheme() === 'blue' 
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-500/40 ring-blue-300/50'
                  : 'bg-gradient-to-br from-red-600 to-red-700 shadow-red-500/40 ring-red-300/50')
              : window.calledAt 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-500/40 ring-blue-300/50'
                : 'bg-gradient-to-br from-red-600 to-red-700 shadow-red-500/40 ring-red-300/50'
          }
        `}>
          <div className="flex flex-col items-center justify-center relative z-10 gap-0">
            {shouldUsePremiumCard ? (
              /* Premium Tier: Icon + Call Label */
              <>
                {getTierIcon(window.medalTier as 'diamond' | 'gold' | 'silver' | 'bronze')}
                <span className="text-[9px] font-semibold leading-none">
                  Call {window.callNumber}
                </span>
              </>
            ) : (
              /* Standard: Complete Call Label */
              <div className="flex flex-col items-center justify-center">
                <span className="text-[9px] font-semibold leading-none">Call</span>
                <span className="text-sm font-bold leading-none">
                  {window.callNumber}
                </span>
              </div>
            )}
          </div>
          
          {/* Call Status Indicator */}
          {!shouldUsePremiumCard && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
              {isCall1 ? getCall1Icon() : (
                window.calledAt ? (
                  <PhoneCall className="w-2.5 h-2.5 text-green-600" />
                ) : (
                  <X className="w-2.5 h-2.5 text-red-600" />
                )
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Response Time or Status with Call Context */}
      <div className="text-right">
        <div className={`text-sm font-bold ${
          shouldUsePremiumCard 
            ? getTextColor(window.medalTier as 'diamond' | 'gold' | 'silver' | 'bronze')
            : 'text-gray-700'
        }`}>
          {(() => {
            if (isCall1 && window.responseTime !== undefined) {
              return window.responseTime || 'No response'
            } else if (isCall1 && !window.calledAt && window.calledOut) {
              return formatTime(window.calledOut)
            } else if (window.calledAt) {
              return formatTime(window.calledAt)
            } else {
              return 'Not called'
            }
          })()} 
        </div>
        {/* New Label System */}
        {(() => {
          // Determine label text and color based on new requirements
          let labelText = ''
          let labelColor = ''
          
          if (isCall1) {
            if (window.responseTime) {
              // Call 1 with response time - show "In time" 
              labelText = 'In time'
              labelColor = 'text-green-600'
            } else if (window.calledOut && !window.calledAt) {
              // Call 1 with called_out but no called_at - show "Not in time"
              labelText = 'Not in time'
              labelColor = 'text-red-600'
            } else if (!window.calledAt) {
              // Call 1 not called - NO additional label (only existing bold black text)
              labelText = ''
              labelColor = ''
            } else {
              // Call 1 with called_at - show "In time"
              labelText = 'In time'
              labelColor = 'text-green-600'
            }
          } else {
            // Other calls
            if (window.calledAt) {
              labelText = 'In time'
              labelColor = 'text-green-600'
            } else {
              // Not called - NO additional label (only existing bold black text)
              labelText = ''
              labelColor = ''
            }
          }
          
          // Only render label if there's text to show
          if (labelText) {
            return (
              <div className={`text-xs mt-1 flex justify-end ${labelColor}`}>
                {labelText}
              </div>
            )
          }
          
          return null
        })()}
      </div>
    </div>
  )

  return shouldUsePremiumCard ? (
    <PremiumMetallicCard 
      type={window.medalTier as 'diamond' | 'gold' | 'silver' | 'bronze'}
      className="transition-all duration-300"
    >
      {cardContent}
    </PremiumMetallicCard>
  ) : (
    <div className={`
      rounded-xl p-3 transition-all duration-300 transform hover:-translate-y-1
      ${isCall1
        ? (getCall1ColorScheme() === 'blue'
            ? 'bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-200/50 hover:border-blue-300/70 shadow-sm hover:shadow-md hover:shadow-blue-200/20'
            : 'bg-gradient-to-br from-white to-red-50/30 border-2 border-red-200/50 hover:border-red-300/70 shadow-sm hover:shadow-md hover:shadow-red-200/20')
        : window.calledAt
          ? 'bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-200/50 hover:border-blue-300/70 shadow-sm hover:shadow-md hover:shadow-blue-200/20'
          : 'bg-gradient-to-br from-white to-red-50/30 border-2 border-red-200/50 hover:border-red-300/70 shadow-sm hover:shadow-md hover:shadow-red-200/20'
      }
      relative overflow-hidden
    `}>
      {/* Subtle call-themed background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className={`absolute top-2 right-2 w-4 h-4 border-2 rounded-full ${
          isCall1 
            ? (getCall1ColorScheme() === 'blue' ? 'border-blue-300' : 'border-red-300')
            : window.calledAt ? 'border-blue-300' : 'border-red-300'
        }`} />
        <div className={`absolute bottom-2 left-2 w-3 h-3 border rounded-full ${
          isCall1 
            ? (getCall1ColorScheme() === 'blue' ? 'border-blue-200' : 'border-red-200')
            : window.calledAt ? 'border-blue-200' : 'border-red-200'
        }`} />
      </div>
      <div className="relative z-10">
        {cardContent}
      </div>
    </div>
  )
}

// Helper function to get tier icon
const getTierIcon = (tier: 'diamond' | 'gold' | 'silver' | 'bronze') => {
  switch (tier) {
    case 'diamond':
      return <Gem className="w-3 h-3 text-white" />
    case 'gold':
      return <Crown className="w-3 h-3 text-white" />
    case 'silver':
      return <Award className="w-3 h-3 text-white" />
    case 'bronze':
      return <Medal className="w-3 h-3 text-white" />
    default:
      return null
  }
}

// Helper functions for styling
const getCircleStyles = (tier: 'diamond' | 'gold' | 'silver' | 'bronze') => {
  switch (tier) {
    case 'diamond':
      return 'bg-gradient-to-br from-slate-300 via-blue-300 to-slate-400 shadow-blue-400/50 ring-blue-200/60 after:absolute after:inset-0 after:rounded-full after:bg-gradient-to-t after:from-black/20 after:to-white/40'
    case 'gold':
      return 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 shadow-yellow-500/40 ring-yellow-300/50 after:absolute after:inset-0 after:rounded-full after:bg-gradient-to-t after:from-black/20 after:to-white/30'
    case 'silver':
      return 'bg-gradient-to-br from-slate-400 via-gray-500 to-slate-600 shadow-slate-500/40 ring-slate-300/50 after:absolute after:inset-0 after:rounded-full after:bg-gradient-to-t after:from-black/20 after:to-white/30'
    case 'bronze':
      return 'bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 shadow-amber-600/40 ring-amber-400/50 after:absolute after:inset-0 after:rounded-full after:bg-gradient-to-t after:from-black/20 after:to-white/30'
    default:
      return 'bg-purple-600 shadow-purple-500/40 ring-purple-300/50'
  }
}

const getTextColor = (tier: 'diamond' | 'gold' | 'silver' | 'bronze') => {
  switch (tier) {
    case 'diamond':
      return 'text-slate-600'
    case 'gold':
      return 'text-yellow-700'
    case 'silver':
      return 'text-slate-700'
    case 'bronze':
      return 'text-amber-700'
    default:
      return 'text-gray-700'
  }
}

export const MetallicTierCard = memo(MetallicTierCardComponent)
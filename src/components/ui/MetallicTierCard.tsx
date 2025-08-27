'use client'

import { CallWindow } from '@/types/leads'
import { memo } from 'react'
import { PremiumMetallicCard } from './PremiumMetallicCard'
import { Crown, Award, Medal, Phone, PhoneCall, PhoneOutgoing } from 'lucide-react'

interface MetallicTierCardProps {
  window: CallWindow
  formatTime: (dateString: string) => string
}

const MetallicTierCardComponent = ({ window, formatTime }: MetallicTierCardProps) => {
  const isCall1 = window.callNumber === 1

  // Determine if we should use the premium metallic card
  const shouldUsePremiumCard = window.medalTier && isCall1 && window.responseTime !== undefined
  
  const cardContent = (
    <div className="flex items-center justify-between">
      {/* Call Number Circle with Enhanced Call Context */}
      <div className="flex items-center gap-3">
        <div className={`
          w-16 h-16 rounded-full text-white flex items-center justify-center relative
          shadow-lg ring-2
          ${shouldUsePremiumCard 
            ? getCircleStyles(window.medalTier as 'gold' | 'silver' | 'bronze')
            : 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-500/40 ring-blue-300/50'
          }
        `}>
          <div className="flex flex-col items-center justify-center relative z-10 gap-0.5">
            {shouldUsePremiumCard ? (
              /* Premium Tier: Icon + Call Label */
              <>
                {getTierIcon(window.medalTier as 'gold' | 'silver' | 'bronze')}
                <span className="text-xs font-bold leading-none">
                  Call {window.callNumber}
                </span>
              </>
            ) : (
              /* Standard: Complete Call Label */
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs font-medium leading-none">Call</span>
                <span className="text-lg font-bold leading-none">
                  {window.callNumber}
                </span>
              </div>
            )}
          </div>
          
          {/* Call Status Indicator */}
          {!shouldUsePremiumCard && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
              {window.calledAt ? (
                <PhoneCall className="w-2.5 h-2.5 text-green-600" />
              ) : (
                <Phone className="w-2.5 h-2.5 text-gray-400" />
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Response Time or Status with Call Context */}
      <div className="text-right">
        <div className={`text-2xl font-bold ${
          shouldUsePremiumCard 
            ? getTextColor(window.medalTier as 'gold' | 'silver' | 'bronze')
            : 'text-gray-700'
        }`}>
          {isCall1 && window.responseTime !== undefined 
            ? (window.responseTime || 'No response')
            : window.calledAt 
              ? formatTime(window.calledAt)
              : 'Not called'
          }
        </div>
        {/* Response Time Label for Call 1 */}
        {isCall1 && window.responseTime && (
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
            <Phone className="w-3 h-3" />
            Response Time
          </div>
        )}
        {/* Call Time Label for other calls */}
        {!isCall1 && window.calledAt && (
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
            <PhoneCall className="w-3 h-3" />
            Call Time
          </div>
        )}
      </div>
    </div>
  )

  return shouldUsePremiumCard ? (
    <PremiumMetallicCard 
      type={window.medalTier as 'gold' | 'silver' | 'bronze'}
      className="transition-all duration-300"
    >
      {cardContent}
    </PremiumMetallicCard>
  ) : (
    <div className="
      rounded-xl p-5 transition-all duration-300 transform hover:-translate-y-1
      bg-gradient-to-br from-white to-blue-50/30
      border-2 border-blue-200/50 hover:border-blue-300/70
      shadow-sm hover:shadow-md hover:shadow-blue-200/20
      relative overflow-hidden
    ">
      {/* Subtle call-themed background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-2 right-2 w-4 h-4 border-2 border-blue-300 rounded-full" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border border-blue-200 rounded-full" />
      </div>
      <div className="relative z-10">
        {cardContent}
      </div>
    </div>
  )
}

// Helper function to get tier icon
const getTierIcon = (tier: 'gold' | 'silver' | 'bronze') => {
  switch (tier) {
    case 'gold':
      return <Crown className="w-4 h-4 text-white" />
    case 'silver':
      return <Award className="w-4 h-4 text-white" />
    case 'bronze':
      return <Medal className="w-4 h-4 text-white" />
    default:
      return null
  }
}

// Helper functions for styling
const getCircleStyles = (tier: 'gold' | 'silver' | 'bronze') => {
  switch (tier) {
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

const getTextColor = (tier: 'gold' | 'silver' | 'bronze') => {
  switch (tier) {
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
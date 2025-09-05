'use client'

import { memo } from 'react'
import { Crown, Award, Medal, Gem } from 'lucide-react'

interface CallWindowLogoProps {
  callNumber: number
  medalTier?: 'diamond' | 'gold' | 'silver' | 'bronze' | null
  isSpecialTier?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const CallWindowLogoComponent = ({ 
  callNumber, 
  medalTier, 
  isSpecialTier = false,
  size = 'md',
  className = '' 
}: CallWindowLogoProps) => {
  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-8 h-8',
      icon: 'w-2 h-2',
      textLarge: 'text-xs',
      textSmall: 'text-[8px]'
    },
    md: {
      container: 'w-10 h-10',
      icon: 'w-2.5 h-2.5',
      textLarge: 'text-sm',
      textSmall: 'text-[9px]'
    },
    lg: {
      container: 'w-12 h-12',
      icon: 'w-3 h-3',
      textLarge: 'text-base',
      textSmall: 'text-[10px]'
    }
  }

  const config = sizeConfig[size]

  // Helper function to get tier icon
  const getTierIcon = (tier: 'diamond' | 'gold' | 'silver' | 'bronze') => {
    const iconClass = `${config.icon} text-white`
    switch (tier) {
      case 'diamond':
        return <Gem className={iconClass} />
      case 'gold':
        return <Crown className={iconClass} />
      case 'silver':
        return <Award className={iconClass} />
      case 'bronze':
        return <Medal className={iconClass} />
      default:
        return null
    }
  }

  // Helper function for tier-specific styling
  const getTierStyles = (tier: 'diamond' | 'gold' | 'silver' | 'bronze') => {
    switch (tier) {
      case 'diamond':
        return 'bg-gradient-to-br from-slate-300 via-blue-300 to-slate-400 shadow-blue-400/50 ring-blue-200/60'
      case 'gold':
        return 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 shadow-yellow-500/40 ring-yellow-300/50'
      case 'silver':
        return 'bg-gradient-to-br from-slate-400 via-gray-500 to-slate-600 shadow-slate-500/40 ring-slate-300/50'
      case 'bronze':
        return 'bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 shadow-amber-600/40 ring-amber-400/50'
      default:
        return 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-500/40 ring-blue-300/50'
    }
  }

  const containerStyles = isSpecialTier && medalTier
    ? getTierStyles(medalTier)
    : 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-500/40 ring-blue-300/50'

  return (
    <div className={`
      ${config.container} rounded-full text-white flex items-center justify-center relative
      shadow-lg ring-2 ${containerStyles} ${className}
    `}>
      <div className="flex flex-col items-center justify-center relative z-10 gap-0">
        {isSpecialTier && medalTier ? (
          // Special tier: Icon + Call Label
          <>
            {getTierIcon(medalTier)}
            <span className={`${config.textSmall} font-semibold leading-none`}>
              Call {callNumber}
            </span>
          </>
        ) : (
          // Standard: Call number
          <div className="flex flex-col items-center justify-center">
            <span className={`${config.textSmall} font-semibold leading-none`}>Call</span>
            <span className={`${config.textLarge} font-bold leading-none`}>
              {callNumber}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export const CallWindowLogo = memo(CallWindowLogoComponent)
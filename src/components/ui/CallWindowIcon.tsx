'use client'

import { memo } from 'react'

interface CallWindowIconProps {
  callNumber: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  status?: number | null // Numeric status for styling (1=Green, 2=Orange, 3=Yellow, 4=Red, 10=Diamond, 11=Gold, 12=Silver, 13=Bronze)
}

const CallWindowIconComponent = ({ callNumber, size = 'sm', className = '', status = null }: CallWindowIconProps) => {
  // Get size-based dimensions
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-7 h-7',
          text: 'text-[8px]',
          numberText: 'text-xs'
        }
      case 'md':
        return {
          container: 'w-10 h-10',
          text: 'text-[10px]',
          numberText: 'text-sm'
        }
      case 'lg':
        return {
          container: 'w-12 h-12',
          text: 'text-[9px]',
          numberText: 'text-sm'
        }
      default:
        return {
          container: 'w-7 h-7',
          text: 'text-[8px]',
          numberText: 'text-xs'
        }
    }
  }

  const sizeStyles = getSizeStyles()

  // Dynamic color scheme based on numeric Call Window status - optimized for database consistency
  const getColorScheme = () => {
    if (!status) {
      // Default blue scheme when no status provided (fallback only)
      return {
        background: 'bg-gradient-to-br from-blue-600 to-blue-700',
        ring: 'ring-blue-300/50',
        shadow: 'shadow-blue-500/40',
        textColor: 'text-white',
        showIndicator: false
      }
    }

    // Handle numeric status mapping (consistent with database values)
    switch (status) {
      case 1: // Green - Done on time
        return {
          background: 'bg-green-500',
          ring: 'ring-green-300/50',
          shadow: 'shadow-green-500/40',
          textColor: 'text-white',
          showIndicator: false
        }
      case 2: // Orange - Done late
        return {
          background: 'bg-orange-500',
          ring: 'ring-orange-300/50',
          shadow: 'shadow-orange-500/40',
          textColor: 'text-white',
          showIndicator: false
        }
      case 3: // Yellow - Due
        return {
          background: 'bg-yellow-500',
          ring: 'ring-yellow-300/50',
          shadow: 'shadow-yellow-500/40',
          textColor: 'text-white',
          showIndicator: false
        }
      case 4: // Red - Missed
        return {
          background: 'bg-red-500',
          ring: 'ring-red-300/50',
          shadow: 'shadow-red-500/40',
          textColor: 'text-white',
          showIndicator: false
        }
      case 10: // Diamond
        return {
          background: 'bg-gradient-to-br from-blue-100 to-indigo-200',
          ring: 'ring-blue-300/50',
          shadow: 'shadow-blue-500/40',
          textColor: 'text-blue-900',
          showIndicator: false,
          special: 'diamond'
        }
      case 11: // Gold
        return {
          background: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
          ring: 'ring-yellow-300/50',
          shadow: 'shadow-yellow-500/40',
          textColor: 'text-white',
          showIndicator: false,
          special: 'gold'
        }
      case 12: // Silver
        return {
          background: 'bg-gradient-to-br from-gray-400 to-gray-600',
          ring: 'ring-gray-300/50',
          shadow: 'shadow-gray-500/40',
          textColor: 'text-white',
          showIndicator: false,
          special: 'silver'
        }
      case 13: // Bronze (Copper tone)
        return {
          background: 'bg-gradient-to-br from-orange-600 to-red-800',
          ring: 'ring-orange-300/50',
          shadow: 'shadow-orange-500/40',
          textColor: 'text-white',
          showIndicator: false,
          special: 'bronze'
        }
      default:
        // Fallback for unexpected status values
        return {
          background: 'bg-gray-500',
          ring: 'ring-gray-300/50',
          shadow: 'shadow-gray-500/40',
          textColor: 'text-white',
          showIndicator: false
        }
    }
  }

  const colorScheme = getColorScheme()

  return (
    <div className={`
      ${sizeStyles.container} rounded-full flex items-center justify-center relative
      shadow-md ring-2 ${colorScheme.background} ${colorScheme.ring} ${colorScheme.shadow} ${className}
    `}>
      <div className="flex flex-col items-center justify-center relative z-10 gap-0">
        <span className={`${sizeStyles.text} font-semibold leading-none ${colorScheme.textColor}`}>
          Call
        </span>
        <span className={`${sizeStyles.numberText} font-bold leading-none ${colorScheme.textColor}`}>
          {callNumber}
        </span>
      </div>

      {/* Diamond sparkle effect */}
      {colorScheme.special === 'diamond' && (
        <>
          <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '0s'}} />
          <div className="absolute top-2 right-1 w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '0.3s'}} />
          <div className="absolute bottom-1 left-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{animationDelay: '0.6s'}} />
        </>
      )}

      {/* Old phone indicator removed - icons now purely reflect Call Window status */}
    </div>
  )
}

export const CallWindowIcon = memo(CallWindowIconComponent)
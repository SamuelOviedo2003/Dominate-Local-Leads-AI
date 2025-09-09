'use client'

import { memo } from 'react'
import { PhoneCall, X } from 'lucide-react'

interface CallWindowIconProps {
  callNumber: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const CallWindowIconComponent = ({ callNumber, size = 'sm', className = '' }: CallWindowIconProps) => {
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

  // For Call 1, we use blue color scheme as default (matches existing pattern)
  // For other calls, we use standard blue scheme
  const getColorScheme = () => {
    // Using blue as default since we don't have call status in communications
    return 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-500/40 ring-blue-300/50'
  }

  return (
    <div className={`
      ${sizeStyles.container} rounded-full text-white flex items-center justify-center relative
      shadow-md ring-2 ${getColorScheme()} ${className}
    `}>
      <div className="flex flex-col items-center justify-center relative z-10 gap-0">
        <span className={`${sizeStyles.text} font-semibold leading-none`}>
          Call
        </span>
        <span className={`${sizeStyles.numberText} font-bold leading-none`}>
          {callNumber}
        </span>
      </div>
      
      {/* Call Status Indicator - Always show phone icon for communications */}
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center">
        <PhoneCall className="w-1.5 h-1.5 text-green-600" />
      </div>
    </div>
  )
}

export const CallWindowIcon = memo(CallWindowIconComponent)
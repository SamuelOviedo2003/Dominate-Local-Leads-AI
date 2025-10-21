'use client'

import React from 'react'
import { Phone } from 'lucide-react'
import { createBusinessDialpadUrl, isValidDialpadPhone, formatPhoneForDialpad } from '@/lib/utils/phoneUtils'

interface CallNowButtonProps {
  phone: string | null | undefined
  dialpadPhone: string | null | undefined
  leadId: string | number
  className?: string
}

export const CallNowButton: React.FC<CallNowButtonProps> = ({
  phone,
  dialpadPhone,
  leadId,
  className = ''
}) => {
  const dialpadUrl = createBusinessDialpadUrl(phone, dialpadPhone, leadId)

  const handleCall = () => {
    if (dialpadUrl) {
      window.location.href = dialpadUrl
    } else {
      console.warn('Unable to create Dialpad URL - invalid phone number')
    }
  }

  // Don't render the button if the phone number is invalid
  if (!isValidDialpadPhone(phone)) {
    return null
  }

  return (
    <button
      onClick={handleCall}
      className={`inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${className}`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
          <Phone className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold">Call Now</span>
      </div>
    </button>
  )
}


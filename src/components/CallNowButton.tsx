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
      className={`inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-sm transition-colors ${className}`}
    >
      <Phone className="w-4 h-4 mr-2" />
      <span>Call Now</span>
    </button>
  )
}


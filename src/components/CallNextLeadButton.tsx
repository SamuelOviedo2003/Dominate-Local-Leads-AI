'use client'

import React, { useState, useEffect } from 'react'
import { PhoneForwarded } from 'lucide-react'
import { createBusinessDialpadUrl } from '@/lib/utils/phoneUtils'
import { usePermalinkNavigation } from '@/lib/permalink-navigation'

interface NextLead {
  id: number
  name: string
  phone: string
  dialpad_phone: string | null
  stage: number
  call_now_status: number
  priority: 'countdown' | 'call_now_status'
}

interface CallNextLeadButtonProps {
  businessId: string
  currentLeadId: string
  className?: string
}

export const CallNextLeadButton: React.FC<CallNextLeadButtonProps> = ({
  businessId,
  currentLeadId,
  className = ''
}) => {
  const [nextLead, setNextLead] = useState<NextLead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { navigate } = usePermalinkNavigation()

  // Fetch next lead on component mount
  useEffect(() => {
    const fetchNextLead = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(
          `/api/leads/next-lead?businessId=${businessId}&currentLeadId=${currentLeadId}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch next lead')
        }

        const data = await response.json()

        if (data.success && data.lead) {
          setNextLead(data.lead)
        } else {
          setNextLead(null)
        }
      } catch (err) {
        console.error('Error fetching next lead:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (businessId && currentLeadId) {
      fetchNextLead()
    }
  }, [businessId, currentLeadId])

  const handleCallNextLead = () => {
    if (!nextLead) return

    // Create dialpad URL and trigger call
    const dialpadUrl = createBusinessDialpadUrl(
      nextLead.phone,
      nextLead.dialpad_phone,
      nextLead.id
    )

    if (dialpadUrl) {
      // Open dialpad in a new window/tab
      window.open(dialpadUrl, '_blank')

      // Navigate to the next lead's details page
      navigate(`/lead-details/${nextLead.id}`)
    } else {
      console.warn('Unable to create Dialpad URL - invalid phone number')
    }
  }

  // Don't render if loading, error, or no next lead
  if (isLoading || error || !nextLead) {
    return null
  }

  return (
    <button
      onClick={handleCallNextLead}
      className={`inline-flex flex-col items-center justify-center px-4 py-2 bg-white border-2 border-blue-500 hover:bg-blue-50 text-blue-600 font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
    >
      <div className="flex items-center space-x-2">
        <PhoneForwarded className="w-4 h-4" />
        <span className="text-sm font-semibold">Call Next Lead</span>
      </div>
      <span className="text-xs text-gray-600 mt-1 truncate max-w-[150px]">
        {nextLead.name || 'Unknown'}
      </span>
    </button>
  )
}

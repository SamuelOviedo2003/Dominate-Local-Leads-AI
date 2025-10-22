'use client'

import { useState, useEffect } from 'react'
import { authGet } from '@/lib/auth-fetch'

interface UseSmsCountReturn {
  count: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch the count of unread SMS inbound messages for today
 * Returns count of messages with message_type='SMS inbound' and summary IS NOT NULL
 */
export function useSmsCount(): UseSmsCountReturn {
  const [count, setCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSmsCount = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authGet('/api/communications/sms-count')

      if (response.success) {
        setCount(response.count || 0)
      } else {
        throw new Error(response.error || 'Failed to fetch SMS count')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch SMS count'
      setError(errorMessage)
      setCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSmsCount()

    // Refetch every 30 seconds to keep the count updated
    const interval = setInterval(fetchSmsCount, 30000)

    return () => clearInterval(interval)
  }, [])

  return {
    count,
    isLoading,
    error,
    refetch: fetchSmsCount
  }
}

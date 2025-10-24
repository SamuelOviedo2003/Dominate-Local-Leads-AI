'use client'

import { useState, useEffect } from 'react'
import { authGet } from '@/lib/auth-fetch'

interface UseWaitingToCallCountReturn {
  count: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch the count of leads waiting to call
 * Returns count of leads with stage=1 and call_now_status=1
 * Filtered by businesses accessible to the logged-in user
 */
export function useWaitingToCallCount(): UseWaitingToCallCountReturn {
  const [count, setCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCount = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authGet('/api/leads/waiting-to-call-count')

      if (response.success) {
        setCount(response.count || 0)
      } else {
        throw new Error(response.error || 'Failed to fetch waiting to call count')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch waiting to call count'
      setError(errorMessage)
      setCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCount()

    // Refetch every 30 seconds to keep the count updated
    const interval = setInterval(fetchCount, 30000)

    return () => clearInterval(interval)
  }, [])

  return {
    count,
    isLoading,
    error,
    refetch: fetchCount
  }
}

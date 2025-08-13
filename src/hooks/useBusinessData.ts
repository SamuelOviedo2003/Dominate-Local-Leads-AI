'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BusinessClient, BusinessSwitcherData } from '@/types/auth'

interface UseBusinessDataReturn {
  businessData: BusinessClient | null
  availableBusinesses: BusinessSwitcherData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBusinessData(userId: string, userRole?: number): UseBusinessDataReturn {
  const [businessData, setBusinessData] = useState<BusinessClient | null>(null)
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessSwitcherData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBusinessData = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      setError(null)
      const supabase = createClient()

      // Track profile query performance
      const profileStartTime = performance.now()
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', userId)
        .single()
      const profileDuration = performance.now() - profileStartTime

      // Log database query performance if performance context is available
      if (typeof window !== 'undefined') {
        fetch('/api/performance/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: [{
              metric: 'Database: Profile Query',
              measuredValue: Math.round(profileDuration),
              targetValue: '< 500',
              observations: `Profile lookup ${profileDuration < 500 ? 'Good' : profileDuration < 1000 ? 'Acceptable' : 'Slow'}`,
              timestamp: new Date(),
              unit: 'ms',
              category: 'database'
            }]
          })
        }).catch(() => {}); // Silent fail for performance logging
      }

      if (profileError) {
        throw new Error(`Failed to fetch user profile: ${profileError.message}`)
      }

      if (!profile?.business_id) {
        throw new Error('User has no associated business')
      }

      // Track business data query performance
      const businessStartTime = performance.now()
      const { data: business, error: businessError } = await supabase
        .from('business_clients')
        .select('*')
        .eq('business_id', profile.business_id)
        .single()
      const businessDuration = performance.now() - businessStartTime

      // Log business query performance
      if (typeof window !== 'undefined') {
        fetch('/api/performance/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: [{
              metric: 'Database: Business Data Query',
              measuredValue: Math.round(businessDuration),
              targetValue: '< 500',
              observations: `Business data fetch ${businessDuration < 500 ? 'Good' : businessDuration < 1000 ? 'Acceptable' : 'Slow'}`,
              timestamp: new Date(),
              unit: 'ms',
              category: 'database'
            }]
          })
        }).catch(() => {});
      }

      if (businessError) {
        throw new Error(`Failed to fetch business data: ${businessError.message}`)
      }

      setBusinessData(business as BusinessClient)

      // If user is Super Admin (role 0), fetch all available businesses
      if (userRole === 0) {
        const businessesStartTime = performance.now()
        const { data: businesses, error: businessesError } = await supabase
          .from('business_clients')
          .select('business_id, company_name, avatar_url, city, state')
          .order('company_name')
        const businessesDuration = performance.now() - businessesStartTime

        // Log businesses query performance
        if (typeof window !== 'undefined') {
          fetch('/api/performance/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metrics: [{
                metric: 'Database: Available Businesses Query',
                measuredValue: Math.round(businessesDuration),
                targetValue: '< 500',
                observations: `${businesses?.length || 0} businesses fetched ${businessesDuration < 500 ? 'Good' : businessesDuration < 1000 ? 'Acceptable' : 'Slow'}`,
                timestamp: new Date(),
                unit: 'ms',
                category: 'database'
              }]
            })
          }).catch(() => {});
        }

        if (businessesError) {
          console.warn('Failed to fetch available businesses:', businessesError.message)
          setAvailableBusinesses([])
        } else {
          setAvailableBusinesses(businesses as BusinessSwitcherData[])
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching business data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBusinessData()
  }, [userId, userRole])

  return {
    businessData,
    availableBusinesses,
    isLoading,
    error,
    refetch: fetchBusinessData
  }
}
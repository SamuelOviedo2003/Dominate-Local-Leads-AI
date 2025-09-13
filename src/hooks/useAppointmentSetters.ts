'use client'

import { useState, useEffect } from 'react'
import { AppointmentSetter, TimePeriod, ApiResponse } from '@/types/leads'
import { authGet } from '@/lib/auth-fetch'

interface UseAppointmentSettersProps {
  timePeriod: TimePeriod
  businessId: string
}

interface UseAppointmentSettersReturn {
  appointmentSetters: AppointmentSetter[] | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useAppointmentSetters({ timePeriod, businessId }: UseAppointmentSettersProps): UseAppointmentSettersReturn {
  const [appointmentSetters, setAppointmentSetters] = useState<AppointmentSetter[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getStartDate = (period: TimePeriod): string => {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(period))
    return date.toISOString()
  }

  const fetchAppointmentSetters = async () => {
    if (!businessId) return

    setIsLoading(true)
    setError(null)

    try {
      const startDate = getStartDate(timePeriod)
      const params = new URLSearchParams({
        startDate,
        businessId
      })

      const data: ApiResponse<AppointmentSetter[]> = await authGet(`/api/leads/appointment-setters?${params}`)
      
      if (data.success) {
        setAppointmentSetters(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch appointment setters')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch appointment setters'
      setError(errorMessage)
      // Error fetching appointment setters
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointmentSetters()
  }, [timePeriod, businessId])

  return {
    appointmentSetters,
    isLoading,
    error,
    refetch: fetchAppointmentSetters
  }
}
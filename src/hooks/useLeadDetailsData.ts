'use client'

import { useState, useEffect, useCallback } from 'react'
import { LeadDetails, ApiResponse } from '@/types/leads'

interface UseLeadDetailsDataProps {
  leadId: string
  businessId: string
}

interface UseLeadDetailsDataReturn {
  // Data
  leadDetails: LeadDetails | null
  
  // Individual component loading states
  isLeadInfoLoading: boolean
  isCallWindowsLoading: boolean
  isCommunicationsLoading: boolean
  
  // Individual component errors
  leadInfoError: string | null
  callWindowsError: string | null
  communicationsError: string | null
  
  // Overall states
  isLoading: boolean
  error: string | null
  
  // Actions
  refetch: () => void
}

export function useLeadDetailsData({ leadId, businessId }: UseLeadDetailsDataProps): UseLeadDetailsDataReturn {
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null)
  
  // Individual loading states
  const [isLeadInfoLoading, setIsLeadInfoLoading] = useState(false)
  const [isCallWindowsLoading, setIsCallWindowsLoading] = useState(false)
  const [isCommunicationsLoading, setIsCommunicationsLoading] = useState(false)
  
  // Individual error states
  const [leadInfoError, setLeadInfoError] = useState<string | null>(null)
  const [callWindowsError, setCallWindowsError] = useState<string | null>(null)
  const [communicationsError, setCommunicationsError] = useState<string | null>(null)
  
  // Overall states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all data
  const fetchLeadDetails = useCallback(async () => {
    if (!leadId || !businessId) {
      setError('Missing required parameters')
      return
    }

    // Set all components to loading
    setIsLeadInfoLoading(true)
    setIsCallWindowsLoading(true)
    setIsCommunicationsLoading(true)
    
    // Clear previous errors
    setLeadInfoError(null)
    setCallWindowsError(null)
    setCommunicationsError(null)
    setError(null)

    try {
      const url = new URL(`/api/leads/${leadId}`, window.location.origin)
      url.searchParams.set('businessId', businessId)

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch lead details')
      }

      const result: ApiResponse<LeadDetails> = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch lead details')
      }

      setLeadDetails(result.data)
      
      // Simulate individual component loading completion with slight delays for UX
      setTimeout(() => setIsLeadInfoLoading(false), 300)
      setTimeout(() => setIsCallWindowsLoading(false), 600)
      setTimeout(() => setIsCommunicationsLoading(false), 900)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      
      // Set error for all components
      setLeadInfoError(errorMessage)
      setCallWindowsError(errorMessage)
      setCommunicationsError(errorMessage)
      setError(errorMessage)
      
      // Stop loading for all components
      setIsLeadInfoLoading(false)
      setIsCallWindowsLoading(false)
      setIsCommunicationsLoading(false)
      
      // Error fetching lead details
    }
  }, [leadId, businessId])

  // Update overall loading state
  useEffect(() => {
    const anyLoading = isLeadInfoLoading || isCallWindowsLoading || isCommunicationsLoading
    setIsLoading(anyLoading)
  }, [isLeadInfoLoading, isCallWindowsLoading, isCommunicationsLoading])

  // Fetch data when dependencies change
  useEffect(() => {
    fetchLeadDetails()
  }, [fetchLeadDetails])

  return {
    leadDetails,
    
    // Individual loading states
    isLeadInfoLoading,
    isCallWindowsLoading,
    isCommunicationsLoading,
    
    // Individual errors
    leadInfoError,
    callWindowsError,
    communicationsError,
    
    // Overall states
    isLoading,
    error,
    
    // Actions
    refetch: fetchLeadDetails
  }
}
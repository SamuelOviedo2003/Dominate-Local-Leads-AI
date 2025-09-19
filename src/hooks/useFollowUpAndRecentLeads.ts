'use client'

import { useState, useEffect, useCallback } from 'react'
import { LeadWithClient } from '@/types/leads'
import { logger } from '@/lib/logging'
import { authGet } from '@/lib/auth-fetch'

interface UseFollowUpAndRecentLeadsParams {
  businessId: string
}

interface UseFollowUpAndRecentLeadsReturn {
  followUpLeads: LeadWithClient[] | null
  recentLeads: LeadWithClient[] | null
  isFollowUpLoading: boolean
  isRecentLoading: boolean
  followUpError: string | null
  recentError: string | null
  refetchFollowUp: () => Promise<void>
  refetchRecent: () => Promise<void>
}

export function useFollowUpAndRecentLeads({
  businessId
}: UseFollowUpAndRecentLeadsParams): UseFollowUpAndRecentLeadsReturn {
  const [followUpLeads, setFollowUpLeads] = useState<LeadWithClient[] | null>(null)
  const [recentLeads, setRecentLeads] = useState<LeadWithClient[] | null>(null)
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(true)
  const [isRecentLoading, setIsRecentLoading] = useState(true)
  const [followUpError, setFollowUpError] = useState<string | null>(null)
  const [recentError, setRecentError] = useState<string | null>(null)

  const fetchFollowUpLeads = useCallback(async () => {
    if (!businessId) {
      setIsFollowUpLoading(false)
      logger.warn('No business ID provided for follow up leads fetch')
      return
    }

    setIsFollowUpLoading(true)
    setFollowUpError(null)

    try {
      logger.debug('Fetching follow up leads', { businessId })

      const data = await authGet(`/api/leads/follow-up?businessId=${businessId}`)

      if (data.success) {
        setFollowUpLeads(data.data || [])
        logger.debug('Follow up leads fetched successfully', { count: data.data?.length || 0 })
      } else {
        throw new Error(data.error || 'Follow up leads fetch failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      logger.error('Follow up leads fetch error', { error: errorMessage, businessId })
      setFollowUpError(errorMessage)
      setFollowUpLeads([])
    } finally {
      setIsFollowUpLoading(false)
    }
  }, [businessId])

  const fetchRecentLeads = useCallback(async () => {
    if (!businessId) {
      setIsRecentLoading(false)
      logger.warn('No business ID provided for recent leads fetch')
      return
    }

    setIsRecentLoading(true)
    setRecentError(null)

    try {
      logger.debug('Fetching recent leads', { businessId })

      const data = await authGet(`/api/leads/recent?businessId=${businessId}`)

      if (data.success) {
        setRecentLeads(data.data || [])
        logger.debug('Recent leads fetched successfully', { count: data.data?.length || 0 })
      } else {
        throw new Error(data.error || 'Recent leads fetch failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      logger.error('Recent leads fetch error', { error: errorMessage, businessId })
      setRecentError(errorMessage)
      setRecentLeads([])
    } finally {
      setIsRecentLoading(false)
    }
  }, [businessId])

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    if (businessId) {
      fetchFollowUpLeads()
      fetchRecentLeads()
    }
  }, [fetchFollowUpLeads, fetchRecentLeads, businessId])

  return {
    followUpLeads,
    recentLeads,
    isFollowUpLoading,
    isRecentLoading,
    followUpError,
    recentError,
    refetchFollowUp: fetchFollowUpLeads,
    refetchRecent: fetchRecentLeads
  }
}
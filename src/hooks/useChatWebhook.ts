'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WebhookPayload {
  account_id: string
  lead_id: string
  message: string
  business_id: string
}

interface WebhookResponse {
  success: boolean
  error?: string
}

/**
 * Custom hook for handling chat webhook calls
 * Sends messages to the n8n webhook endpoint with proper error handling and loading states
 */
export function useChatWebhook() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const sendMessage = useCallback(async (payload: WebhookPayload): Promise<WebhookResponse> => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Validate required fields
      if (!payload.account_id || !payload.lead_id || !payload.message || !payload.business_id) {
        throw new Error('Missing required fields for webhook call')
      }

      // Webhook endpoint URL
      const webhookUrl = 'https://n8nio-n8n-pbq4r3.sliplane.app/webhook/bf425f50-2d65-4cfd-a529-faea3b682288'
      
      // Make the webhook call
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        throw new Error(`Webhook call failed: ${response.status} ${response.statusText}`)
      }
      
      // Try to parse response if it's JSON, otherwise just check if it was successful
      let responseData
      try {
        responseData = await response.json()
      } catch {
        responseData = { success: true }
      }
      
      // Message sent successfully
      
      return { success: true }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      // Failed to send message
      setError(errorMessage)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  /**
   * Get the current authenticated user's account ID
   */
  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        // Failed to get current user
        return null
      }
      
      return user.id
    } catch (error) {
      // Error getting current user
      return null
    }
  }, [])
  
  return {
    sendMessage,
    getCurrentUserId,
    isLoading,
    error
  }
}
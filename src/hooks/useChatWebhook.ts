'use client'

import { useState, useCallback } from 'react'

interface WebhookPayload {
  from_number: string
  to_number: string
  text: string
  lead_id: string
  assigned_id?: string | null
}

interface WebhookResponse {
  success: boolean
  error?: string
}

/**
 * Custom hook for handling SMS webhook calls via Dialpad
 * Sends messages to the n8n dialpad-sms-outgoing webhook endpoint with proper error handling and loading states
 */
export function useChatWebhook() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (payload: WebhookPayload): Promise<WebhookResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!payload.from_number || !payload.to_number || !payload.text || !payload.lead_id) {
        throw new Error('Missing required fields for webhook call')
      }

      // Webhook endpoint URL - Dialpad SMS Outgoing
      const webhookUrl = 'https://n8nio-n8n-pbq4r3.sliplane.app/webhook/dialpad-sms-outgoing'

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

  return {
    sendMessage,
    isLoading,
    error
  }
}
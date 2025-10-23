'use client'

import React, { useMemo, useCallback, memo, useState, useEffect } from 'react'
import { Communication, CallWindow } from '@/types/leads'
import { AudioPlayer } from './AudioPlayer'
import { LoadingSystem } from '@/components/LoadingSystem'
import { CallWindowIcon } from '@/components/ui/CallWindowIcon'
import { useChatWebhook } from '@/hooks/useChatWebhook'
import { formatCommunicationTimestamp } from '@/lib/utils/dateFormat'

interface CommunicationsHistoryProps {
  communications?: Communication[] | null
  callWindows?: CallWindow[] | null // Added to support dynamic icon styling
  isLoading?: boolean
  error?: string | null
  leadId?: string
  businessId?: string
  businessTimezone?: string // IANA timezone identifier (e.g., 'America/New_York')
  leadPhone?: string | null // Lead's phone number
  businessPhone?: string | null // Business dialpad phone number
  assignedId?: string | null // Lead's assigned_id from leads table
}

const CommunicationsHistoryComponent = ({ communications = [], callWindows = [], isLoading = false, error = null, leadId, businessId, businessTimezone = 'UTC', leadPhone, businessPhone, assignedId }: CommunicationsHistoryProps) => {
  // All hooks must be declared at the top, before any conditional logic
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const { sendMessage, isLoading: isSending, error: webhookError } = useChatWebhook()

  /**
   * Pre-fill message input with AI response from most recent SMS inbound
   */
  useEffect(() => {
    if (!communications || communications.length === 0) {
      return
    }

    // Get the most recent communication (communications are sorted by created_at)
    const mostRecent = communications[communications.length - 1]

    // Check if mostRecent exists and is SMS inbound with non-null summary
    if (
      mostRecent &&
      mostRecent.message_type === 'SMS inbound' &&
      mostRecent.summary !== null &&
      mostRecent.summary !== undefined
    ) {
      // Pre-fill with ai_response if available
      if (mostRecent.ai_response) {
        setMessage(mostRecent.ai_response)
      }
    }
  }, [communications])

  /**
   * Handle sending a message via webhook
   */
  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) {
      return
    }

    if (!leadId || !leadPhone || !businessPhone) {
      console.error('[CommunicationsHistory] Missing required fields for sending message')
      return
    }

    try {
      // Send the message via webhook with Dialpad SMS format
      const result = await sendMessage({
        from_number: businessPhone,
        to_number: leadPhone,
        text: message.trim(),
        lead_id: leadId,
        assigned_id: assignedId
      })

      if (result.success) {
        // Clear the message input on success
        setMessage('')
      } else {
        console.error('[CommunicationsHistory] Failed to send message:', result.error)
      }
    } catch (error) {
      console.error('[CommunicationsHistory] Error sending message:', error)
    }
  }, [message, leadId, leadPhone, businessPhone, assignedId, sendMessage])

  /**
   * Handle Enter key press in textarea
   */
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  const getMessageTypeColor = useCallback((messageType: string): string => {
    const type = messageType.toLowerCase()
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-800'
      case 'sms':
      case 'text':
        return 'bg-green-100 text-green-800'
      case 'call':
      case 'phone':
        return 'bg-purple-100 text-purple-800'
      case 'voicemail':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const formatDate = useCallback((dateString: string) => {
    return formatCommunicationTimestamp(dateString, businessTimezone)
  }, [businessTimezone])

  const formatMessageType = useCallback((messageType: string): string => {
    const type = messageType.toLowerCase()
    switch (type) {
      case 'sms':
        return 'Text'
      case 'call':
        return 'Phone'
      default:
        return messageType.charAt(0).toUpperCase() + messageType.slice(1)
    }
  }, [])

  /**
   * Find the associated Call Window for a communication
   * Links communication.call_window (1-6) to corresponding CallWindow.callNumber
   */
  const findAssociatedCallWindow = useCallback((communication: Communication): CallWindow | null => {
    if (!communication.call_window || !callWindows || callWindows.length === 0) {
      return null
    }

    // Find Call Window with matching callNumber
    return callWindows.find(cw => cw.callNumber === communication.call_window) || null
  }, [callWindows])

  /**
   * Get the status for dynamic icon styling
   * Returns the numeric status directly from Call Window (optimized)
   */
  const getCallWindowStatus = useCallback((communication: Communication): number | null => {
    const associatedWindow = findAssociatedCallWindow(communication)
    if (!associatedWindow) {
      return null
    }

    // Return numeric status directly - no parsing needed
    return associatedWindow.status
  }, [findAssociatedCallWindow])

  const sortedCommunications = useMemo(() => {
    if (!communications || communications.length === 0) return []
    return communications.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateA - dateB // Sort oldest first, newest at bottom
    })
  }, [communications])

  /**
   * Render chat interface
   */
  const renderChatInterface = useCallback(() => (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Send New Message</h4>
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isSending}
          />
        </div>
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={isSending || !message.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
      {webhookError && (
        <div className="mt-2 text-xs text-red-600">
          Error: {webhookError}
        </div>
      )}
      {!webhookError && (
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send or Shift+Enter for new line
        </div>
      )}
    </div>
  ), [message, setMessage, handleKeyPress, handleSendMessage, isSending, webhookError])

  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Communications History</h3>
        <div className="flex items-center justify-center py-16">
          <LoadingSystem size="md" message="Loading communications..." />
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Communications History</h3>
        <div className="text-center py-16">
          <div className="text-red-500 text-lg font-medium mb-2">Error Loading Communications</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!communications || communications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Communications History</h3>
        <div className="text-center py-6 text-gray-500">
          No communications found for this lead
        </div>
        {renderChatInterface()}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Communications History</h3>
      </div>
      {/* Communications List */}
      {sortedCommunications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No communications found for this lead
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCommunications.map((communication) => (
            <div 
              key={communication.communication_id}
              className="border border-gray-200 rounded-lg p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">
                    {formatDate(communication.created_at)}
                  </span>
                  {communication.call_window && communication.call_window >= 1 && communication.call_window <= 6 && (
                    <CallWindowIcon
                      callNumber={communication.call_window}
                      size="sm"
                      className="flex-shrink-0"
                      status={getCallWindowStatus(communication)}
                    />
                  )}
                  <span 
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getMessageTypeColor(communication.message_type)}`}
                  >
                    {formatMessageType(communication.message_type)}
                  </span>
                </div>
              </div>
              
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-sm text-gray-700 leading-relaxed flex-1">
                  {communication.summary}
                </p>
                {communication.message_type === 'SMS inbound' && communication.mms && (
                  <button
                    onClick={() => setSelectedImage(communication.mms!)}
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="button"
                    aria-label="View MMS image"
                  >
                    <img
                      src={communication.mms}
                      alt="MMS attachment"
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}
              </div>

              {communication.recording_url && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Recording</span>
                  </div>
                  <AudioPlayer src={communication.recording_url} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {renderChatInterface()}

      {/* MMS Image Popup */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
          style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="MMS attachment full view"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const CommunicationsHistory = memo(CommunicationsHistoryComponent)
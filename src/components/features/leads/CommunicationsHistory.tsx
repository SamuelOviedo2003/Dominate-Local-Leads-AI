'use client'

import { Communication } from '@/types/leads'
import { AudioPlayer } from './AudioPlayer'
import { useMemo, useCallback, memo } from 'react'

interface CommunicationsHistoryProps {
  communications: Communication[]
}

const CommunicationsHistoryComponent = ({ communications }: CommunicationsHistoryProps) => {

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
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }, [])

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

  const sortedCommunications = useMemo(() => {
    return communications.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateA - dateB // Sort oldest first, newest at bottom
    })
  }, [communications])


  if (communications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Communications History</h3>
        <div className="text-center py-6 text-gray-500">
          No communications found for this lead
        </div>

        {/* Chat Interface */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Send New Message</h4>
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                placeholder="Type your message here..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              type="button"
              className="self-end px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            This is a demonstration interface. Messages are not actually sent.
          </div>
        </div>
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
                  <span 
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getMessageTypeColor(communication.message_type)}`}
                  >
                    {formatMessageType(communication.message_type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(communication.created_at)}
                  </span>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {communication.summary}
                </p>
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

      {/* Chat Interface */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Send New Message</h4>
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              placeholder="Type your message here..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <button
            type="button"
            className="self-end px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          This is a demonstration interface. Messages are not actually sent.
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const CommunicationsHistory = memo(CommunicationsHistoryComponent)
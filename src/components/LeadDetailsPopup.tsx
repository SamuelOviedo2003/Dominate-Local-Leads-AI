'use client'

import { useState, useEffect } from 'react'
import { LeadWithClient } from '@/types/leads'
import { AudioPlayer } from './features/leads/AudioPlayer'
import { X, Phone, User } from 'lucide-react'
import { authPatch } from '@/lib/auth-fetch'

interface LeadDetailsPopupProps {
  lead: LeadWithClient | null
  isOpen: boolean
  onClose: () => void
  businessId: string
}

const CALLER_TYPE_OPTIONS = [
  { value: 'Client', label: 'Client' },
  { value: 'Sales person', label: 'Sales person' },
  { value: 'Other', label: 'Other' },
  { value: 'Looking for job', label: 'Looking for job' }
]

export function LeadDetailsPopup({ lead, isOpen, onClose, businessId }: LeadDetailsPopupProps) {
  const [selectedCallerType, setSelectedCallerType] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Update selected caller type when lead changes
  useEffect(() => {
    if (lead?.caller_type) {
      setSelectedCallerType(lead.caller_type)
    } else {
      setSelectedCallerType('')
    }
  }, [lead])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent background scrolling
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  const updateCallerType = async (newCallerType: string) => {
    if (!lead) return

    setIsUpdating(true)
    setUpdateError(null)

    try {
      const result = await authPatch(`/api/leads/${lead.lead_id}?businessId=${businessId}`, {
        caller_type: newCallerType || null
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to update caller type')
      }

      setSelectedCallerType(newCallerType)
      
    } catch (error) {
      // Error updating caller type
      setUpdateError(error instanceof Error ? error.message : 'Failed to update caller type')
      // Revert the selection on error
      setSelectedCallerType(lead.caller_type || '')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCallerTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value
    setSelectedCallerType(newValue)
    updateCallerType(newValue)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getMessageTypeColor = (messageType: string): string => {
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
  }

  if (!isOpen || !lead) {
    return null
  }

  // Mock recording URL and call summary for demonstration
  // In real implementation, these would come from the lead data or a separate API call
  const mockRecordingUrl = "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav" // Demo audio
  const mockCallSummary = `Call with ${lead.first_name} ${lead.last_name} regarding ${lead.service}. Lead showed strong interest and provided additional details about their requirements. Follow-up scheduled.`

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {lead.first_name} {lead.last_name}
                </h3>
                <p className="text-sm text-gray-600">{lead.service}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            
            {/* Audio Player Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Call Recording</span>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getMessageTypeColor('call')}`}>
                  Call
                </span>
              </div>
              
              {mockRecordingUrl ? (
                <AudioPlayer src={mockRecordingUrl} />
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No recording available for this call
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-500">
                {formatDate(lead.created_at)}
              </div>
            </div>

            {/* Call Summary Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">Call Summary</span>
              </div>
              
              <div className="text-sm text-gray-700 leading-relaxed">
                {mockCallSummary || lead.summary || 'No call summary available for this lead.'}
              </div>
            </div>

            {/* Caller Type Dropdown Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Caller Type</span>
                {isUpdating && (
                  <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                )}
              </div>
              
              <select
                value={selectedCallerType}
                onChange={handleCallerTypeChange}
                disabled={isUpdating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="">Select caller type...</option>
                {CALLER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {updateError && (
                <div className="mt-2 text-sm text-red-600">
                  {updateError}
                </div>
              )}
            </div>

            {/* Additional Lead Info */}
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Source:</span>
                  <span className="ml-2 text-gray-900">{lead.source || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-2 text-gray-900">{lead.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 text-gray-900">{lead.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
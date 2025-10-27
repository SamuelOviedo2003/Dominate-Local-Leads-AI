'use client'

import React, { useState } from 'react'
import { ChevronDown, Loader2, AlertTriangle } from 'lucide-react'
import { logger } from '@/lib/logging'

interface LeadStageDropdownProps {
  leadId: string | number
  currentStage: 1 | 2 | 3 | 20 | 30 | 40 | 50 | 88 | 99 | 100
  className?: string
  onStageChange?: (newStage: number) => void
}

interface StageOption {
  value: 1 | 2 | 3 | 20 | 30 | 40 | 50 | 88 | 99 | 100
  label: string
  description?: string // Optional description for tooltips
}

const STAGE_OPTIONS: StageOption[] = [
  { value: 1, label: 'Speed to Lead', description: 'Highest priority - immediate attention' },
  { value: 2, label: 'Call Now', description: 'High priority - elevated attention' },
  { value: 3, label: 'Waiting to Call', description: 'Normal priority - regular queue' },
  { value: 20, label: 'Follow Up', description: 'Needs follow-up action' },
  { value: 30, label: 'Booked', description: 'Appointment scheduled' },
  { value: 88, label: 'Bad Number', description: 'Invalid phone number' },
  { value: 99, label: 'Not Interested', description: 'Lead declined service' },
  { value: 100, label: 'Email Campaign', description: 'In marketing campaign' }
]

export const LeadStageDropdown: React.FC<LeadStageDropdownProps> = ({
  leadId,
  currentStage,
  className = '',
  onStageChange
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStage, setSelectedStage] = useState(currentStage)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingStage, setPendingStage] = useState<1 | 2 | 3 | 20 | 30 | 40 | 50 | 88 | 99 | 100 | null>(null)

  const getCurrentStageLabel = () => {
    const stage = STAGE_OPTIONS.find(option => option.value === selectedStage)
    return stage?.label || 'Unknown'
  }

  const handleStageSelection = (newStage: 1 | 2 | 3 | 20 | 30 | 40 | 50 | 88 | 99 | 100) => {
    if (newStage === selectedStage) {
      setIsOpen(false)
      return
    }

    // Close dropdown and show confirmation
    setIsOpen(false)
    setPendingStage(newStage)
    setShowConfirmation(true)
  }

  const handleConfirmStageChange = async () => {
    if (!pendingStage) return

    setShowConfirmation(false)
    setIsLoading(true)

    try {
      const response = await fetch('https://n8nio-n8n-pbq4r3.sliplane.app/webhook/change-stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: leadId.toString(),
          stage: pendingStage.toString()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Update local state
      setSelectedStage(pendingStage)

      // Call the optional callback
      onStageChange?.(pendingStage)

      logger.debug('Lead stage updated successfully', {
        leadId,
        oldStage: currentStage,
        newStage: pendingStage
      })

    } catch (error) {
      logger.error('Failed to update lead stage', {
        leadId,
        newStage: pendingStage,
        error: error instanceof Error ? error.message : error
      })

      // Show error to user (you might want to use a toast notification here)
      alert('Failed to update lead stage. Please try again.')
    } finally {
      setIsLoading(false)
      setPendingStage(null)
    }
  }

  const handleCancelStageChange = () => {
    setShowConfirmation(false)
    setPendingStage(null)
  }

  const getPendingStageLabel = () => {
    if (!pendingStage) return ''
    const stage = STAGE_OPTIONS.find(option => option.value === pendingStage)
    return stage?.label || 'Unknown'
  }

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <div>
        <button
          type="button"
          className="inline-flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
        >
          <span className="flex items-center">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {getCurrentStageLabel()}
          </span>
          <ChevronDown
            className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right bg-white border border-gray-300 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {STAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
                  option.value === selectedStage
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700'
                }`}
                onClick={() => handleStageSelection(option.value)}
                disabled={isLoading}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black bg-opacity-50" />

          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Stage Change
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to change the lead stage to "{getPendingStageLabel()}"?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelStageChange}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStageChange}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
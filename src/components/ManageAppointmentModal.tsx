'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'

interface ManageAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  accountId: string
  businessId: string
}

export function ManageAppointmentModal({
  isOpen,
  onClose,
  leadId,
  accountId,
  businessId
}: ManageAppointmentModalProps) {
  const [activeAction, setActiveAction] = useState<'select' | 'reschedule' | 'cancel'>('select')
  const [streetName, setStreetName] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleReschedule = async () => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('https://n8nio-n8n-pbq4r3.sliplane.app/webhook/ghl-reschedulem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: leadId,
          account_id: accountId,
          street_name: streetName,
          postal_code: postalCode,
          business_id: businessId
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Reschedule request sent successfully' })
        setTimeout(() => {
          onClose()
          resetForm()
        }, 2000)
      } else {
        setMessage({ type: 'error', text: 'Failed to send reschedule request' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while sending the request' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('https://n8nio-n8n-pbq4r3.sliplane.app/webhook/ghl-cancel-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: leadId,
          account_id: accountId,
          street_name: streetName,
          postal_code: postalCode,
          business_id: businessId
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cancellation request sent successfully' })
        setTimeout(() => {
          onClose()
          resetForm()
        }, 2000)
      } else {
        setMessage({ type: 'error', text: 'Failed to send cancellation request' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while sending the request' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setActiveAction('select')
    setStreetName('')
    setPostalCode('')
    setMessage(null)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 pt-5 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Manage Appointment
              </h3>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {activeAction === 'select' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  What would you like to do with this appointment?
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setActiveAction('reschedule')}
                    className="w-full px-4 py-3 text-left bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
                  >
                    <div className="font-medium">Reschedule Appointment</div>
                    <div className="text-sm text-blue-600">Change the appointment date and time</div>
                  </button>
                  <button
                    onClick={() => setActiveAction('cancel')}
                    className="w-full px-4 py-3 text-left bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition-colors"
                  >
                    <div className="font-medium">Cancel Appointment</div>
                    <div className="text-sm text-red-600">Cancel this appointment</div>
                  </button>
                </div>
              </div>
            )}

            {(activeAction === 'reschedule' || activeAction === 'cancel') && (
              <div className="space-y-4">
                <button
                  onClick={() => setActiveAction('select')}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  disabled={isSubmitting}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">
                    {activeAction === 'reschedule' ? 'Reschedule Appointment' : 'Cancel Appointment'}
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="streetName" className="block text-sm font-medium text-gray-700 mb-1">
                        Street Name
                      </label>
                      <input
                        id="streetName"
                        type="text"
                        value={streetName}
                        onChange={(e) => setStreetName(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Enter street name"
                      />
                    </div>

                    <div>
                      <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Code
                      </label>
                      <input
                        id="postalCode"
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Enter postal code"
                      />
                    </div>

                    {message && (
                      <div
                        className={`p-3 rounded-md ${
                          message.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {message.text}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={activeAction === 'reschedule' ? handleReschedule : handleCancel}
                        disabled={isSubmitting || !streetName || !postalCode}
                        className={`flex-1 px-4 py-2 text-white rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          activeAction === 'reschedule'
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {isSubmitting ? 'Sending...' : activeAction === 'reschedule' ? 'Send Reschedule Request' : 'Send Cancellation Request'}
                      </button>
                      <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

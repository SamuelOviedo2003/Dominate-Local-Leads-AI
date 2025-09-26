'use client'

import React, { useState } from 'react'
import { useCurrentBusiness } from '@/contexts/BusinessContext'
import { logger } from '@/lib/logging'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  accountId: string
}

interface BookingFormData {
  street_name: string
  postal_code: string
}

export function BookingModal({ isOpen, onClose, leadId, accountId }: BookingModalProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    street_name: '',
    postal_code: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selectedCompany = useCurrentBusiness()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.street_name.trim() || !formData.postal_code.trim()) {
      setError('Both street name and postal code are required.')
      return
    }

    if (!selectedCompany?.business_id) {
      setError('Business context not available. Please refresh and try again.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        lead_id: leadId,
        account_id: accountId,
        business_id: selectedCompany.business_id,
        street_name: formData.street_name.trim(),
        postal_code: formData.postal_code.trim()
      }

      logger.debug('Booking modal payload', payload)

      const response = await fetch(`/api/booking/verify-address?businessId=${selectedCompany.business_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to verify address')
      }

      const result = await response.json()
      logger.debug('Booking verification success', result)

      setSuccess(true)
      setTimeout(() => {
        handleClose()
      }, 2000)

    } catch (error) {
      logger.error('Booking verification failed', { error, leadId, accountId })
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({ street_name: '', postal_code: '' })
    setError(null)
    setSuccess(false)
    setIsSubmitting(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Address Verification Sent</h3>
              <p className="text-sm text-gray-500">The address verification request has been successfully submitted.</p>
            </div>
          ) : (
            <>
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Address Verification
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="street_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Street Name *
                      </label>
                      <input
                        type="text"
                        id="street_name"
                        name="street_name"
                        value={formData.street_name}
                        onChange={handleInputChange}
                        placeholder="Enter street name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-orange-500 focus:border-brand-orange-500"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        id="postal_code"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        placeholder="Enter postal code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-orange-500 focus:border-brand-orange-500"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <div className="mt-1 text-sm text-red-700">{error}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.street_name.trim() || !formData.postal_code.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-orange-600 text-base font-medium text-white hover:bg-brand-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Confirming...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange-500 sm:mt-0 sm:w-auto sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
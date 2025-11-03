'use client'

import React, { useState } from 'react'
import { ManageAppointmentModal } from './ManageAppointmentModal'

interface ManageAppointmentButtonProps {
  leadId: string
  accountId: string
  businessId: string
  eventId?: string | null // GHL event ID for appointment bookings
  className?: string
}

export function ManageAppointmentButton({
  leadId,
  accountId,
  businessId,
  eventId,
  className = ''
}: ManageAppointmentButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleClick = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${className}`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Manage Appointment
      </button>

      <ManageAppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        leadId={leadId}
        accountId={accountId}
        businessId={businessId}
        eventId={eventId}
      />
    </>
  )
}

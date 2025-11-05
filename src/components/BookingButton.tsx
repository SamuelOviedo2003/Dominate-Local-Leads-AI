'use client'

import React, { useState } from 'react'
import { BookingModal } from './BookingModal'

interface BookingButtonProps {
  leadId: string
  accountId: string
  className?: string
}

export function BookingButton({ leadId, accountId, className = '' }: BookingButtonProps) {
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
        className={`inline-flex items-center px-6 py-2 font-semibold text-white bg-brand-orange-600 hover:bg-brand-orange-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange-500 transition-colors ${className}`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Booking
      </button>

      <BookingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        leadId={leadId}
        accountId={accountId}
      />
    </>
  )
}
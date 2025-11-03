'use client'

import React, { useState } from 'react'
import { X, MapPin, Clock } from 'lucide-react'
import { DateTime } from 'luxon'
import { logger } from '@/lib/logging'

interface ManageAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  accountId: string
  businessId: string
  eventId?: string | null // GHL event ID for appointment bookings
}

interface CalendarSlots {
  [date: string]: {
    slots: string[]
  }
}

interface ProfileOption {
  id: string
  full_name: string
  business_id: number
  role: number
  ghl_id: string | null
}

interface ClientData {
  full_address: string
  distance_meters: number
  duration_seconds: number
}

interface LeadData {
  assigned: string
  start_time: string
  client_id: bigint
}

export function ManageAppointmentModal({
  isOpen,
  onClose,
  leadId,
  accountId,
  businessId,
  eventId
}: ManageAppointmentModalProps) {
  const [activeAction, setActiveAction] = useState<'select' | 'reschedule' | 'reschedule-calendar' | 'cancel'>('select')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Reschedule state
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlots>({})
  const [businessTimezone, setBusinessTimezone] = useState<string>('America/New_York')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth()
    }
  })

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
          business_id: businessId,
          event_id: eventId
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

  const handleRescheduleStart = async () => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      // Fetch lead data to get client_id, assigned, and start_time
      const leadResponse = await fetch(`/api/leads/${leadId}?businessId=${businessId}`)
      if (!leadResponse.ok) {
        throw new Error('Failed to fetch lead data')
      }
      const leadData = await leadResponse.json()
      const lead: LeadData = leadData.data?.lead

      if (!lead) {
        throw new Error('Lead data not found')
      }

      // Fetch client data for address info
      if (lead.client_id) {
        try {
          const clientResponse = await fetch(`/api/clients/${lead.client_id}?businessId=${businessId}`)
          if (clientResponse.ok) {
            const clientDataResponse = await clientResponse.json()
            setClientData(clientDataResponse.data?.client || null)
          }
        } catch (error) {
          logger.warn('Failed to fetch client data', { error, client_id: lead.client_id })
          // Continue without client data
        }
      }

      // Fetch calendar slots
      const slotsResponse = await fetch(`/api/calendar/free-slots?businessId=${businessId}&leadId=${leadId}`)
      if (!slotsResponse.ok) {
        throw new Error('Failed to fetch calendar slots')
      }
      const slotsData = await slotsResponse.json()
      setCalendarSlots(slotsData.slots || {})
      setBusinessTimezone(slotsData.timezone || 'America/New_York')

      // Fetch profile options
      const profilesResponse = await fetch(`/api/profiles/by-business?businessId=${businessId}`)
      let profiles: ProfileOption[] = []
      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json()
        profiles = profilesData.profiles || []
        setProfileOptions(profiles)
      }

      // Pre-select assigned profile (use the profiles we just fetched)
      if (lead.assigned && profiles.length > 0) {
        const assignedProfile = profiles.find(p => p.full_name === lead.assigned)
        if (assignedProfile) {
          setSelectedProfile(assignedProfile.id)
        }
      }

      // Pre-select date/time from lead's start_time
      if (lead.start_time) {
        logger.debug('Pre-selecting date/time from lead', {
          start_time: lead.start_time,
          timezone: slotsData.timezone
        })

        // Parse the start_time - could be ISO string or human-readable format
        let leadDateTime: DateTime
        try {
          // Try parsing as ISO with UTC zone first
          leadDateTime = DateTime.fromISO(lead.start_time, { zone: 'UTC' })

          // If invalid, try parsing without zone specification
          if (!leadDateTime.isValid) {
            leadDateTime = DateTime.fromISO(lead.start_time)
          }

          // If still invalid, try parsing human-readable format like "Thursday, November 6 11:00 AM"
          if (!leadDateTime.isValid) {
            // Get current year to add to the date
            const currentYear = DateTime.now().year

            leadDateTime = DateTime.fromFormat(
              lead.start_time,
              'EEEE, MMMM d h:mm a',
              { zone: slotsData.timezone || 'America/New_York' }
            )

            // Set the year to current year if parsed successfully
            if (leadDateTime.isValid) {
              leadDateTime = leadDateTime.set({ year: currentYear })
            }
          }

          // If still invalid, try without day of week
          if (!leadDateTime.isValid) {
            const currentYear = DateTime.now().year
            const dateWithoutDay = lead.start_time.replace(/^[A-Za-z]+,\s*/, '') // Remove "Thursday, "

            leadDateTime = DateTime.fromFormat(
              dateWithoutDay,
              'MMMM d h:mm a',
              { zone: slotsData.timezone || 'America/New_York' }
            )

            // Set the year to current year if parsed successfully
            if (leadDateTime.isValid) {
              leadDateTime = leadDateTime.set({ year: currentYear })
            }
          }

          // Convert to business timezone if we parsed in UTC
          if (leadDateTime.isValid && leadDateTime.zoneName === 'UTC') {
            leadDateTime = leadDateTime.setZone(slotsData.timezone || 'America/New_York')
          }
        } catch (error) {
          logger.error('Failed to parse start_time', { error, start_time: lead.start_time })
          leadDateTime = DateTime.now().setZone(slotsData.timezone || 'America/New_York')
        }

        const dateStr = leadDateTime.isValid ? leadDateTime.toISODate() : null

        logger.debug('Parsed lead date/time', {
          dateStr,
          leadDateTime: leadDateTime.toISO(),
          availableDates: Object.keys(slotsData.slots || {})
        })

        if (dateStr) {
          setSelectedDate(dateStr)
          setCurrentMonth({
            year: leadDateTime.year,
            month: leadDateTime.month - 1
          })

          // Set selectedTime - find exact match or closest slot
          const availableSlots = slotsData.slots?.[dateStr]?.slots || []

          logger.debug('Looking for time slot match', {
            dateStr,
            availableSlotsCount: availableSlots.length,
            leadTime: leadDateTime.toISO()
          })

          if (availableSlots.length > 0) {
            // First try exact match
            const exactMatch = availableSlots.find((slot: string) => {
              const slotTime = DateTime.fromISO(slot, { zone: slotsData.timezone })
              return slotTime.toMillis() === leadDateTime.toMillis()
            })

            if (exactMatch) {
              setSelectedTime(exactMatch)
              logger.debug('Found exact time match', { exactMatch })
            } else {
              // Find closest slot within 30 minutes
              const closestSlot = availableSlots.find((slot: string) => {
                const slotTime = DateTime.fromISO(slot, { zone: slotsData.timezone })
                return Math.abs(slotTime.diff(leadDateTime, 'minutes').minutes) < 30
              })
              if (closestSlot) {
                setSelectedTime(closestSlot)
                logger.debug('Found closest time match', { closestSlot })
              } else {
                logger.warn('No matching time slot found', {
                  leadTime: leadDateTime.toISO(),
                  availableSlots: availableSlots.slice(0, 3)
                })
              }
            }
          } else {
            logger.warn('No available slots for date', { dateStr })
          }
        }
      }

      setActiveAction('reschedule-calendar')
    } catch (error) {
      logger.error('Failed to initialize reschedule', { error, leadId, businessId })
      setMessage({ type: 'error', text: 'Failed to load reschedule data' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRescheduleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      setMessage({ type: 'error', text: 'Please select date and time' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      // Convert selected time to business timezone
      const selectedDateTime = DateTime.fromISO(selectedTime, { zone: businessTimezone })
      const start_time = selectedDateTime.toISO()

      const response = await fetch('https://n8nio-n8n-pbq4r3.sliplane.app/webhook/ghl-reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: leadId,
          event_id: eventId,
          business_id: businessId,
          start_time: start_time
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
      logger.error('Reschedule confirmation failed', { error, leadId, businessId })
      setMessage({ type: 'error', text: 'An error occurred while sending the request' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setActiveAction('select')
    setCalendarSlots({})
    setBusinessTimezone('America/New_York')
    setSelectedDate('')
    setSelectedTime('')
    setProfileOptions([])
    setSelectedProfile('')
    setClientData(null)
    setMessage(null)
    const now = new Date()
    setCurrentMonth({
      year: now.getFullYear(),
      month: now.getMonth()
    })
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  const formatTime = (timeStr: string): string => {
    const date = DateTime.fromISO(timeStr, { zone: businessTimezone })
    return date.toLocaleString(DateTime.TIME_SIMPLE)
  }

  const formatDate = (dateStr: string): string => {
    // Parse date in business timezone to avoid off-by-one errors
    const date = DateTime.fromISO(dateStr, { zone: businessTimezone })
    return date.toLocaleString(DateTime.DATE_FULL)
  }

  const getAvailableTimesForDate = (date: string): string[] => {
    return calendarSlots[date]?.slots || []
  }

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay()
  }

  const generateCalendarDays = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        day,
        dateStr,
        hasSlots: Boolean(calendarSlots[dateStr]?.slots?.length)
      })
    }

    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev.year, prev.month + (direction === 'next' ? 1 : -1), 1)
      return {
        year: newDate.getFullYear(),
        month: newDate.getMonth()
      }
    })
  }

  const getMonthName = (month: number): string => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return monthNames[month] || 'Unknown'
  }

  if (!isOpen) return null

  const renderCalendarStage = () => {
    const availableTimes = selectedDate ? getAvailableTimesForDate(selectedDate) : []

    return (
      <div className="h-full flex flex-col">
        {/* Address Info */}
        {clientData?.full_address && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Address</p>
              <p className="mb-2">{clientData.full_address}</p>
              <div className="flex items-center gap-4 text-xs text-green-700">
                {clientData.distance_meters && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{(clientData.distance_meters / 1609.34).toFixed(2)} mi</span>
                  </div>
                )}
                {clientData.duration_seconds && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{Math.round(clientData.duration_seconds / 60)} min</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
          {/* Left Column - Calendar */}
          <div className="flex flex-col">
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => navigateMonth('prev')}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <h3 className="text-sm font-semibold text-gray-900">
                  {getMonthName(currentMonth.month)} {currentMonth.year}
                </h3>

                <button
                  type="button"
                  onClick={() => navigateMonth('next')}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-sm">
                {generateCalendarDays(currentMonth.year, currentMonth.month).map((dayData, index) => {
                  if (!dayData) {
                    return <div key={`empty-${index}`} className="h-8 w-8"></div>
                  }

                  const { day, dateStr, hasSlots } = dayData
                  const isSelected = selectedDate === dateStr
                  const isToday = dateStr === new Date().toISOString().split('T')[0]

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => hasSlots ? setSelectedDate(dateStr) : null}
                      disabled={!hasSlots}
                      className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                        hasSlots
                          ? isSelected
                            ? 'bg-blue-600 text-white'
                            : isToday
                              ? 'text-gray-900 cursor-pointer'
                              : 'bg-blue-200 text-gray-900 cursor-pointer hover:bg-blue-300'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Profile Assignment and Time Selection */}
          <div className="flex flex-col space-y-4">
            {/* Profile Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to
              </label>
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="w-full h-12 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Default</option>
                {profileOptions.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <label htmlFor="time-selector" className="block text-sm font-medium text-gray-700 mb-1">
                  Available Times for {formatDate(selectedDate)}
                </label>
                <select
                  id="time-selector"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full h-12 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select a time...</option>
                  {availableTimes.map(time => (
                    <option key={time} value={time}>
                      {formatTime(time)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selected Date Display */}
            {selectedDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Selected Date</p>
                  <p>{formatDate(selectedDate)}</p>
                  {selectedTime && (
                    <p className="mt-1"><strong>Time:</strong> {formatTime(selectedTime)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 mt-auto">
          <button
            type="button"
            onClick={() => setActiveAction('select')}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleRescheduleConfirm}
            disabled={isSubmitting || !selectedDate || !selectedTime}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel - Fixed size matching BookingModal */}
        <div className="relative inline-block w-[720px] h-[580px] text-left align-bottom transition-all transform bg-white rounded-xl shadow-xl sm:my-8 sm:align-middle flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
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
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            {activeAction === 'cancel' ? (
              <div className="h-full flex flex-col">
                <button
                  onClick={() => setActiveAction('select')}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 mb-4"
                  disabled={isSubmitting}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full max-w-2xl">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">
                        Cancel Appointment
                      </h4>

                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Are you sure you want to cancel this appointment? This action will send a cancellation request to the booking system.
                        </p>

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
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? 'Sending...' : 'Cancel Booking'}
                          </button>
                          <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-blue-600 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeAction === 'reschedule-calendar' ? (
              renderCalendarStage()
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="w-full max-w-2xl">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleRescheduleStart}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 text-left bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Clock } from 'lucide-react'
import { CallWindow } from '@/types/leads'
import { logger } from '@/lib/logging'

interface CallWindowTimerProps {
  callWindows?: CallWindow[] | null
  businessTimezone?: string
}

export function CallWindowTimer({ callWindows, businessTimezone = 'UTC' }: CallWindowTimerProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  // Find call window 1 data
  const callWindow1 = useMemo(() => {
    if (!callWindows) return null
    return callWindows.find(window => window.callNumber === 1) || null
  }, [callWindows])

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Check if current time is within window range and calculate 30-minute countdown
  const timerData = useMemo(() => {
    if (!callWindow1 || !callWindow1.window_start_at || !callWindow1.window_end_at) {
      return { shouldShow: false, timeLeft: 0, formattedTime: '00:00' }
    }

    try {
      // Convert window times to Date objects in the business timezone
      const startTime = new Date(callWindow1.window_start_at)
      const endTime = new Date(callWindow1.window_end_at)

      // Check if dates are valid
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        logger.error('Invalid window times', {
          start: callWindow1.window_start_at,
          end: callWindow1.window_end_at
        })
        return { shouldShow: false, timeLeft: 0, formattedTime: '00:00' }
      }

      // Get current time in UTC (all times are stored in UTC)
      const now = currentTime

      // Check if current time is within the window range
      const isWithinWindow = now >= startTime && now <= endTime

      if (!isWithinWindow) {
        return { shouldShow: false, timeLeft: 0, formattedTime: '00:00' }
      }

      // Calculate 30-minute timer from window_start_at
      const timerDurationMs = 30 * 60 * 1000 // 30 minutes in milliseconds
      const timerEndTime = new Date(startTime.getTime() + timerDurationMs)

      // Calculate time left in the 30-minute timer
      const timeLeftMs = timerEndTime.getTime() - now.getTime()

      if (timeLeftMs <= 0) {
        return { shouldShow: false, timeLeft: 0, formattedTime: '00:00' }
      }

      // Convert to minutes and seconds
      const totalSeconds = Math.floor(timeLeftMs / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60

      // Format as MM:SS
      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

      logger.debug('Timer calculation (30-minute countdown)', {
        callWindow: callWindow1.callNumber,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        timerEndTime: timerEndTime.toISOString(),
        currentTime: now.toISOString(),
        isWithinWindow,
        timeLeftMs,
        minutes,
        seconds,
        formattedTime
      })

      return {
        shouldShow: true,
        timeLeft: timeLeftMs,
        formattedTime
      }

    } catch (error) {
      logger.error('Timer calculation error', { error, callWindow1 })
      return { shouldShow: false, timeLeft: 0, formattedTime: '00:00' }
    }
  }, [callWindow1, currentTime, businessTimezone])

  // Don't render if timer shouldn't be shown
  if (!timerData.shouldShow) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
      <Clock className="w-4 h-4 text-orange-600" />
      <span className="text-sm font-medium text-orange-700 font-mono">
        {timerData.formattedTime}
      </span>
    </div>
  )
}
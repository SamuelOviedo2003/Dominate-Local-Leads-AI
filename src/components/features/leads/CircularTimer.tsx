'use client'

import { useState, useEffect, useMemo } from 'react'
import { CallWindow } from '@/types/leads'
import { logger } from '@/lib/logging'

interface CircularTimerProps {
  callWindows?: CallWindow[] | null
  businessTimezone?: string
  size?: 'sm' | 'md' | 'lg'
  workingHours?: boolean // Working hours value from leads table
}

export function CircularTimer({ callWindows, businessTimezone = 'UTC', size = 'md', workingHours }: CircularTimerProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-8 h-8',
      svg: 32,
      strokeWidth: 3,
      fontSize: 'text-[8px]',
      radius: 13
    },
    md: {
      container: 'w-14 h-14',
      svg: 56,
      strokeWidth: 4,
      fontSize: 'text-xs',
      radius: 24
    },
    lg: {
      container: 'w-20 h-20',
      svg: 80,
      strokeWidth: 5,
      fontSize: 'text-sm',
      radius: 35
    }
  }

  const config = sizeConfig[size]

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

  // Check if current time is within window range and calculate 30-minute count-up timer
  const timerData = useMemo(() => {
    if (!callWindow1 || !callWindow1.window_start_at || !callWindow1.window_end_at) {
      return { shouldShow: false, timeLeft: 0, formattedTime: '00:00', progress: 0 }
    }

    // Timer only shows if call_window = 1 AND working_hours = true (from leads table)
    if (workingHours !== true) {
      return { shouldShow: false, timeLeft: 0, formattedTime: '00:00', progress: 0 }
    }

    try {
      const startTime = new Date(callWindow1.window_start_at)
      const endTime = new Date(callWindow1.window_end_at)

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return { shouldShow: false, timeLeft: 0, formattedTime: '00:00', progress: 0 }
      }

      const now = currentTime
      const isWithinWindow = now >= startTime && now <= endTime

      if (!isWithinWindow) {
        return { shouldShow: false, timeLeft: 0, formattedTime: '00:00', progress: 0 }
      }

      const elapsedMs = now.getTime() - startTime.getTime()
      const timerDurationMs = 30 * 60 * 1000 // 30 minutes

      if (elapsedMs >= timerDurationMs) {
        return { shouldShow: false, timeLeft: 0, formattedTime: '30:00', progress: 100 }
      }

      const totalSeconds = Math.floor(elapsedMs / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60

      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      const progress = (elapsedMs / timerDurationMs) * 100

      return {
        shouldShow: true,
        timeLeft: timerDurationMs - elapsedMs,
        formattedTime,
        progress
      }
    } catch (error) {
      logger.error('Circular timer calculation error', { error, callWindow1 })
      return { shouldShow: false, timeLeft: 0, formattedTime: '00:00', progress: 0 }
    }
  }, [callWindow1, currentTime, workingHours])

  if (!timerData.shouldShow) {
    return null
  }

  // SVG circle calculations
  const circumference = 2 * Math.PI * config.radius
  const strokeDashoffset = circumference - (timerData.progress / 100) * circumference

  // Determine color based on progress
  const getColor = () => {
    if (timerData.progress < 50) return { stroke: '#ef4444', bg: '#fee2e2' } // Red
    if (timerData.progress < 75) return { stroke: '#f97316', bg: '#ffedd5' } // Orange
    return { stroke: '#eab308', bg: '#fef9c3' } // Yellow
  }

  const colors = getColor()

  return (
    <div className={`relative ${config.container} flex items-center justify-center`}>
      {/* Background circle */}
      <svg
        className="absolute top-0 left-0 transform -rotate-90"
        width={config.svg}
        height={config.svg}
      >
        {/* Background track */}
        <circle
          cx={config.svg / 2}
          cy={config.svg / 2}
          r={config.radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={config.strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={config.svg / 2}
          cy={config.svg / 2}
          r={config.radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={config.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>

      {/* Time display */}
      <div className={`absolute inset-0 flex items-center justify-center ${config.fontSize} font-mono font-bold`} style={{ color: colors.stroke }}>
        {timerData.formattedTime}
      </div>
    </div>
  )
}

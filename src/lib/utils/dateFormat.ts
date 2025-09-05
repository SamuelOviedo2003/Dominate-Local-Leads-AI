/**
 * Date formatting utilities with timezone support
 */

import { logger } from '@/lib/logging'

/**
 * Format a date string to a user-friendly format using the specified timezone
 * @param dateString - ISO 8601 date string
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @param options - Additional formatting options
 * @returns Formatted date string in "Sep 1 at 2:30 PM" format
 */
export function formatCallWindowTime(
  dateString: string, 
  timezone: string = 'UTC',
  options: {
    includeYear?: boolean
    use24Hour?: boolean
  } = {}
): string {
  logger.debug('formatCallWindowTime called', { dateString, timezone, options })
  
  if (!dateString) {
    logger.debug('Empty dateString provided', { dateString })
    return 'Invalid date'
  }
  
  const { includeYear = false, use24Hour = false } = options
  
  try {
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: !use24Hour
    }
    
    if (includeYear) {
      formatOptions.year = 'numeric'
    }
    
    const formatter = new Intl.DateTimeFormat('en-US', formatOptions)
    const parts = formatter.formatToParts(date)
    
    // Extract parts for custom formatting
    const month = parts.find(p => p.type === 'month')?.value
    const day = parts.find(p => p.type === 'day')?.value
    const hour = parts.find(p => p.type === 'hour')?.value
    const minute = parts.find(p => p.type === 'minute')?.value
    const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value
    const year = includeYear ? parts.find(p => p.type === 'year')?.value : null
    
    // Build the formatted string
    let formattedDate = `${month} ${day}`
    if (includeYear) {
      formattedDate += `, ${year}`
    }
    formattedDate += ` at ${hour}:${minute}`
    if (dayPeriod) {
      formattedDate += ` ${dayPeriod}`
    }
    
    logger.debug('Successfully formatted date', { input: dateString, output: formattedDate, timezone })
    return formattedDate
    
  } catch (error) {
    logger.error('Date formatting failed', { dateString, timezone, error })
    return 'Invalid date'
  }
}

/**
 * Format a date for display in call windows with timezone support
 * Specifically handles the called_out timestamp format
 * @param dateString - ISO 8601 date string
 * @param timezone - IANA timezone identifier
 * @returns Formatted string like "Sep 1 at 2:30 PM"
 */
export function formatCalledOutTime(dateString: string, timezone: string = 'UTC'): string {
  return formatCallWindowTime(dateString, timezone)
}

/**
 * Get current year to determine if we should include year in formatting
 */
export function shouldIncludeYear(dateString: string): boolean {
  try {
    const date = new Date(dateString)
    const currentYear = new Date().getFullYear()
    return date.getFullYear() !== currentYear
  } catch {
    return false
  }
}

/**
 * Convert time from mm:ss format to "X min Y sec" format
 * @param timeString - Time in mm:ss format (e.g., "18:57")
 * @returns Formatted time string (e.g., "18 min 57 sec")
 */
export function convertMMSSToMinSec(timeString: string): string {
  logger.debug('convertMMSSToMinSec called', { timeString })
  
  if (!timeString || typeof timeString !== 'string') {
    logger.debug('Invalid timeString provided', { timeString })
    return timeString || 'No response'
  }
  
  // Check if already in "X min Y sec" format
  if (timeString.includes('min') && timeString.includes('sec')) {
    logger.debug('Time already in min sec format', { timeString })
    return timeString
  }
  
  try {
    // Handle mm:ss format
    const timeParts = timeString.split(':')
    
    if (timeParts.length !== 2) {
      logger.debug('Time not in mm:ss format, returning as-is', { timeString })
      return timeString
    }
    
    const minutes = parseInt(timeParts[0] || '0', 10)
    const seconds = parseInt(timeParts[1] || '0', 10)
    
    // Validate parsed values
    if (isNaN(minutes) || isNaN(seconds)) {
      logger.debug('Failed to parse minutes/seconds', { timeString, minutes, seconds })
      return timeString
    }
    
    const formattedTime = `${minutes} min ${seconds} sec`
    logger.debug('Successfully converted time format', { input: timeString, output: formattedTime })
    return formattedTime
    
  } catch (error) {
    logger.error('Error converting time format', { timeString, error })
    return timeString
  }
}

/**
 * Format multiple timestamps with timezone support
 * Useful for bulk formatting operations
 */
export function formatMultipleCallTimes(
  timestamps: (string | null)[],
  timezone: string = 'UTC'
): (string | null)[] {
  return timestamps.map(timestamp => 
    timestamp ? formatCallWindowTime(timestamp, timezone) : null
  )
}
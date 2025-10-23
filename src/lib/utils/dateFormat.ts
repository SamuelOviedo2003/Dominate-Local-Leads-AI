/**
 * Date formatting utilities with timezone support
 */

import { logger } from '@/lib/logging'
import { logTimezoneOperation } from './timezoneDebug'

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
 * Format a time string to show only time (no date) with timezone support
 * @param dateString - ISO 8601 date string
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @param use24Hour - Whether to use 24-hour format (default: false for 12-hour with AM/PM)
 * @returns Formatted time string in "2:30 PM" format
 */
export function formatTimeOnly(
  dateString: string,
  timezone: string = 'UTC',
  use24Hour: boolean = false
): string {
  logger.debug('formatTimeOnly called', { dateString, timezone, use24Hour })

  if (!dateString) {
    logger.debug('Empty dateString provided', { dateString })
    return 'Invalid time'
  }

  try {
    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid time'
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: !use24Hour
    }

    const formatter = new Intl.DateTimeFormat('en-US', formatOptions)
    const formatted = formatter.format(date)

    logger.debug('Successfully formatted time', { input: dateString, output: formatted, timezone })
    return formatted

  } catch (error) {
    logger.error('Time formatting failed', { dateString, timezone, error })
    return 'Invalid time'
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

/**
 * Format a date for "RECEIVED" timestamp display with timezone support
 * @param dateString - ISO 8601 date string
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @returns Formatted string like "Wed, Oct 22, 2:38 PM"
 */
export function formatReceivedTimestamp(
  dateString: string,
  timezone: string = 'UTC'
): string {
  logger.debug('formatReceivedTimestamp called', { dateString, timezone })

  if (!dateString) {
    logger.debug('Empty dateString provided', { dateString })
    return 'Invalid date'
  }

  try {
    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }

    const formatter = new Intl.DateTimeFormat('en-US', formatOptions)
    const formatted = formatter.format(date)

    logger.debug('Successfully formatted received timestamp', { input: dateString, output: formatted, timezone })

    // Enhanced timezone debug logging
    logTimezoneOperation('Lead Received Timestamp', timezone, dateString, formatted)

    return formatted

  } catch (error) {
    logger.error('Received timestamp formatting failed', { dateString, timezone, error })
    return 'Invalid date'
  }
}

/**
 * Format a date for Communications History with timezone support
 * @param dateString - ISO 8601 date string
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @returns Formatted string like "Oct 22, 2025, 2:52 PM"
 */
export function formatCommunicationTimestamp(
  dateString: string,
  timezone: string = 'UTC'
): string {
  logger.debug('formatCommunicationTimestamp called', { dateString, timezone })

  if (!dateString) {
    logger.debug('Empty dateString provided', { dateString })
    return 'Invalid date'
  }

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
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }

    const formatter = new Intl.DateTimeFormat('en-US', formatOptions)
    const formatted = formatter.format(date)

    logger.debug('Successfully formatted communication timestamp', { input: dateString, output: formatted, timezone })
    return formatted

  } catch (error) {
    logger.error('Communication timestamp formatting failed', { dateString, timezone, error })
    return 'Invalid date'
  }
}

/**
 * Format a date for table display with timezone support
 * Used in LeadsTable, RecentLeadsTable, WaitingToCallTable, FollowUpTable
 * @param dateString - ISO 8601 date string
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @returns Formatted string like "Wed, Oct 22, 2:38 PM" (same format as Received timestamp)
 */
export function formatTableTimestamp(
  dateString: string,
  timezone: string = 'UTC'
): string {
  // Use the same format as Received timestamp for consistency
  return formatReceivedTimestamp(dateString, timezone)
}
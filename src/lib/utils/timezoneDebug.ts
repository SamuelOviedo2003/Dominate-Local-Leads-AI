/**
 * Timezone Debug Utility
 *
 * Provides comprehensive timezone debugging capabilities for time-based labels.
 * Helps identify what timezone is being used to render timestamps across the application.
 */

import { logger } from '@/lib/logging'

export interface TimezoneDebugInfo {
  timezone: string
  currentTime: string
  offset: string
  abbreviation: string
  isDST: boolean
  location: string
  formattedExample: string
}

/**
 * Get comprehensive timezone information for debugging
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @param location - Optional location identifier (e.g., 'LeadInformation', 'CommunicationsHistory')
 */
export function getTimezoneDebugInfo(
  timezone: string = 'UTC',
  location?: string
): TimezoneDebugInfo {
  const now = new Date()

  try {
    // Get formatted current time in the timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    })

    const formatted = formatter.format(now)
    const parts = formatter.formatToParts(now)

    // Extract timezone abbreviation (e.g., 'EST', 'PST', 'CST')
    const tzNamePart = parts.find(p => p.type === 'timeZoneName')
    const abbreviation = tzNamePart?.value || 'Unknown'

    // Calculate offset in hours
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60)
    const offsetHours = offsetMinutes / 60
    const offsetSign = offsetHours >= 0 ? '+' : '-'
    const offset = `UTC${offsetSign}${Math.abs(offsetHours).toFixed(1)}`

    // Check if DST is in effect (simplified check)
    const isDST = abbreviation.includes('DT') || abbreviation.includes('D')

    // Create example formatted timestamp
    const exampleDate = new Date('2025-10-22T14:38:00Z')
    const formattedExample = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(exampleDate)

    const debugInfo: TimezoneDebugInfo = {
      timezone,
      currentTime: formatted,
      offset,
      abbreviation,
      isDST,
      location: location || 'Unknown',
      formattedExample
    }

    // Log to console if debug mode is enabled
    logger.debug(`[TIMEZONE DEBUG] ${location || 'General'}`, debugInfo)

    return debugInfo

  } catch (error) {
    logger.error('Failed to get timezone debug info', { timezone, location, error })

    return {
      timezone,
      currentTime: 'Error',
      offset: 'Unknown',
      abbreviation: 'Unknown',
      isDST: false,
      location: location || 'Unknown',
      formattedExample: 'Error'
    }
  }
}

/**
 * Log timezone information for a specific rendering operation
 * @param operation - Description of what's being rendered (e.g., 'Lead received timestamp')
 * @param timezone - IANA timezone identifier
 * @param timestamp - The actual timestamp being formatted
 * @param formattedResult - The formatted result
 */
export function logTimezoneOperation(
  operation: string,
  timezone: string,
  timestamp: string,
  formattedResult: string
): void {
  logger.debug(`[TIMEZONE] ${operation}`, {
    timezone,
    input: timestamp,
    output: formattedResult,
    debugInfo: getTimezoneDebugInfo(timezone, operation)
  })
}

/**
 * Compare two timezones to show the difference
 * Useful for debugging timezone mismatches
 */
export function compareTimezones(
  timezone1: string,
  timezone2: string,
  sampleDate?: Date
): {
  timezone1Info: TimezoneDebugInfo
  timezone2Info: TimezoneDebugInfo
  timeDifferenceMinutes: number
} {
  const date = sampleDate || new Date()

  const tz1Date = new Date(date.toLocaleString('en-US', { timeZone: timezone1 }))
  const tz2Date = new Date(date.toLocaleString('en-US', { timeZone: timezone2 }))

  const differenceMs = tz2Date.getTime() - tz1Date.getTime()
  const differenceMinutes = differenceMs / (1000 * 60)

  const result = {
    timezone1Info: getTimezoneDebugInfo(timezone1, 'Comparison TZ1'),
    timezone2Info: getTimezoneDebugInfo(timezone2, 'Comparison TZ2'),
    timeDifferenceMinutes: differenceMinutes
  }

  logger.info('[TIMEZONE COMPARISON]', {
    timezone1,
    timezone2,
    differenceMinutes,
    result
  })

  return result
}

/**
 * Get a user-friendly timezone label
 * @param timezone - IANA timezone identifier
 */
export function getTimezoneFriendlyName(timezone: string): string {
  if (!timezone || timezone === 'UTC') {
    return 'UTC (Universal Time)'
  }

  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'long'
  })

  const parts = formatter.formatToParts(now)
  const tzNamePart = parts.find(p => p.type === 'timeZoneName')

  return tzNamePart?.value || timezone
}

/**
 * Get timezone abbreviation (e.g., 'EST', 'PST', 'CST')
 */
export function getTimezoneAbbreviation(timezone: string): string {
  if (!timezone || timezone === 'UTC') {
    return 'UTC'
  }

  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  })

  const parts = formatter.formatToParts(now)
  const tzNamePart = parts.find(p => p.type === 'timeZoneName')

  return tzNamePart?.value || timezone.split('/').pop() || 'Unknown'
}

/**
 * Validate if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

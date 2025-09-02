/**
 * Date formatting utilities with timezone support
 */

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
  console.log(`[DEBUG] formatCallWindowTime called with:`, { dateString, timezone, options })
  
  if (!dateString) {
    console.log(`[DEBUG] Empty dateString, returning 'Invalid date'`)
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
    
    console.log(`[DEBUG] Successfully formatted date: "${formattedDate}"`)
    return formattedDate
    
  } catch (error) {
    console.error('Error formatting date:', error)
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
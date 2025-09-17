/**
 * Phone number utility functions for formatting and validation
 */

/**
 * Formats a phone number for Dialpad URL integration
 * Ensures the phone number is properly formatted with country code for Dialpad's dialpad:// protocol
 * 
 * @param phone - The phone number to format (can be null, undefined, or string)
 * @returns Formatted phone number for Dialpad URL or null if invalid
 * 
 * @example
 * formatPhoneForDialpad("(555) 123-4567") // Returns "+15551234567"
 * formatPhoneForDialpad("+1 555-123-4567") // Returns "+15551234567"
 * formatPhoneForDialpad("555.123.4567") // Returns "+15551234567"
 * formatPhoneForDialpad("+44 20 1234 5678") // Returns "+442012345678"
 * formatPhoneForDialpad("") // Returns null
 * formatPhoneForDialpad(null) // Returns null
 */
export function formatPhoneForDialpad(phone: string | null | undefined): string | null {
  // Return null for empty or invalid inputs
  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    return null
  }

  // Remove all non-digit characters except the leading +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // If the number is empty after cleaning, return null
  if (cleaned.length === 0) {
    return null
  }
  
  // If it already starts with +, return as-is (assuming it has country code)
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  
  // If it starts with 1 and has 11 digits total, it's likely a US/Canada number with country code
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `+${cleaned}`
  }
  
  // If it has 10 digits, assume it's a US/Canada number and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }
  
  // If it has 11 digits and doesn't start with 1, assume it's international without +
  if (cleaned.length === 11) {
    return `+${cleaned}`
  }
  
  // For other lengths, assume it needs +1 prefix (US default)
  // This handles cases like 7-digit local numbers by assuming US context
  if (cleaned.length >= 7 && cleaned.length <= 15) {
    return `+1${cleaned}`
  }
  
  // If we can't determine a valid format, return null
  return null
}

/**
 * Creates a Dialpad URL for calling a phone number
 * 
 * @param phone - The phone number to call
 * @returns Dialpad URL string or null if phone number is invalid
 * 
 * @example
 * createDialpadUrl("(555) 123-4567") // Returns "dialpad://call?number=+15551234567"
 * createDialpadUrl("") // Returns null
 */
export function createDialpadUrl(phone: string | null | undefined): string | null {
  const formattedPhone = formatPhoneForDialpad(phone)
  
  if (!formattedPhone) {
    return null
  }
  
  return `dialpad://call?number=${formattedPhone}`
}

/**
 * Creates a business-specific Dialpad URL with custom data for lead tracking
 *
 * @param phone - The lead's phone number to call
 * @param dialpadPhone - The business dialpad phone number (fromNumber)
 * @param leadId - The lead ID for custom tracking data
 * @returns Business Dialpad URL string or null if phone number is invalid
 *
 * @example
 * createBusinessDialpadUrl("(555) 123-4567", "+1234567890", "123")
 * // Returns "dialpad://+15551234567?fromNumber=+1234567890&customData=lead_id%3D123"
 */
export function createBusinessDialpadUrl(
  phone: string | null | undefined,
  dialpadPhone: string | null | undefined,
  leadId: string | number
): string | null {
  const formattedPhone = formatPhoneForDialpad(phone)

  if (!formattedPhone) {
    return null
  }

  // Build the URL with the specific format requested
  let url = `dialpad://${formattedPhone}`

  // Add fromNumber if dialpadPhone is provided
  if (dialpadPhone) {
    const formattedDialpadPhone = formatPhoneForDialpad(dialpadPhone)
    if (formattedDialpadPhone) {
      url += `?fromNumber=${formattedDialpadPhone}`
    }
  }

  // Add customData with lead_id (URL encoded)
  const customData = `lead_id%3D${leadId}` // URL encoded "lead_id=123"
  if (url.includes('?')) {
    url += `&customData=${customData}`
  } else {
    url += `?customData=${customData}`
  }

  return url
}

/**
 * Validates if a phone number can be used for Dialpad calling
 *
 * @param phone - The phone number to validate
 * @returns true if the phone number is valid for Dialpad, false otherwise
 */
export function isValidDialpadPhone(phone: string | null | undefined): boolean {
  return formatPhoneForDialpad(phone) !== null
}
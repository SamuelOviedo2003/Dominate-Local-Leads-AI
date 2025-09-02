/**
 * Type utility functions for safe type conversions
 * Handles the business_id string/number conversion and other type safety issues
 */

import { logger } from './logging'

/**
 * Safely converts business_id from string to number
 * Handles the inconsistency between auth system (string) and database (number)
 */
export function parseBusinessId(businessId: string | number | null | undefined): number | null {
  if (businessId === null || businessId === undefined) {
    return null
  }

  if (typeof businessId === 'number') {
    return businessId
  }

  const parsed = parseInt(businessId, 10)
  if (isNaN(parsed)) {
    logger.warn('Invalid business_id provided', { businessId, type: typeof businessId })
    return null
  }

  return parsed
}

/**
 * Safely converts business_id with validation and fallback
 * Throws an error for critical operations where business_id is required
 */
export function requireValidBusinessId(businessId: string | number | null | undefined, context?: string): number {
  const parsed = parseBusinessId(businessId)
  
  if (parsed === null) {
    const errorMessage = context 
      ? `Invalid business_id in ${context}` 
      : 'Invalid business_id provided'
    
    logger.error(errorMessage, { businessId, context })
    throw new Error(errorMessage)
  }

  return parsed
}

/**
 * Converts lead_id to number safely
 * Database expects smallint but params come as string
 */
export function parseLeadId(leadId: string | number | null | undefined): number | null {
  if (leadId === null || leadId === undefined) {
    return null
  }

  if (typeof leadId === 'number') {
    return leadId
  }

  const parsed = parseInt(leadId, 10)
  if (isNaN(parsed)) {
    logger.warn('Invalid lead_id provided', { leadId, type: typeof leadId })
    return null
  }

  return parsed
}

/**
 * Safely converts lead_id with validation and error throwing
 */
export function requireValidLeadId(leadId: string | number | null | undefined, context?: string): number {
  const parsed = parseLeadId(leadId)
  
  if (parsed === null) {
    const errorMessage = context 
      ? `Invalid lead_id in ${context}` 
      : 'Invalid lead_id provided'
    
    logger.error(errorMessage, { leadId, context })
    throw new Error(errorMessage)
  }

  return parsed
}

/**
 * Type guard to check if a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

/**
 * Type guard to check if a string can be parsed as a number
 */
export function isNumericString(value: string): boolean {
  return !isNaN(parseInt(value, 10))
}

/**
 * Safely converts string to number with validation
 */
export function safeStringToNumber(value: string | null | undefined, fallback: number = 0): number {
  if (!value) {
    return fallback
  }

  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Enhanced type definitions for better type safety
 */
export type SafeBusinessId = number
export type SafeLeadId = number
export type SafeUserId = string // Auth IDs are always strings

/**
 * Type conversion result with success/error status
 */
export interface TypeConversionResult<T> {
  success: boolean
  value?: T
  error?: string
}

/**
 * Safely converts value with error handling
 */
export function safeConvert<T>(
  converter: () => T,
  context?: string
): TypeConversionResult<T> {
  try {
    const value = converter()
    return { success: true, value }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error'
    logger.error('Type conversion failed', { context, error: errorMessage })
    return { success: false, error: errorMessage }
  }
}
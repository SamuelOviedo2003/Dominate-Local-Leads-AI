/**
 * Comprehensive input validation schemas using Zod
 * Provides type-safe validation for all API endpoints and user inputs
 */

import { z } from 'zod'
import { CALLER_TYPE_OPTIONS, TIME_PERIODS, MEDAL_TIERS } from './constants'

// Base validation schemas
export const businessIdSchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    const num = typeof val === 'number' ? val : parseInt(val, 10)
    if (isNaN(num) || num < 1) {
      throw new Error('business_id must be a positive integer')
    }
    return num
  })
  .refine((val) => val > 0, 'business_id must be greater than 0')

export const leadIdSchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    const num = typeof val === 'number' ? val : parseInt(val, 10)
    if (isNaN(num) || num < 1) {
      throw new Error('lead_id must be a positive integer')
    }
    return num
  })
  .refine((val) => val > 0, 'lead_id must be greater than 0')

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one lowercase letter, one uppercase letter, and one number'
  )

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]{10,15}$/, 'Invalid phone number format')
  .optional()

export const timezoneSchema = z
  .string()
  .regex(
    /^[A-Za-z_]+\/[A-Za-z_]+$/,
    'Invalid timezone format (expected format: Continent/City)'
  )
  .default('UTC')

// API Request Validation Schemas

// Authentication Schemas
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
  fullName: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters'),
  businessId: businessIdSchema.optional().default(1)
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// Lead Management Schemas
export const createLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  email: emailSchema.optional(),
  phone: phoneSchema,
  service: z.string().min(1, 'Service is required').max(100, 'Service must be less than 100 characters'),
  howSoon: z.enum(['ASAP', 'week', 'month', 'unsure']).default('unsure'),
  score: z.number().min(0).max(100).optional(),
  businessId: businessIdSchema
})

export const updateLeadSchema = z.object({
  leadId: leadIdSchema,
  businessId: businessIdSchema,
  callerType: z.enum(CALLER_TYPE_OPTIONS).nullable().optional(),
  startTime: z.string().datetime().optional().nullable(),
  show: z.boolean().optional(),
  closedAmount: z.number().min(0).optional().nullable()
})

// Query Parameter Schemas
export const timePeriodSchema = z
  .string()
  .transform((val) => parseInt(val, 10))
  .refine((val) => Object.values(TIME_PERIODS).includes(val as any), {
    message: `Time period must be one of: ${Object.values(TIME_PERIODS).join(', ')}`
  })

export const paginationSchema = z.object({
  page: z.string().optional().default('1').transform(val => Math.max(1, parseInt(val, 10))),
  limit: z.string().optional().default('20').transform(val => Math.min(100, Math.max(1, parseInt(val, 10))))
})

// Call Window Schemas
export const callWindowSchema = z.object({
  callNumber: z.number().min(1).max(6),
  windowStartAt: z.string().datetime().optional(),
  windowEndAt: z.string().datetime().optional(),
  calledAt: z.string().datetime().optional().nullable(),
  calledOut: z.string().datetime().optional().nullable(),
  medalTier: z.enum([MEDAL_TIERS.DIAMOND, MEDAL_TIERS.GOLD, MEDAL_TIERS.SILVER, MEDAL_TIERS.BRONZE]).optional().nullable(),
  responseTime: z.string().optional(),
  businessId: businessIdSchema,
  accountId: z.string().uuid()
})

// Incoming Calls Schemas
export const callerTypeSchema = z.enum(CALLER_TYPE_OPTIONS).nullable()

export const updateCallerTypeSchema = z.object({
  callId: z.string().uuid('Invalid call ID format'),
  businessId: businessIdSchema,
  callerType: callerTypeSchema
})

export const incomingCallSchema = z.object({
  source: z.string().min(1, 'Source is required').max(50, 'Source must be less than 50 characters'),
  callerType: callerTypeSchema,
  duration: z.number().min(0).max(86400), // Max 24 hours in seconds
  assignedId: z.string().uuid().optional().nullable(),
  assigned: z.string().max(100).optional().nullable(),
  recordingUrl: z.string().url().optional().nullable(),
  callSummary: z.string().max(1000).optional().nullable(),
  businessId: businessIdSchema
})

// Business/Company Schemas
export const businessSwitchSchema = z.object({
  businessId: businessIdSchema,
  userId: z.string().uuid()
})

export const businessClientSchema = z.object({
  businessId: businessIdSchema,
  companyName: z.string().min(1, 'Company name is required').max(200, 'Company name must be less than 200 characters'),
  avatarUrl: z.string().url().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  timeZone: timezoneSchema
})

// Platform Spend Schemas
export const platformSpendSchema = z.object({
  platform: z.string().min(1, 'Platform is required').max(50, 'Platform must be less than 50 characters'),
  spend: z.number().min(0, 'Spend cannot be negative'),
  businessId: businessIdSchema,
  createdAt: z.string().datetime().optional()
})

// Communication Schemas
export const communicationSchema = z.object({
  accountId: z.string().uuid(),
  messageType: z.enum(['email', 'sms', 'call', 'voicemail']),
  summary: z.string().max(1000).optional().nullable(),
  recordingUrl: z.string().url().optional().nullable(),
  createdAt: z.string().datetime().optional()
})

// Settings/Profile Schemas
export const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters').optional(),
  avatarUrl: z.string().url().optional().nullable(),
  timezone: timezoneSchema.optional()
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword']
})

// API Response Schemas
export const apiResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional()
})

export const paginatedResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  success: z.boolean(),
  data: z.array(dataSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number()
  }).optional(),
  error: z.string().optional()
})

// Utility function to validate and transform API request data
export function validateRequest<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context?: string
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      
      return {
        success: false,
        error: context ? `${context}: ${errorMessage}` : errorMessage
      }
    }
    
    return {
      success: false,
      error: context ? `${context}: Validation failed` : 'Validation failed'
    }
  }
}

// Middleware helper for API route validation
export function createValidatedHandler<TInput, TOutput>(
  inputSchema: z.ZodType<TInput>,
  handler: (validatedInput: TInput) => Promise<TOutput>
) {
  return async (rawInput: unknown): Promise<{ success: true; data: TOutput } | { success: false; error: string }> => {
    const validation = validateRequest(inputSchema, rawInput)
    
    if (!validation.success) {
      return validation
    }
    
    try {
      const result = await handler(validation.data)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Handler execution failed'
      }
    }
  }
}

// Type exports for better TypeScript integration
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type UpdateCallerTypeInput = z.infer<typeof updateCallerTypeSchema>
export type BusinessSwitchInput = z.infer<typeof businessSwitchSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
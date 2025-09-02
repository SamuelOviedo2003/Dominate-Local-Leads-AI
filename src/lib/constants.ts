/**
 * Centralized constants for the Lead Management System
 * Extracted hardcoded values to improve maintainability
 */

// Time Period Filters (used across multiple components)
export const TIME_PERIODS = {
  SEVEN_DAYS: 7,
  FIFTEEN_DAYS: 15,
  THIRTY_DAYS: 30,
  SIXTY_DAYS: 60,
  NINETY_DAYS: 90
} as const

export const TIME_PERIOD_OPTIONS = [
  { value: TIME_PERIODS.SEVEN_DAYS, label: '7 days' },
  { value: TIME_PERIODS.FIFTEEN_DAYS, label: '15 days' },
  { value: TIME_PERIODS.THIRTY_DAYS, label: '30 days' },
  { value: TIME_PERIODS.SIXTY_DAYS, label: '60 days' },
  { value: TIME_PERIODS.NINETY_DAYS, label: '90 days' }
] as const

// Call Window Medal Tiers
export const MEDAL_TIERS = {
  DIAMOND: 'diamond',
  GOLD: 'gold',
  SILVER: 'silver',
  BRONZE: 'bronze'
} as const

export const MEDAL_TIER_THRESHOLDS = {
  DIAMOND_MAX_MINUTES: 1,
  GOLD_MAX_MINUTES: 2,
  SILVER_MAX_MINUTES: 5,
  BRONZE_MAX_MINUTES: 10
} as const

// Color Schemes for UI Components
export const COLOR_SCHEMES = {
  BLUE: 'blue',
  RED: 'red',
  GREEN: 'green',
  PURPLE: 'purple',
  GRAY: 'gray'
} as const

// Component Dimensions (extracted from hardcoded values)
export const COMPONENT_DIMENSIONS = {
  CALL_WINDOW_CONTAINER_HEIGHT: 540, // px
  CALL_WINDOW_CONTAINER_MAX_WIDTH: 320, // px
  CALL_CIRCLE_SIZE: 48, // w-12 h-12 = 48px
  LOADING_SPINNER_SIZES: {
    SM: 'sm',
    MD: 'md',
    LG: 'lg'
  }
} as const

// Loading and Animation Delays
export const LOADING_DELAYS = {
  STAGGER_DELAY_1: 300, // ms
  STAGGER_DELAY_2: 600, // ms
  STAGGER_DELAY_3: 900, // ms
  ANIMATION_DURATION: 300 // ms
} as const

// Message Type Colors for Communications
export const MESSAGE_TYPE_COLORS = {
  EMAIL: 'bg-blue-100 text-blue-800',
  SMS: 'bg-green-100 text-green-800',
  CALL: 'bg-purple-100 text-purple-800',
  VOICEMAIL: 'bg-orange-100 text-orange-800'
} as const

// Valid Caller Types
export const CALLER_TYPES = {
  CLIENT: 'Client',
  SALES_PERSON: 'Sales person',
  OTHER: 'Other',
  LOOKING_FOR_JOB: 'Looking for job'
} as const

export const CALLER_TYPE_OPTIONS = [
  CALLER_TYPES.CLIENT,
  CALLER_TYPES.SALES_PERSON,
  CALLER_TYPES.OTHER,
  CALLER_TYPES.LOOKING_FOR_JOB
] as const

// Default Values
export const DEFAULTS = {
  BUSINESS_ID: 1,
  TIMEZONE: 'UTC',
  USER_ROLE: 1, // Non-admin
  SUPER_ADMIN_ROLE: 0,
  MAX_CALL_WINDOWS: 6
} as const

// API Response Limits
export const API_LIMITS = {
  RECENT_CALLS_LIMIT: 20,
  COMMUNICATIONS_LIMIT: 100,
  MAX_RETRY_ATTEMPTS: 3
} as const

// Breakpoint thresholds for responsive design
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536
} as const

export type TimePeriod = typeof TIME_PERIODS[keyof typeof TIME_PERIODS]
export type MedalTier = typeof MEDAL_TIERS[keyof typeof MEDAL_TIERS]
export type ColorScheme = typeof COLOR_SCHEMES[keyof typeof COLOR_SCHEMES]
export type CallerType = typeof CALLER_TYPES[keyof typeof CALLER_TYPES]
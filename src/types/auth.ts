export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: number | null // Allow null roles for backward compatibility
  business_id: string // Auth system returns as string
  telegram_id: string | null
  ghl_id: string | null
  created_at: string
  updated_at: string
}

// Normalized version with proper types for database operations
export interface ProfileNormalized {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: number | null // Allow null roles for backward compatibility
  business_id: number // Converted to number for database operations
  telegram_id: string | null
  ghl_id: string | null
  created_at: string
  updated_at: string
}

export interface BusinessClient {
  business_id: string // Database returns as string from query
  company_name: string
  avatar_url: string | null
  city: string | null
  state: string | null
  time_zone: string
  created_at: string
  updated_at: string
}

// Normalized version with proper types
export interface BusinessClientNormalized {
  business_id: number // Normalized to number for consistency
  company_name: string
  avatar_url: string | null
  city: string | null
  state: string | null
  time_zone: string
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile?: Profile
  accessibleBusinesses?: BusinessSwitcherData[]
  currentBusinessId?: string
}

export interface NavigationItem {
  name: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface BusinessSwitcherData {
  business_id: string
  company_name: string
  avatar_url: string | null
  city: string | null
  state: string | null
  permalink?: string // Add permalink for URL routing
}

export interface CompanySwitchResponse {
  success: boolean
  data?: {
    company: BusinessSwitcherData
    message: string
  }
  error?: string
}

export interface AvailableCompaniesResponse {
  success: boolean
  data?: BusinessSwitcherData[]
  error?: string
}

export interface BusinessContext {
  currentBusinessId: string | null
  availableBusinesses: BusinessSwitcherData[]
  isLoading: boolean
}

export interface SetBusinessContextRequest {
  businessId: string
}

export interface SetBusinessContextResponse {
  success: boolean
  error?: string
}
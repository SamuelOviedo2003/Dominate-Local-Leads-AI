export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: number
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
  role: number
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
  businessData?: BusinessClient
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
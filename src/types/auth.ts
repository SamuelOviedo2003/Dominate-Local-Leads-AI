export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: number
  business_id: string
  created_at: string
  updated_at: string
}

export interface BusinessClient {
  business_id: string
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
export interface Lead {
  lead_id: string
  account_id: string
  business_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  service: string
  how_soon: 'ASAP' | 'week' | 'month' | string
  score: number
  status: string
  contacted: boolean
  start_time: string | null
  show: boolean
  closed_amount: number | null
  created_at: string
  working_hours?: boolean
}

export interface Client {
  account_id: string
  business_id: string
  full_address: string
  house_value: number | null
  house_url: string | null
  distance_meters: number | null
  duration_seconds: number | null
}

export interface LeadCall {
  leads_call_id: string
  lead_id: string
  assigned: string
  duration: number
  time_speed: number
  created_at: string
}

export interface LeadWithClient extends Lead {
  client?: Client
}

export interface LeadMetrics {
  total: number
  contacted: number
  booked: number
  contactRate: number
  bookingRate: number
}

export interface AppointmentSetter {
  name: string
  totalLeads: number
  contacted: number
  booked: number
  contactRate: number
  bookingRate: number
  totalCallTime: number
  avgResponseSpeed: number
}

export type TimePeriod = '30' | '60' | '90'

export interface NewLeadsFilters {
  timePeriod: TimePeriod
  startDate: string
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
}
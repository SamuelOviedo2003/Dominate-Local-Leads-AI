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
  next_step?: string
  stage: 1 | 2 // 1 = Recent Leads, 2 = Salesman Leads
}

export interface Client {
  account_id: string
  business_id: string
  full_address: string
  house_value: string | null
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
  next_step?: string
}

export interface LeadWithClient extends Lead {
  client?: Client
  callWindows?: CallWindow[]
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

export type TimePeriod = '7' | '15' | '30' | '60' | '90'

export interface NewLeadsFilters {
  timePeriod: TimePeriod
  startDate: string
}

// Incoming Calls Types
export interface IncomingCall {
  incoming_call_id: string
  source: string | null
  caller_type: string | null
  duration: number
  status: string
  created_at: string
  business_id: string
}

export interface SourceDistribution {
  source: string
  count: number
}

export interface CallerTypeDistribution {
  caller_type: string
  count: number
}

export interface SankeyData {
  source: string
  caller_type: string
  value: number
}

export interface IncomingCallsAnalytics {
  sourceDistribution: SourceDistribution[]
  callerTypeDistribution: CallerTypeDistribution[]
  sankeyData: SankeyData[]
  recentCalls: IncomingCall[]
}

export type IncomingCallsTimePeriod = '7' | '15' | '30' | '60' | '90'

export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
}

// Lead Details Types
export interface Communication {
  communication_id: string
  created_at: string
  message_type: 'email' | 'sms' | 'call' | 'voicemail' | string
  summary: string
  recording_url: string | null
}

export interface PropertyInfo {
  house_value: number | null
  distance_meters: number | null
  house_url: string | null
  full_address: string
  duration_seconds: number | null
}

export interface CallWindow {
  // Database fields
  call_window: number // 1-6 indicating call number
  window_start_at: string
  window_end_at: string  
  created_at: string
  called_at: string | null
  called_out: string | null
  business_id?: string
  account_id?: string
  
  // Business logic calculated fields
  responseTimeMinutes: number | null // Duration between created_at and called_at
  medalTier: 'gold' | 'silver' | 'bronze' | null // Performance tier based on response time
  isMissed: boolean // True if called_at is null
  callNumber: number // Same as call_window, but ensures it's always present
}

export interface LeadDetails {
  lead: Lead
  property: PropertyInfo | null
  communications: Communication[]
  callWindows: CallWindow[]
}

export type MessageType = 'email' | 'sms' | 'call' | 'voicemail'

// Salesman Types
export interface SalesmanMetrics {
  shows: number
  closes: number
  booked: number
  totalRevenue: number
  closeRate: number
  averageOrderValue: number
}

export interface SalesmanPerformance {
  salesman: string
  shows: number
  closes: number
  totalRevenue: number
  closeRate: number
  averageOrderValue: number
  leadsWorked: number
}

export interface RevenueTrendData {
  date: string
  revenue: number
  shows: number
  closes: number
}

export interface SalesmanAnalytics {
  metrics: SalesmanMetrics
  performance: SalesmanPerformance[]
  trends: RevenueTrendData[]
  timePeriod: TimePeriod
}

// Dashboard Types
export interface DashboardMetrics {
  platformSpend: number
}
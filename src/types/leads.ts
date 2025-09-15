export interface Lead {
  lead_id: string
  account_id: string
  business_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  service: string
  source?: string | null // Replaced how_soon with source
  score: number
  status: string
  contacted: boolean
  start_time: string | null
  show: boolean
  closed_amount: number | null
  created_at: string
  working_hours?: boolean
  next_step?: string
  stage: 1 | 2 | 3 // 1 = New Leads (stage 1), 2 = New Leads (stage 2), 3 = Bookings
  communications_count: number // New field to track number of communications
  call_now_status?: 1 | 2 | 3 | null // Call priority: 1 = High (red), 2 = Medium (yellow), 3 = Normal (default)
  summary?: string | null // Summary field for lead information
  score_summary?: string | null // Score-based summary field
  caller_type?: 'Client' | 'Sales person' | 'Other' | 'Looking for job' | null // Type of caller classification
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
  assigned_id: string | null
  assigned_name: string | null
  created_at: string
  business_id: string
  recording_url?: string | null
  call_summary?: string | null
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
  call_window?: number | null // Call window number (1-6) when communication is associated with a call window
}

export interface PropertyInfo {
  house_value: number | null
  distance_meters: number | null
  house_url: string | null
  full_address: string
  duration_seconds: number | null
}

export interface CallWindow {
  callNumber: number // Call number (1-6)
  medalTier?: 'diamond' | 'gold' | 'silver' | 'bronze' | null // For Call 1 only
  responseTime?: string // For Call 1 only - human-readable format
  status?: 'No call' | 'called' // For calls 2-6
  calledAt: string | null // Exact timestamp when call was made
  calledOut: string | null // Called out value for Call 1 when called_at is null
}

export interface LeadDetails {
  lead: Lead
  property: PropertyInfo | null
  communications: Communication[]
  callWindows: CallWindow[]
  businessTimezone: string // IANA timezone identifier (e.g., 'America/New_York')
}

export type MessageType = 'email' | 'sms' | 'call' | 'voicemail'

// Bookings Types (formerly Salesman)
export interface BookingsMetrics {
  shows: number
  closes: number
  booked: number
  totalRevenue: number
  closeRate: number
  totalCalls: number
  showsPercentage: number
  closesPercentage: number
}

export interface BookingsPerformance {
  salesperson: string
  shows: number
  closes: number
  totalRevenue: number
  closeRate: number
  totalCalls: number
  leadsWorked: number
}

export interface RevenueTrendData {
  date: string
  revenue: number
  shows: number
  closes: number
}

export interface BookingsAnalytics {
  metrics: BookingsMetrics
  performance: BookingsPerformance[]
  trends: RevenueTrendData[]
  timePeriod: TimePeriod
}

// Legacy types for backward compatibility
export type SalesmanMetrics = BookingsMetrics
export type SalesmanPerformance = BookingsPerformance
export type SalesmanAnalytics = BookingsAnalytics

// Actions Types
export interface AIRecapAction {
  ai_recap_action_id: number
  created_at: string
  updated_at: string
  account_id: string
  lead_id: number
  business_id: number
  assigned_id: string | null
  recap_action: string
  action_response: string | null
  action_done: boolean
}

// Dashboard Types
export interface DashboardMetrics {
  platformSpend: number
}

export interface PlatformSpend {
  platform: string
  spend: number
}

export interface TimeRange {
  startDate: string
  endDate: string
  days: number
}

export interface EnhancedDashboardMetrics {
  platformSpend: number // Legacy field for backward compatibility
  totalSpend: number
  platformSpends: PlatformSpend[]
  timeRange: TimeRange
}
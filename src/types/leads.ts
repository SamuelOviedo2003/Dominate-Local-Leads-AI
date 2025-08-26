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
  callNumber: number // Call number (1-6)
  medalTier?: 'gold' | 'silver' | 'bronze' | null // For Call 1 only
  responseTime?: string // For Call 1 only - human-readable format
  status?: 'No call' | 'called' // For calls 2-6
  calledAt: string | null // Exact timestamp when call was made
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
  showsPercentage: number
  closesPercentage: number
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
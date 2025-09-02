# Lead Management System - Product Requirements Document

## Table of Contents
- [System Overview](#system-overview)
- [Authentication & User Management](#authentication--user-management)
- [Universal Header](#universal-header)
- [Home Page](#home-page)
- [Dashboard](#dashboard)
- [New Leads](#new-leads)
- [Lead Details](#lead-details)
- [Incoming Calls](#incoming-calls)
- [Bookings](#bookings)
- [FB Analysis](#fb-analysis)
- [Settings](#settings)
- [Loading System](#loading-system)
- [Database Schema](#database-schema)
- [Technical Requirements](#technical-requirements)
- [Error Handling](#error-handling)

---

## System Overview

### Product Vision
A comprehensive lead management system for roofing businesses that tracks leads, manages communications, analyzes performance metrics, and optimizes sales processes.

### Target Users
- Roofing business owners
- Sales teams
- Appointment setters
- Business administrators

### Core Functionality
- Lead tracking and management
- Communication history and recording playback
- Performance analytics and metrics
- Multi-business support for administrators
- Real-time data synchronization

---

## Authentication & User Management

### Functional Requirements

#### Login System
- **Requirement**: Users must authenticate using email and password
- **Requirement**: Sessions must persist with automatic token refresh
- **Requirement**: All routes except login must require authentication
- **Requirement**: System must support different user roles (including Super Admin with role 0)
- **Requirement**: Each user must be associated with business data from `business_clients` table

#### Signup System
- **Requirement**: New users can create accounts with email, password, and full name
- **Requirement**: Password confirmation must match original password
- **Requirement**: Email confirmation required before account activation
- **Requirement**: Profile creation handled automatically by database triggers
- **Requirement**: New users default to business_id 1 and role 1 (non-admin)
- **Requirement**: Comprehensive error handling with user-friendly messages
- **Requirement**: Signup errors redirect to login page with error mode

#### Authentication Flow Fixes
- **Fixed**: All signup error redirects now go to `/login?error=...&mode=signup` instead of non-existent `/signup` routes
- **Fixed**: Database trigger conflicts resolved - profile creation now handled exclusively by `handle_new_user()` trigger
- **Fixed**: Email confirmation flow properly implemented with success/error messaging
- **Fixed**: NEXT_REDIRECT errors no longer caught in try-catch blocks to allow proper redirects
- **Removed**: Forgot password functionality completely disabled until proper email service configuration

#### SQL Queries Required
```sql
-- Fetch user profile after authentication
SELECT * FROM profiles WHERE id = $userId;

-- Fetch business data for authenticated user
SELECT * FROM business_clients WHERE business_id = $businessId;

-- Super Admin: Fetch all businesses with avatars
SELECT * FROM business_clients WHERE avatar_url IS NOT NULL;
```

### UI Requirements

#### Visual Design
- **Requirement**: Login forms must be centered on screen
- **Requirement**: Background must use animated gradient (blue to indigo to purple)
- **Requirement**: Forms must use glass morphism effect with backdrop blur
- **Requirement**: Company logo must display above form using LoginLogo component
- **Requirement**: Logo must maintain natural aspect ratio
- **Fixed**: Logo implementation completely redesigned for production reliability:
  - Uses custom LoginLogo component with robust fallback system
  - Implements plain HTML img tags instead of Next.js Image component
  - Primary logo: `/images/DominateLocalLeadsLogo.png`
  - Fallback options: Multiple image formats with error handling
  - Enhanced loading states and visual feedback
  - Resolves Docker deployment static asset serving issues

#### Authentication Flow
- **Requirement**: Unauthenticated users must redirect to login page
- **Requirement**: Successful login must redirect to `/dashboard` page
- **Requirement**: Super Admins must see business switcher in header if multiple businesses exist
- **Requirement**: User profile must display email initial in header avatar

### Edge Cases
- **Failed Authentication**: Must show error message and remain on login page
- **Session Expiry**: Must automatically logout and redirect to login
- **Missing Business Data**: Must show loading state until data loads

---

## Universal Header

### Functional Requirements

#### Display Requirements
- **Requirement**: Must display business logo from `business_clients.avatar_url`
- **Requirement**: Must show navigation links to all main sections
- **Requirement**: Must highlight active page in navigation
- **Requirement**: Must show authenticated user info with dropdown menu
- **Requirement**: Super Admins must see business switcher when multiple businesses available

#### Navigation Structure
Required navigation links in order:
1. Dashboard
2. New Leads
3. Salesman
4. Incoming Calls
5. FB Analysis

#### SQL Queries Required
```sql
-- Fetch business logo and details
SELECT company_name, avatar_url, time_zone 
FROM business_clients 
WHERE business_id = $businessId;

-- Super Admin: Fetch available businesses
SELECT business_id, company_name, avatar_url 
FROM business_clients 
WHERE avatar_url IS NOT NULL;
```

### UI Requirements
- **Requirement**: Header must remain static during navigation (no flickering)
- **Requirement**: Logo must maintain fixed height (`h-12`)
- **Requirement**: Navigation must collapse on mobile screens
- **Requirement**: Current page must be visually highlighted

---

## Home Page

### Functional Requirements
- **Requirement**: Must display welcome interface after authentication
- **Requirement**: Must include property-focused hero section
- **Requirement**: Must provide clear navigation to main features

### UI Requirements
- **Requirement**: Must use split layout (content left, image right)
- **Requirement**: Must display property management messaging
- **Requirement**: Must include high-quality property imagery

---

## Dashboard

### Functional Requirements

#### Platform Spend Metrics (Enhanced)
- **Requirement**: Must display platform advertising spend metrics with time period filtering
- **Requirement**: Must show total advertising expenditure for selected time ranges
- **Requirement**: Must display platform-specific spend breakdown instead of just total spend
- **Requirement**: Must show individual platform names with normalized formatting (Facebook Ads, Google Ads, etc.)
- **Requirement**: Must provide expandable/collapsible breakdown for multiple platforms
- **Requirement**: Must show immediate breakdown for single platform spending
- **Requirement**: Must include individual component loading states with purple spinners
- **Requirement**: Must support time period filters (7/15/30/60/90 days)

#### Appointment Setters Dashboard Integration
- **Requirement**: Must display appointment setter performance metrics independently from New Leads
- **Requirement**: Must use dedicated data fetching with `useAppointmentSetters` hook
- **Requirement**: Must show appointment setter carousel with navigation and performance data
- **Requirement**: Must include loading states and error handling specific to Dashboard context
- **Requirement**: Must operate independently from New Leads section data

#### SQL Queries Required
```sql
-- Platform advertising spend (Enhanced with platform breakdown)
SELECT platform, spend
FROM ad_spends
WHERE created_at >= $startDate
AND business_id = $businessId
ORDER BY created_at DESC;

-- Platform spend aggregation (performed in application):
-- GROUP BY platform with platform name normalization
-- SUM(spend) per platform with proper currency formatting
-- Total spend calculation across all platforms

-- Appointment setters performance (shared with dashboard)
SELECT l.lead_id, l.contacted, l.start_time, l.created_at, l.working_hours,
       lc.assigned, lc.duration, lc.time_speed, lc.created_at
FROM leads l
LEFT JOIN leads_calls lc ON l.lead_id = lc.lead_id
WHERE l.created_at >= $startDate
AND l.business_id = $businessId
AND lc.assigned IS NOT NULL;
```

### UI Requirements
- **Requirement**: Must use component-level loading states for each dashboard widget
- **Requirement**: Must display platform spend in prominent metric cards with expandable platform breakdown
- **Requirement**: Must show total spend prominently with time period badge
- **Requirement**: Must provide expand/collapse functionality for multiple platforms with smooth animations
- **Requirement**: Must display single platform breakdown immediately without collapsing
- **Requirement**: Must use consistent purple theme throughout platform spend components
- **Requirement**: Must show appointment setters performance with carousel navigation
- **Requirement**: Must maintain responsive design across all screen sizes
- **Requirement**: Must use unified loading system with purple spinners

---

## New Leads

### Functional Requirements

#### Lead Metrics Component (Enhanced)
- **Requirement**: Must display total leads count for selected time period
- **Requirement**: Must show contacted leads count and percentage with "Contacts" label (plural)
- **Requirement**: Must show booked leads count and percentage
- **Requirement**: Must calculate contact rate (contacted/total) with "% of leads" description
- **Requirement**: Must calculate booking rate (booked/contacted) with "% of contacts" description
- **Requirement**: Must display overall booking rate with "of leads" text in blue color theme
- **Requirement**: Must use blue color styling for lead-related metric badges

#### SQL Queries Required
```sql
-- Fetch all leads for metrics calculation
SELECT lead_id, contacted, start_time, created_at
FROM leads 
WHERE created_at >= $startDate 
AND business_id = $businessId
ORDER BY created_at DESC;

-- Metrics are calculated in application:
-- Total: COUNT(*)
-- Contacted: COUNT WHERE contacted = true
-- Booked: COUNT WHERE start_time IS NOT NULL
-- Contact Rate: (contacted/total) * 100
-- Booking Rate: (booked/contacted) * 100
```

#### Appointment Setters Component
- **Requirement**: Must display performance metrics for each appointment setter
- **Requirement**: Must show as vertical carousel with navigation arrows
- **Requirement**: Must sort by performance (booked appointments descending)
- **Requirement**: Must display: leads, contacted, booked, rates, response time, call time

#### SQL Queries Required
```sql
-- Step 1: Get base leads data
SELECT lead_id, contacted, start_time, created_at, working_hours
FROM leads
WHERE created_at >= $startDate
AND business_id = $businessId;

-- Step 2: Get appointment setter call data
SELECT lead_id, assigned, duration, time_speed, created_at
FROM leads_calls
WHERE lead_id IN ($leadIds) -- Array from Step 1
AND created_at >= $startDate
AND assigned IS NOT NULL;

-- Metrics calculated per setter:
-- Total Leads: COUNT(DISTINCT lead_id)
-- Contacted: COUNT WHERE contacted = true
-- Booked: COUNT WHERE start_time IS NOT NULL
-- Total Call Time: SUM(duration) WHERE working_hours = true
-- Avg Response Speed: AVG(time_speed) WHERE working_hours = true
```

#### Recent Leads Table
- **Requirement**: Must display leads in table format with clickable rows
- **Requirement**: Must show columns: Lead Name (with score circle), How Soon, Service, Date, Notes, Status
- **Requirement**: Must navigate to Lead Details on row click
- **Requirement**: Must use individual component loading states independent from Lead Metrics
- **Requirement**: Must show purple loading spinner during table data fetching

#### SQL Queries Required
```sql
-- Fetch recent leads with property data
SELECT l.*, c.full_address, c.house_value, c.house_url, c.distance_meters, c.duration_seconds
FROM leads l
LEFT JOIN clients c ON l.account_id = c.account_id
WHERE l.created_at >= $startDate
AND l.business_id = $businessId
ORDER BY l.created_at DESC;
```

### UI Requirements
- **Requirement**: Must use simplified 2-component layout: Lead Metrics (top) and Recent Leads Table (bottom)
- **Requirement**: Must include time period filter (7/15/30/60/90 days) in top-right
- **Requirement**: Must show individual component loading states (metrics and table load independently)
- **Requirement**: Must use CardSkeleton with individual metric cards during loading (4 cards in grid)
- **Requirement**: Must match Salesman loading pattern exactly with purple spinners
- **Requirement**: Score must display as color-coded circle (Red: 0-33%, Yellow: 34-66%, Green: 67-100%)
- **Requirement**: How Soon must use color coding (Red: ASAP, Orange: week, Blue: month, Gray: default)

#### Component Loading Architecture
- **Requirement**: Lead Metrics component must load independently with `isMetricsLoading` state
- **Requirement**: Recent Leads Table must load independently with `isRecentLeadsLoading` state
- **Requirement**: Must remove Appointment Setters component from New Leads (moved to Dashboard only)
- **Requirement**: Must use dual loading architecture: page-level coordination + component-level states

---

## Lead Details

### Functional Requirements

#### Lead Information Display
- **Requirement**: Must display complete lead profile including name, email, phone
- **Requirement**: Must show email validation status (✓/✗)
- **Requirement**: Must display service details, urgency, and metadata
- **Requirement**: Must show property information with image
- **Requirement**: Must display lead score with color coding

#### Call Windows System (Simplified)
- **Requirement**: Must display simplified call window tracking with streamlined business logic
- **Requirement**: Must show only actual scheduled/made calls, filtering out empty placeholders
- **Requirement**: Must display calls numbered 1-6 with only relevant call data
- **Requirement**: Must calculate and display response time between creation and first call for Call 1 only
- **Requirement**: Must implement medal tier system for Call 1 based on response time performance:
  - Diamond Medal: Response time < 1 minute (💎)
  - Gold Medal: Response time 1-2 minutes (🥇)
  - Silver Medal: Response time 2-5 minutes (🥈)
  - Bronze Medal: Response time 5-10 minutes (🥉)
  - No Medal: Response time ≥ 10 minutes
- **Requirement**: Must show call status for Calls 2-6 (called vs No call)
- **Requirement**: Must display call timestamps when calls were made
- **Requirement**: Must format response times in precise minutes:seconds format for Call 1 (0:45, 1:30, 5:00) with hour format for times over 60 minutes (1h 30m)
- **Requirement**: Must remove WINDOW START, WINDOW END, and CALL STATUS fields from display

#### SQL Queries Required
```sql
-- Fetch lead details
SELECT *
FROM leads
WHERE lead_id = $leadId
AND business_id = $businessId;

-- Fetch property information
SELECT house_value, distance_meters, house_url, full_address, duration_seconds
FROM clients
WHERE account_id = $accountId; -- From lead.account_id

-- Fetch call windows with simplified business logic fields
SELECT call_window, window_start_at, window_end_at, created_at, called_at, called_out, business_id, account_id
FROM call_windows
WHERE account_id = $accountId
ORDER BY call_window ASC;

-- Simplified business logic calculations performed in application:
-- Filter out unscheduled call windows (ones without created_at or placeholders)
-- responseTimeMinutes: (called_at - created_at) in minutes for Call 1 only
-- medalTier: 'diamond' (<1min), 'gold' (1-2min), 'silver' (2-5min), 'bronze' (5-10min), null (≥10min) for Call 1
-- status: 'called' vs 'No call' for Calls 2-6
-- calledAt: Exact timestamp when call was made
-- Only display actual calls, no empty placeholders
```

#### Communications History
- **Requirement**: Must display all communications in chronological order
- **Requirement**: Must support audio playback with progress controls
- **Requirement**: Must show message type with color-coded badges
- **Requirement**: Must allow seeking within audio recordings

#### SQL Queries Required
```sql
-- Fetch communications history
SELECT communication_id, created_at, message_type, summary, recording_url
FROM communications
WHERE account_id = $accountId
ORDER BY created_at ASC;
```

### UI Requirements
- **Requirement**: Must use two-column layout (lead info left, property/score right)
- **Requirement**: Must display property image or fallback to `/images/noIMAGE.png`
- **Requirement**: Must show score below property image with color background
- **Requirement**: Must include back navigation to New Leads
- **Requirement**: Communications must expand vertically (no internal scroll)

#### Call Windows UI Requirements (Modern Vertical Design)
- **Requirement**: Must display call items in single vertical column layout with compact spacing
- **Requirement**: Must show call numbers in circles (w-12 h-12) with tier-specific icons and compact labels
- **Requirement**: Must implement visual state differentiation for call status:
  - Called items: Blue gradient theme with phone icons (PhoneCall component)
  - Not called items: Red gradient theme with X icons for clear status indication
- **Requirement**: Must display Call 1 with medal tier recognition and response time value
- **Requirement**: Must display Calls 2-6 with call status ("Not called" or exact timestamp)
- **Requirement**: Must use "Not called" instead of "No call" for better language clarity
- **Requirement**: Must show medal icons (💎🥇🥈🥉) prominently for Call 1 performance recognition
- **Requirement**: Must display response times in precise minutes:seconds format (0:45, 1:30, 5:00) with hour format for extended times
- **Requirement**: Must use premium metallic card design for tier items with tier-specific styling and shimmer effects
- **Requirement**: Must fit exactly 6 call items within 540px container height without overflow or scrolling
- **Requirement**: Must use optimized spacing: container padding p-4, item spacing space-y-1, bottom margin mb-3
- **Requirement**: Must implement responsive design with single column layout (max-w-md) centered within container
- **Requirement**: Must provide proper visual hierarchy through consistent sizing and color coding

#### Symmetrical Layout Requirements (Enhanced)
- **Requirement**: Must implement perfect symmetrical layout with Lead Info card (left) and Call Windows (right)
- **Requirement**: Must use 75/25 width ratio (Lead Info takes majority of space, Call Windows compact)
- **Requirement**: Lead Info card must match exact height of Call Windows container (540px)
- **Requirement**: Must ensure perfect height symmetry with no empty space at bottom
- **Requirement**: Must use compact design with efficient use of space
- **Requirement**: Must maintain scrolling functionality for Call Windows
- **Requirement**: Must ensure text containment in Lead Info card without overflow
- **Requirement**: Must align Call Windows right edge with Communications section below

#### Component-Level Loading States
- **Requirement**: Must implement individual loading states for Lead Information, Call Windows, and Communications
- **Requirement**: Must use staggered loading delays (300ms, 600ms, 900ms) for enhanced user experience
- **Requirement**: Must show purple spinning circles during component loading with proper error handling
- **Requirement**: Must use `useLeadDetailsData` hook for independent component data fetching

#### Message Type Colors
- Email: Blue background
- SMS/Text: Green background
- Call/Phone: Purple background
- Voicemail: Orange background

---

## Incoming Calls

### Functional Requirements

#### Analytics Dashboard (Enhanced Interactive Experience)
- **Requirement**: Must display source distribution bar chart with interactive hover functionality
- **Requirement**: Must display caller type distribution bar chart
- **Requirement**: Must show source-specific caller type breakdown in hover popups when hovering over source distribution items
- **Requirement**: Must display recent calls table with assigned personnel information
- **Requirement**: Must include time period filter (7/15/30/60/90 days)
- **Requirement**: Must provide interactive hover experience: hover over source distribution bars to see caller type breakdown for that specific source
- **Requirement**: Must use compact popup windows that appear on hover and disappear when cursor moves away

#### SQL Queries Required
```sql
-- Source distribution
SELECT source, COUNT(*) as count
FROM incoming_calls
WHERE created_at >= $startDate
GROUP BY source
ORDER BY count DESC;

-- Caller type distribution
SELECT caller_type, COUNT(*) as count
FROM incoming_calls
WHERE created_at >= $startDate
AND caller_type IS NOT NULL
AND caller_type != 'Unknown'
GROUP BY caller_type
ORDER BY count DESC;

-- Source-specific caller type distribution (for hover popups)
SELECT caller_type, COUNT(*) as count
FROM incoming_calls
WHERE created_at >= $startDate
AND business_id = $businessId
AND source = $hoveredSource
AND caller_type IS NOT NULL
AND caller_type != 'Unknown'
GROUP BY caller_type
ORDER BY count DESC;

-- Recent calls table (with assigned personnel)
SELECT incoming_call_id, source, caller_type, duration, assigned_id, assigned, created_at, business_id
FROM incoming_calls
WHERE created_at >= $startDate
AND business_id = $businessId
ORDER BY created_at DESC
LIMIT 20;
```

### UI Requirements

#### Interactive Hover System
- **Requirement**: Must implement smooth hover interactions on source distribution bars
- **Requirement**: Must display compact, square-ish popup windows positioned near hovered elements
- **Requirement**: Must show loading states in popups while fetching source-specific caller type data
- **Requirement**: Must use fade-in/slide-up animations for popup appearance and disappearance
- **Requirement**: Must position popups intelligently to avoid screen edge clipping
- **Requirement**: Must provide visual hover feedback on source distribution bars (color transitions)

#### Layout and Design
- **Requirement**: Must use responsive grid layout for main charts (source distribution and caller type distribution)
- **Requirement**: Must exclude "Unknown" values from all visualizations
- **Requirement**: Must remove standalone Call Flow Analysis section (transformed into hover functionality)
- **Requirement**: Must maintain consistent purple/indigo theme throughout hover popups
- **Requirement**: Must ensure popup windows are compact and professional in appearance

#### Recent Calls Table
- **Requirement**: Table must display: Date & Time, Source, Caller Type, Duration, Assigned
- **Requirement**: Must replace Status column with Assigned column showing personnel names
- **Requirement**: Must use assigned_id to fetch assigned person's name from database
- **Requirement**: Must display "Unassigned" for calls without assigned personnel
- **Requirement**: Must use badge styling: blue badges for assigned calls, gray badges for unassigned calls
- **Requirement**: Must handle null/undefined assigned names gracefully with fallback text
- **Requirement**: Must support clickable table rows that open Recent Calls popup for detailed call information

#### Recent Calls Popup (New Feature)
- **Requirement**: Must open when clicking any row in the Recent Calls table
- **Requirement**: Must display call details in modal overlay with backdrop blur
- **Requirement**: Must show call date/time, call summary, and caller type dropdown
- **Requirement**: Must include custom integrated audio player for call recordings
- **Requirement**: Must support caller type editing with auto-save functionality
- **Requirement**: Must close on ESC key, backdrop click, or X button
- **Requirement**: Must be fully responsive across desktop, tablet, and mobile devices

#### Recent Calls Popup Components

##### Modal Behavior
- **Requirement**: Must center on screen with proper z-index layering
- **Requirement**: Must use backdrop blur effect with click-to-close functionality
- **Requirement**: Must prevent body scrolling when open
- **Requirement**: Must support ESC key to close with proper event listener cleanup
- **Requirement**: Must handle click outside to close without interfering with internal clicks

##### Audio Player Integration
- **Requirement**: Must display custom audio player with microphone icon when recording_url exists
- **Requirement**: Must show blue circular play/pause button with proper state management
- **Requirement**: Must include progress bar that updates during playback with accurate time display
- **Requirement**: Must display current time and total duration (format: M:SS)
- **Requirement**: Must support seeking via progress bar interaction
- **Requirement**: Must handle audio loading states with spinner animation
- **Requirement**: Must gracefully handle missing recordings with "No recording available" message
- **Requirement**: Must properly cleanup audio resources on component unmount

##### Call Summary Display
- **Requirement**: Must display call summary text without background styling
- **Requirement**: Must handle missing/null summary gracefully
- **Requirement**: Must use clean typography matching Communications section styling
- **Requirement**: Must support multi-line content with proper spacing

##### Caller Type Management
- **Requirement**: Must display dropdown with options: Client, Sales person, Other, Looking for job
- **Requirement**: Must show current caller_type as selected option
- **Requirement**: Must implement auto-save on selection change via PATCH API call
- **Requirement**: Must show loading spinner during save operation
- **Requirement**: Must use optimistic UI updates for immediate feedback
- **Requirement**: Must validate caller_type values against allowed options
- **Requirement**: Must handle save errors gracefully without breaking UI

#### Additional SQL Queries Required
```sql
-- Fetch individual call details for popup
SELECT incoming_call_id, source, caller_type, duration, assigned_id, assigned, created_at, business_id, recording_url, call_summary
FROM incoming_calls
WHERE incoming_call_id = $callId
AND business_id = $businessId;

-- Update caller type
UPDATE incoming_calls 
SET caller_type = $callerType
WHERE incoming_call_id = $callId
AND business_id = $businessId;
```

#### API Endpoints Required
- **Endpoint**: `/api/incoming-calls/[callId]` (GET) - Fetch individual call details with authentication and business validation
- **Endpoint**: `/api/incoming-calls/[callId]` (PATCH) - Update caller type with validation and error handling

---

## Bookings (formerly Salesman)

### Functional Requirements

#### Booking Metrics (Enhanced)
- **Requirement**: Must display booked count (total bookings/appointments)
- **Requirement**: Must display shows count (leads where show = true) with percentage of booked
- **Requirement**: Must display closes count (leads with closed_amount) with percentage of shows
- **Requirement**: Must calculate total revenue
- **Requirement**: Must calculate close rate (closes/shows percentage)
- **Requirement**: Must calculate average order value
- **Requirement**: Must display revenue trends over time with line chart visualization
- **Requirement**: Must show performance comparison across time periods
- **Requirement**: Must display percentage badges with color-coded themes:
  - Shows percentage badge: Purple theme (matching Booked icon color)
  - Closes percentage badge: Blue theme (matching Shows icon color)

#### Individual Salesman Performance Tracking
- **Requirement**: Must display individual salesman performance metrics in table format
- **Requirement**: Must show revenue attribution per salesman
- **Requirement**: Must display conversion rates by salesman with color-coded status indicators
- **Requirement**: Must show leads worked count per salesman
- **Requirement**: Must sort performance by total revenue (descending)

#### Revenue Trends and Analytics
- **Requirement**: Must provide daily revenue trend visualization for periods ≤30 days
- **Requirement**: Must provide weekly aggregation for periods >30 days
- **Requirement**: Must include interactive tooltips with detailed metrics
- **Requirement**: Must support all time period filters (7/15/30/60/90 days)

#### API Endpoints
- **Endpoint**: `/api/salesman/metrics` - Returns overall booking metrics with enhanced percentages
- **Endpoint**: `/api/salesman/performance` - Returns individual salesman performance data
- **Endpoint**: `/api/salesman/trends` - Returns revenue trends over time

#### SQL Queries Required
```sql
-- Overall Booking Metrics (Enhanced)
SELECT 
  COUNT(*) FILTER (WHERE start_time IS NOT NULL) as booked,
  COUNT(*) FILTER (WHERE show = true) as shows,
  COUNT(*) FILTER (WHERE closed_amount IS NOT NULL AND closed_amount > 0) as closes,
  SUM(COALESCE(closed_amount, 0)) as total_revenue
FROM leads
WHERE created_at >= $startDate
AND business_id = $businessId;

-- Enhanced percentage calculations performed in application:
-- showsPercentage: (shows/booked) * 100
-- closesPercentage: (closes/shows) * 100

-- Individual Salesman Performance
SELECT 
  lc.assigned as salesman,
  COUNT(DISTINCT l.lead_id) as leads_worked,
  COUNT(*) FILTER (WHERE l.show = true) as shows,
  COUNT(*) FILTER (WHERE l.closed_amount IS NOT NULL AND l.closed_amount > 0) as closes,
  SUM(COALESCE(l.closed_amount, 0)) as total_revenue
FROM leads l
LEFT JOIN leads_calls lc ON l.lead_id = lc.lead_id
WHERE l.created_at >= $startDate
AND l.business_id = $businessId
AND lc.assigned IS NOT NULL
GROUP BY lc.assigned
ORDER BY total_revenue DESC;

-- Revenue Trends (Daily)
SELECT 
  DATE(created_at) as date,
  SUM(COALESCE(closed_amount, 0)) as revenue,
  COUNT(*) FILTER (WHERE show = true) as shows,
  COUNT(*) FILTER (WHERE closed_amount IS NOT NULL AND closed_amount > 0) as closes
FROM leads
WHERE created_at >= $startDate
AND business_id = $businessId
GROUP BY DATE(created_at)
ORDER BY date ASC;
```

### UI Requirements
- **Requirement**: Must display page title as "Bookings" with description "Track appointment shows, closes, and revenue metrics"
- **Requirement**: Must use comprehensive dashboard layout with metrics cards, trends chart, and performance table
- **Requirement**: Must include time period filter (7/15/30/60/90 days) in header
- **Requirement**: Must show loading states during data fetch with retry functionality
- **Requirement**: Must display booking metrics in color-coded icon cards with enhanced percentage badges:
  - Booked card: Calendar icon (purple theme)
  - Shows card: Target icon (blue theme) with purple percentage badge showing "% of booked"
  - Closes card: Award icon (green theme) with blue percentage badge showing "% of shows"
  - Revenue and close rate cards: Standard formatting
- **Requirement**: Must include interactive line chart for revenue trends with responsive design
- **Requirement**: Must show performance table with color-coded close rate indicators:
  - Green: ≥50% close rate
  - Yellow: 30-49% close rate  
  - Red: <30% close rate
- **Requirement**: Must handle empty states gracefully with appropriate messaging
- **Requirement**: Must format currency values with proper locale formatting
- **Requirement**: Must be fully responsive across all device sizes

---

## FB Analysis

### Functional Requirements
- **Status**: Currently under construction
- **Future Requirement**: Will integrate with Facebook Marketing API for ad analysis

---

## Settings

### Functional Requirements

#### Profile Management
- **Requirement**: Must allow editing user profile information
- **Requirement**: Must support avatar upload
- **Requirement**: Must display read-only system fields (Telegram ID, GHL ID)
- **Requirement**: Must provide account deletion functionality

#### SQL Queries Required
```sql
-- Update profile information
UPDATE profiles 
SET full_name = $fullName, avatar_url = $avatarUrl
WHERE id = $userId;

-- Delete profile (for account deletion)
DELETE FROM profiles WHERE id = $userId;
```

### UI Requirements
- **Requirement**: Must use vertical menu with Settings and General sections
- **Requirement**: Must show form validation errors
- **Requirement**: Must require typing "DELETE" for account deletion confirmation
- **Requirement**: Must show loading states during save operations

---

## Loading System

### Functional Requirements

#### Dual Loading Architecture
- **Requirement**: Must implement dual loading states across all pages with tables
- **Requirement**: Page-level loading for initial data fetch (metrics, components, etc.)
- **Requirement**: Separate table-specific loading states for data tables
- **Requirement**: Both loading states must use the same simple spinning circle loader
- **Requirement**: Loading states must be coordinated through unified data hooks

#### Universal Loading Components
- **Requirement**: Must provide simple, professional spinning circle loader
- **Requirement**: Must support multiple sizes (sm, md, lg)
- **Requirement**: Must provide contextual loading messages
- **Requirement**: Must be universally applicable across all components and pages

#### Reference Implementation
- **Requirement**: Use Salesman page implementation as the standard reference
- **Requirement**: Apply identical dual loading pattern to all sections:
  - New Leads: Page loading + table loading
  - Incoming Calls: Page loading + table loading (if applicable)
  - Lead Details: Page loading for individual records
  - Dashboard: Component loading for widgets

### Animation Requirements
- **Requirement**: Simple rotating circle animation using CSS transforms only
- **Requirement**: Smooth 360-degree rotation with consistent timing (1 second duration)
- **Requirement**: Hardware-accelerated for optimal performance (60fps)
- **Requirement**: No complex animation phases or sequences
- **Requirement**: Immediate visual feedback with consistent spinner appearance

### Implementation Architecture
- **Requirement**: Data hooks (e.g., `useSalesmanData`, `useLeadsData`) must manage unified `isLoading` state
- **Requirement**: Client components must coordinate both page and table loading states
- **Requirement**: Table components must accept `isLoading` prop for independent loading management
- **Requirement**: Page-level loading shows skeleton cards with centered spinners
- **Requirement**: Table-level loading shows single centered spinner in table area

### UI Requirements
- **Requirement**: Must use consistent purple theme (`border-purple-200` and `border-t-purple-600`)
- **Requirement**: Spinner style: `w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth`
- **Requirement**: Must be clean and professional in appearance
- **Requirement**: Must respect prefers-reduced-motion settings
- **Requirement**: Must maintain backward compatibility with existing component usage
- **Requirement**: Consistent spacing and layout across all loading implementations

---

## Database Schema

### Core Tables

#### leads
- **Purpose**: Store lead information and status
- **Key Fields**: lead_id, account_id, business_id, first_name, last_name, email, phone, service, how_soon, score, status, contacted, start_time, show, closed_amount

#### clients
- **Purpose**: Store property and location data
- **Key Fields**: account_id, business_id, full_address, house_value, house_url, distance_meters, duration_seconds

#### communications
- **Purpose**: Store communication history
- **Key Fields**: communication_id, account_id, message_type, summary, recording_url, created_at

#### business_clients
- **Purpose**: Store business configuration
- **Key Fields**: business_id, company_name, avatar_url, time_zone

#### profiles
- **Purpose**: Store user profiles
- **Key Fields**: id, email, full_name, avatar_url, role, business_id

#### incoming_calls
- **Purpose**: Store call analytics data with assigned personnel tracking and detailed call information
- **Key Fields**: incoming_call_id, source, caller_type, duration, assigned_id, assigned, created_at, business_id, recording_url, call_summary
- **Enhanced Features**: Personnel assignment tracking, source-specific caller type filtering, interactive hover data support, audio recording storage, call summary text storage
- **Recent Enhancement**: Added recording_url (TEXT) and call_summary (TEXT) fields for Recent Calls popup functionality

#### leads_calls
- **Purpose**: Store appointment setter call data
- **Key Fields**: leads_call_id, lead_id, assigned, duration, time_speed, created_at

#### call_windows
- **Purpose**: Store call window scheduling and performance tracking
- **Key Fields**: call_window (1-6), window_start_at, window_end_at, created_at, called_at, called_out, business_id, account_id
- **Business Logic**: Response time calculation, medal tier assignment, missed call detection

#### ad_spends
- **Purpose**: Store platform advertising expenditure data with platform-specific tracking
- **Key Fields**: platform, spend, created_at, business_id
- **Usage**: Dashboard platform spend metrics with platform breakdown and cost tracking
- **Enhanced Features**: Platform name normalization, aggregated spend calculation, multi-platform support

---

## Technical Requirements

### Technology Stack
- **Frontend Framework**: Next.js 14 with App Router
- **UI Library**: React 18
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **Charts**: Recharts for pie charts, D3 with d3-sankey for flow diagrams
- **Icons**: Lucide React

### Runtime Requirements
- **Node.js**: Version 20.0.0 or higher
- **NPM**: Version 8.0.0 or higher
- **Environment Variables**: 
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - NEXT_PUBLIC_SITE_URL (required for production deployments)

### Production Deployment Requirements
- **Build Type**: Next.js standalone build optimized for production
- **Static Assets**: Public folder assets automatically copied to standalone build
- **Logo Requirements**: Production logo path must resolve to `/images/DominateLocalLeadsLogo.png`
- **Post-Build Processing**: Automated script copies public assets to standalone build directory
- **Environment Configuration**: Production NEXT_PUBLIC_SITE_URL must be set to actual domain
- **Docker Build Requirements**: 
  - Dockerfile must include `COPY scripts ./scripts` in builder stage
  - Scripts directory contains essential post-build.js for asset copying
  - Build process requires scripts directory to be available in container
  - **Fixed**: Static assets now copied directly from `/app/public` to `./public` for reliable serving
  - **Fixed**: Resolves logo display issues in containerized production deployments
- **Deployment Commands**: 
  - Development: `npm run dev`
  - Production Build: `npm run build` (includes asset copy)
  - Production Build for Sliplane: `npm run build:sliplane`

### Performance Requirements
- **Page Load**: Under 3 seconds
- **Authentication Flow**: Under 2 seconds
- **Database Queries**: Under 500ms response time
- **Animations**: Maintain 60fps
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## Error Handling

### Required Error Handling

#### Authentication Errors
- **Failed Login**: Display error message, remain on login page
- **Session Expired**: Auto-logout and redirect to login
- **Network Issues**: Show connection error with retry option

#### Data Loading
- **Initial Load**: Display loading spinners/skeletons
- **Empty States**: Show contextual "No data found" messages
- **Failed Requests**: Display error messages with retry buttons
- **Partial Failures**: Handle gracefully without breaking UI

#### Form Validation
- **Required Fields**: Highlight missing fields
- **Invalid Data**: Show specific validation messages
- **Network Errors**: Handle submission failures with retry

#### Performance
- **Large Datasets**: Implement pagination
- **Image Loading**: Use lazy loading
- **Audio Files**: Progressive loading for recordings
- **Query Timeouts**: 15-30 second timeout protection

---

*This document defines the complete requirements for the Lead Management System. All implementations must align with these specifications.*
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
- [Enhanced Session Management & Business Switching](#enhanced-session-management--business-switching)
- [Metrics Components Architecture](#metrics-components-architecture)
- [Session Security Architecture](#session-security-architecture)
- [Session Debugging & Observability System](#session-debugging--observability-system)
- [Recent Feature Updates](#recent-feature-updates)
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
- **Enterprise-grade session security with isolation and anomaly detection**
- **Advanced Actions Management with CRUD operations**
- **Incoming Calls Analytics with dynamic business context**
- **Comprehensive Authentication Debugging System**
- **Universal Header Consistency with Optimized Layout Architecture**

---

## Authentication & User Management

### Architecture Requirements

#### Cookie-Only Authentication System ✅ OPTIMIZED
- **CRITICAL**: System uses **EXCLUSIVELY** cookie-based authentication for both server and client
- **CRITICAL**: Removed LocalStorage conflicts - authentication state consistent across all components
- **CRITICAL**: All authentication uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` with cookie storage
- **Cookie Security**: HTTP-only cookies with secure settings for production environments
- **Session Consistency**: Single source of truth eliminates authentication state mismatches
- **Performance**: Consolidated post-login endpoint reduces API calls by 66%

#### User Role System
- **Super Admin (role: 0)**: Access to ALL businesses with `dashboard=true`
- **Admin/User (role: 1+)**: Access ONLY to assigned businesses in `profile_businesses` table
- **Business Access**: Validated on every request using JWT tokens and RLS policies
- **Role Validation**: `profile.role ?? 1` (null defaults to regular user)

### Functional Requirements

#### Optimized Login System ✅ REFACTORED
- **Requirement**: Users authenticate via Supabase Auth with consolidated post-login flow
- **Requirement**: Authentication sessions stored in secure HTTP-only cookies
- **Requirement**: All routes except public routes require authentication via middleware
- **Requirement**: Role-based access control (Super Admin role 0, Users role 1+)
- **Requirement**: Users associated with business data via optimized data fetching
- **Performance**: Single `/api/auth/post-login` endpoint replaces 3 separate API calls
- **Smart Redirect**: Consolidated endpoint determines optimal business dashboard redirect
- **Data Efficiency**: Server-side user data passed to client contexts to eliminate redundant fetching

#### Signup System
- **Requirement**: New users can create accounts with email, password, and full name
- **Requirement**: Password confirmation must match original password
- **Requirement**: Email confirmation required before account activation
- **Requirement**: Profile creation handled automatically by database triggers
- **Requirement**: New users default to business_id 1 and role 1 (non-admin)
- **Requirement**: Comprehensive error handling with user-friendly messages
- **Requirement**: Signup errors redirect to login page with error mode

#### Business Context & Switching System
- **CRITICAL**: Atomic business switching with race condition prevention
- **URL Synchronization**: Business changes must update both backend state and URL/permalink
- **Context Priority**: URL business (if valid) > Profile business > Role-based fallback
- **State Management**: React Context with mutex-like operation protection
- **Database Updates**: `profiles.business_id` updated atomically on business switches
- **Access Control**: Super Admins can switch to any business; others restricted to assigned businesses

#### Authentication Performance Optimizations ✅ COMPLETED
- **Optimized**: Login flow consolidated from 4 API calls to 2 calls (50% reduction)
- **Optimized**: Page load authentication checks reduced from 4 to 1-2 checks (75% reduction)
- **Optimized**: API routes authentication overhead eliminated (reduced from 4 DB queries to 0 per API call)
- **Optimized**: Request-scoped Supabase client caching (70+ redundant client creation calls eliminated)
- **Fixed**: LocalStorage/cookie authentication conflicts eliminated completely
- **Fixed**: Redundant client-side data fetching replaced with server-side data passing
- **Enhanced**: Single `/api/auth/post-login` endpoint handles all post-login business logic
- **Enhanced**: BusinessContext now accepts server data to prevent redundant API calls
- **Performance**: Authentication middleware simplified to cookie-only method
- **Consistency**: All authentication operations now use identical cookie-based approach

#### Critical Authentication Fixes ✅ PRODUCTION READY
- **FIXED**: Cookie filtering logic - changed from `c.name.includes('supabase')` to `c.name.startsWith('sb-')`
- **FIXED**: Server client auth configuration - added `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`
- **FIXED**: Client cookie creation - removed custom storage override to enable full Supabase SSR cookie behavior
- **RESOLVED**: Missing `sb-{project-id}-auth-token` cookie - client now creates both required session cookies
- **RESOLVED**: "Auth session missing!" errors after cache invalidation in production environments
- **PRODUCTION**: Authentication system now reliably survives cache flushes and maintains session consistency

#### SQL Queries Required
```sql
-- Fetch user profile with role for JWT authentication
SELECT id, email, role, business_id FROM profiles WHERE id = $userId;

-- Super Admin: Fetch ALL businesses with dashboard enabled
SELECT business_id, company_name, permalink, avatar_url, city, state 
FROM business_clients 
WHERE dashboard = true 
ORDER BY company_name;

-- Regular User: Fetch ONLY assigned businesses via profile_businesses
SELECT bc.business_id, bc.company_name, bc.permalink, bc.avatar_url, bc.city, bc.state
FROM profile_businesses pb
JOIN business_clients bc ON pb.business_id = bc.business_id
WHERE pb.profile_id = $userId
ORDER BY bc.company_name;

-- Validate business access for user (JWT-based)
SELECT COUNT(*) > 0 as has_access
FROM profile_businesses 
WHERE profile_id = $userId AND business_id = $businessId;

-- Update user's current business context (atomic)
UPDATE profiles 
SET business_id = $newBusinessId 
WHERE id = $userId;
```

### UI Requirements

#### Visual Design
- **Requirement**: Login forms must be centered on screen
- **Requirement**: Background must use animated gradient (blue-orange gradient: `from-brand-blue-800 via-brand-slate-700 to-brand-orange-900`)
- **Requirement**: Forms must use glass morphism effect with backdrop blur
- **Requirement**: Company logo must display above form using LoginLogo component
- **Requirement**: Logo must maintain natural aspect ratio
- **Updated**: Logo implementation simplified for immediate display:
  - Uses custom LoginLogo component with error handling
  - Implements plain HTML img tags instead of Next.js Image component
  - Primary logo: `/images/jennsLogo.png` (Jenn's Roofing branding)
  - Removed fade effects, loading states, and white glow for instant display
  - Logo displays immediately without transitions
  - Resolves Docker deployment static asset serving issues

#### Authentication Flow
- **Requirement**: Unauthenticated users must redirect to login page
- **UPDATED**: Successful login redirects to permalink-based dashboard: `/{business.permalink}/dashboard`
- **Super Admin Redirect**: Redirects to first available business or profile management if no businesses
- **Regular User Redirect**: Redirects to first assigned business dashboard
- **Business Switcher**: Super Admins see business switcher in header for all accessible businesses
- **User Profile**: Header displays email initial with dropdown menu for logout
- **Session Persistence**: JWT tokens automatically refreshed, sessions persist across browser restarts
- **Error Handling**: Invalid permalinks return 404, access denied redirects to accessible business

### Edge Cases
- **Failed Authentication**: Must show error message and remain on login page
- **Session Expiry**: Must automatically logout and redirect to login
- **Missing Business Data**: Must show loading state until data loads
- **Invalid Permalink**: Return 404 for non-existent business permalinks
- **Access Denied**: Redirect users to their first accessible business if accessing unauthorized business
- **Business Switch Race Conditions**: Prevent concurrent business switching with operation mutex
- **Cache Poisoning**: User-scoped caching prevents cross-account data contamination
- **Rate Limiting**: Graceful degradation with stale cache during high traffic periods
- **URL/State Sync**: Ensure URL permalink always matches selected business context

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

#### Header Optimization & Layout Consistency ✅ COMPLETED (2025-09-24)
- **CRITICAL FIX**: All permalink-based routes now consistently use `OptimizedLayoutWrapper` for header visibility
- **REQUIREMENT**: Actions, Lead Details, and Property Details pages must include UniversalHeader via layout wrapper
- **ARCHITECTURE**: Standardized layout pattern eliminates header visibility inconsistencies
- **IMPLEMENTATION**: Three layout files updated to use OptimizedLayoutWrapper:
  - `src/app/[permalink]/actions/layout.tsx` - ✅ Fixed
  - `src/app/[permalink]/lead-details/layout.tsx` - ✅ Fixed
  - `src/app/[permalink]/property-details/layout.tsx` - ✅ Fixed
- **PERFORMANCE**: No additional API calls - maintains optimized authentication data flow
- **CONSISTENCY**: All pages now follow identical layout architecture with UniversalHeader inclusion

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

#### Platform Breakdown Component (Updated Design)
- **Requirement**: Must display platform advertising spend metrics with time period filtering
- **Requirement**: Must calculate and prominently display total spend from all platforms combined
- **Requirement**: Must consolidate all platform data within single unified component interface
- **Requirement**: Must center total spend value horizontally with "Total platform spend" subtitle
- **Requirement**: Must remove shaded backgrounds and unnecessary visual clutter from total section
- **Requirement**: Must display individual platform cards in responsive grid (1-column mobile, 2-column desktop)
- **Requirement**: Must show platform-specific spend breakdown with appropriate brand icons
- **Requirement**: Must use official Google logo with proper brand colors (Blue #4285F4, Green #34A853, Yellow #FBBC05, Red #EA4335)
- **Requirement**: Must use Facebook logo with official blue branding (#1877F2)
- **Requirement**: Must format currency values without cents for cleaner display
- **Requirement**: Must provide clear visual hierarchy distinguishing total vs individual amounts
- **Requirement**: Must remove expandable/collapsible functionality in favor of always-visible layout
- **Requirement**: Must exclude time period and platform count labels from UI
- **Requirement**: Must maintain hover effects on individual platform cards
- **Requirement**: Must support time period filters (7/15/30/60/90 days)

#### Appointment Setters Dashboard Integration
- **Requirement**: Must display appointment setter performance metrics independently from New Leads
- **Requirement**: Must use dedicated data fetching with `useAppointmentSetters` hook
- **Requirement**: Must show appointment setter carousel with navigation and performance data
- **Requirement**: Must include loading states and error handling specific to Dashboard context
- **Requirement**: Must operate independently from New Leads section data

#### Session Management and Business Switching (Latest Implementation)
- **Requirement**: Must implement intelligent company switching behavior that preserves current section context
- **Requirement**: Must redirect to New Leads section when switching from lead-specific pages (Lead Details, Property Details, Actions)
- **Requirement**: Must maintain current section (Dashboard, New Leads, Bookings, Incoming Calls) for non-lead-specific pages
- **Requirement**: Must persist last selected company across session expiration and long inactivity periods
- **Requirement**: Must automatically update database with business selection changes for session recovery
- **Requirement**: Must use `determineTargetPageForBusinessSwitch()` for intelligent routing decisions

#### Metrics Distribution (Latest Implementation - Reversed from Phase 7)
- **CHANGED**: Metrics have been distributed back to their respective sections for better UX
- **Requirement**: Dashboard must show only Platform Spend metrics and maintain time period filtering
- **Requirement**: Dashboard must remove all lead and booking metrics to eliminate duplication
- **Requirement**: Must use simplified data fetching with only `useDashboardData` hook
- **Requirement**: Must maintain responsive design and error handling for Platform Spend only
- **Requirement**: Must maintain responsive grid layout (2 columns on mobile, 3 columns on larger screens)

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

-- Consolidated metrics for Phase 7 Dashboard (Total Calls metric)
SELECT SUM(calls_count) as total_calls
FROM leads
WHERE created_at >= $startDate
AND business_id = $businessId;
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

#### Lead Metrics Component (Latest Implementation - Returned from Dashboard)
- **CHANGED**: Lead metrics have been moved back from Dashboard to New Leads section for better UX
- **REQUIREMENT**: Must display lead metrics in first row with exact order: Leads, Contacts, Booked, Booking Rate
- **REQUIREMENT**: Must use reusable `LeadsMetrics` component with consistent styling and behavior
- **REQUIREMENT**: Must maintain all original styling including icons, colors, badges, and responsive grid layout
- **REQUIREMENT**: Must implement proper loading states, error handling, and data formatting
- **REQUIREMENT**: Must maintain LeadsTable component for lead data display below metrics
- **REQUIREMENT**: Must support Actions navigation target for Follow Up table integration
- **REQUIREMENT**: Must use `useLeadsData` hook for metrics data with 30-day default period

#### Three-Table Structure Implementation (Latest Update)
- **RESTRUCTURED**: New Leads section now contains three distinct tables instead of two
- **TABLE 1 - "Call now"**: Displays leads where `stage === 1 AND (call_now_status === 1 OR call_now_status === 2)`
- **TABLE 2 - "Follow Up"**: Displays leads where `stage === 2` (unchanged from original logic)
- **TABLE 3 - "Waiting to call"**: Displays leads where `stage === 1 AND call_now_status === 3`
- **CONDITIONAL RENDERING**: Tables with zero leads are completely hidden to provide a cleaner UI experience
- **AESTHETIC CONSISTENCY**: All three tables maintain identical styling, spacing, and responsive design
- **DATA SOURCE**: All tables use the same `/api/leads/recent` endpoint with frontend filtering for performance
- **LOADING STATES**: Tables appear during data loading to prevent layout shifts, but hide when empty after loading completes

#### Color Condition Simplification (Latest Update)
- **REMOVED**: All red and yellow priority color conditions from New Leads and Bookings table rows
- **SIMPLIFIED**: LeadsTable component no longer uses `usePriorityColors` prop or priority-based styling
- **STANDARDIZED**: All table rows now use consistent `hover:bg-gray-50` styling without priority differentiation
- **CONSISTENT DESIGN**: Eliminated complex conditional coloring for cleaner, more professional appearance
- **PERFORMANCE**: Reduced component complexity by removing unused color logic and state management

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

#### Recent Leads Table (Enhanced)
- **Requirement**: Must display leads in table format with clickable rows
- **UPDATED**: Must show columns: Lead Name (with calls count circle and working hours icon), Source, Date, Next Step
- **REMOVED**: Communications Count column completely eliminated from table layout
- **UPDATED**: Lead Name cell must display calls count in gray circle instead of score
- **UPDATED**: Calls count circle must include working hours icon at bottom-right corner:
  - Sun icon (☀️) for working_hours = true or null (yellow tint)
  - Moon icon (🌙) for working_hours = false (blue tint)
- **NEW**: how_soon attribute must display as colored tag next to service field:
  - Red: ASAP, immediately, urgent keywords
  - Orange: week, 7 days, soon keywords
  - Blue: month, 30 days keywords
  - Gray: default/other values
- **UPDATED**: Date format must display as "Tue Sep 16, 6:05PM" (weekday, short month, day, time)
- **Requirement**: Must navigate to Lead Details on row click
- **Requirement**: Must use individual component loading states independent from Lead Metrics
- **Requirement**: Must show purple loading spinner during table data fetching

#### SQL Queries Required
```sql
-- Fetch recent leads with enhanced data including calls_count, working_hours, and how_soon
SELECT l.*, c.full_address, c.house_value, c.house_url, c.distance_meters, c.duration_seconds
FROM leads l
LEFT JOIN clients c ON l.account_id = c.account_id
WHERE l.created_at >= $startDate
AND l.business_id = $businessId
ORDER BY l.created_at DESC;

-- Required fields from leads table:
-- - calls_count (number): Display in circle instead of score
-- - working_hours (boolean): Determines sun/moon icon (true/null = sun, false = moon)
-- - how_soon (string): Display as colored priority tag next to service
-- - source (string): Display as colored source badge
-- - service (string): Primary service field with how_soon tag
-- - created_at (timestamp): Format as "Tue Sep 16, 6:05PM"
-- - next_step (string): Display in Next Step column
```

### UI Requirements
- **Requirement**: Must use simplified 2-component layout: Lead Metrics (top) and Recent Leads Table (bottom)
- **Requirement**: Must include time period filter (7/15/30/60/90 days) in top-right
- **Requirement**: Must show individual component loading states (metrics and table load independently)
- **Requirement**: Must use CardSkeleton with individual metric cards during loading (4 cards in grid)
- **Requirement**: Must match Salesman loading pattern exactly with purple spinners
- **UPDATED**: Calls count must display in neutral gray circle (bg-gray-500) with white text
- **UPDATED**: Working hours icon must be positioned at bottom-right of calls count circle:
  - Sun icon (Lucide React): text-yellow-100 for working hours true/null
  - Moon icon (Lucide React): text-blue-100 for working hours false
  - Icon container: 4x4 darker gray circle (bg-gray-600) with 3x3 icon
- **UPDATED**: how_soon tags must use priority-based color coding with rounded-full styling:
  - Red: bg-red-100 text-red-800 border-red-200 (urgent keywords)
  - Orange: bg-orange-100 text-orange-800 border-orange-200 (week keywords)
  - Blue: bg-blue-100 text-blue-800 border-blue-200 (month keywords)
  - Gray: bg-gray-100 text-gray-800 border-gray-200 (default)
- **UPDATED**: Date format must exclude year and include weekday for current year dates

#### Component Loading Architecture
- **Requirement**: Lead Metrics component must load independently with `isMetricsLoading` state
- **Requirement**: Recent Leads Table must load independently with `isRecentLeadsLoading` state
- **Requirement**: Must remove Appointment Setters component from New Leads (moved to Dashboard only)
- **Requirement**: Must use dual loading architecture: page-level coordination + component-level states

---

## Lead Details

### Functional Requirements

#### Lead Information Display (Updated Implementation)
- **Requirement**: Must display essential lead contact information: name, email, phone, created date
- **UPDATED**: Must display source-based visual indicators instead of score-based metrics
- **UPDATED**: Must show company/source symbols in circular display (Facebook icon for Facebook Ads, Google icon for Google Ads, etc.)
- **REMOVED**: Score circle and score-based tags (low priority, strong lead, etc.) completely eliminated
- **REMOVED**: Summary section completely removed from lead information display
- **REMOVED**: Service Needed, Lead Source, and Next Step elements removed for cleaner interface
- **UPDATED**: Must display roof age conditionally (only show if not null)
- **UPDATED**: Created date must display in format "Tue Sep 16, 6:05PM" (weekday, short month, day, time)
- **Requirement**: Must show property information with image fallback
- **Requirement**: Must maintain responsive design and glass morphism styling

#### Call Windows System (Simplified - Current Implementation)
- **REQUIREMENT**: Must display only call windows where `active === true` from database
- **REQUIREMENT**: Must show call windows as horizontal cards with clean, modern design
- **REQUIREMENT**: Must display time ranges in format "5:34 PM - 6:04 PM" (time only, no date) using business timezone
- **REQUIREMENT**: Must implement simplified status tag system with color-coded background:
  - **Done on time**: Green background (`bg-green-500`)
  - **Done late**: Orange background (`bg-orange-500`)
  - **Due**: Yellow background (`bg-yellow-500`)
  - **Missed**: Red background (`bg-red-500`)
- **REQUIREMENT**: Must use `status_name` field from database to determine tag text and color
- **REQUIREMENT**: Must display call number as text only ("Call 1", "Call 2", etc.) without emojis
- **REQUIREMENT**: Must maintain dark mode support with `dark:bg-[#1C2833]` styling
- **REQUIREMENT**: Must show no status tag if `status_name` is empty or null
- **REQUIREMENT**: Must display working hours indicator in header (green for working hours, orange for after hours)
- **REQUIREMENT**: Must implement conditional "Called at" time display with specific conditions:
  - Only show for call windows where `active === true`
  - Only show for first call window (`call_window === 1`)
  - Only show during working hours (`working_hours === true`)
  - Only show if `called_at` field has a value
  - Display format: "Called at 5:45 PM" (time only, business timezone)
  - Placement: Always on right side - below status tag if exists, or alone on right if no status
- **REQUIREMENT**: Must implement 30-minute countdown timer with specific conditions:
  - Only visible for call window 1 (`call_window === 1`)
  - Only visible when current time is within `window_start_at` to `window_end_at` range
  - Timer starts countdown from `window_start_at` for exactly 30 minutes
  - Display format: MM:SS (e.g., "29:45", "05:30", "00:15")
  - Placement: Next to Working Hours indicator in component header
  - Auto-hide: Timer disappears when 30-minute countdown reaches zero
  - Styling: Orange theme with clock icon to match pending/active state
  - Updates: Real-time countdown updating every second
  - Timezone: Proper timezone handling using business timezone for accuracy
- **REMOVED**: All medal system logic (diamond, gold, silver, bronze) completely eliminated
- **REMOVED**: Response time calculations and special Call 1 processing eliminated

#### SQL Queries Required
```sql
-- Fetch lead details (updated for source-based display)
SELECT lead_id, account_id, business_id, first_name, last_name, email, phone,
       source, created_at, service, how_soon, next_step
FROM leads
WHERE lead_id = $leadId
AND business_id = $businessId;

-- Fetch business data including dialpad phone for Call Now integration
SELECT time_zone, dialpad_phone
FROM business_clients
WHERE business_id = $businessId;

-- Fetch property information (updated with conditional roof_age)
SELECT house_value, distance_meters, house_url, full_address, duration_seconds, roof_age
FROM clients
WHERE account_id = $accountId; -- From lead.account_id

-- Fetch call windows with active filtering
SELECT call_window, window_start_at, window_end_at, created_at, called_at, called_out, business_id, account_id, active, status_name
FROM call_windows
WHERE account_id = $accountId
ORDER BY call_window ASC;

-- Simplified application logic:
-- Filter by active === true (only show active call windows)
-- Display time ranges using business timezone in "5:34 PM - 6:04 PM" format
-- Show status tags only when status_name is not empty
-- Show "Called at" time only for Call 1 during working hours with valid called_at value
-- No medal calculations, no response time calculations, no complex business logic
```

#### Communications History
- **Requirement**: Must display all communications in chronological order
- **Requirement**: Must support audio playback with progress controls
- **Requirement**: Must show message type with color-coded badges
- **Requirement**: Must allow seeking within audio recordings

#### Dialpad Call Now Integration
- **Requirement**: Must provide Call Now button positioned to the right of "Back to New Leads" button
- **Requirement**: Must use blue gradient design matching provided UI specifications with phone icon
- **Requirement**: Must create Dialpad URLs in format: `dialpad://{{phone}}?fromNumber={{dialpad_phone}}&customData=lead_id%3D{{lead_id}}`
- **Requirement**: Must fetch `dialpad_phone` from `business_clients` table via enhanced lead details API
- **Requirement**: Must use lead's `phone` field and current `lead_id` for URL generation
- **Requirement**: Must validate phone numbers before showing Call Now button
- **Requirement**: Must include hover effects, scaling animations, and responsive design
- **Requirement**: Must show loading placeholder during data fetch
- **Requirement**: Must handle cases where dialpad_phone is null gracefully
- **Requirement**: Must use `createBusinessDialpadUrl()` utility function for URL generation

#### Lead Stage Dropdown Management (New Feature)
- **Requirement**: Must provide stage management dropdown positioned next to Call Now button in page header
- **Requirement**: Must be present on all lead detail pages: Lead Details, Actions, and Property Details
- **Requirement**: Must support stage options with proper numerical values:
  - Contact (value: 1)
  - Follow up (value: 2)
  - Booked (value: 3)
  - Not interested (value: 99)
  - Email campaign (value: 100)
- **Requirement**: Must default to current stage value from lead data (`lead.stage`)
- **Requirement**: Must implement confirmation dialog before stage changes with message: "Are you sure you want to change the lead stage to '[Selected Stage]'?"
- **Requirement**: Must provide Cancel and Confirm buttons in confirmation dialog
- **Requirement**: Must send webhook POST requests to: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/change-stage`
- **Requirement**: Must use JSON payload format: `{ "lead_id": "[current_lead_id]", "stage": "[stage_value_as_string]" }`
- **Requirement**: Must handle loading states during API calls with spinner and disabled states
- **Requirement**: Must implement proper error handling with user-friendly error messages
- **Requirement**: Must use responsive design with proper z-index for modal overlay (z-50)
- **Requirement**: Must maintain clean UI with Tailwind CSS styling and dark mode support
- **Requirement**: Must update local component state only after successful API response
- **Requirement**: Must reset pending state and close dialogs on completion or cancellation

#### Functional Chat Integration
- **Requirement**: Must provide functional chat interface for real-time lead communication
- **Requirement**: Must integrate with n8n automation platform via webhook for message processing
- **Requirement**: Must send webhook to: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/bf425f50-2d65-4cfd-a529-faea3b682288`
- **Requirement**: Must include required parameters in webhook payload:
  - `account_id`: Authenticated user's Supabase ID
  - `lead_id`: Current lead ID from page parameters
  - `message`: User-entered text content
  - `business_id`: Current business context ID
- **Requirement**: Must provide loading states during webhook calls with visual feedback
- **Requirement**: Must handle webhook errors gracefully with user-friendly error messages
- **Requirement**: Must support keyboard shortcuts (Enter to send, Shift+Enter for new lines)
- **Requirement**: Must validate and clear input after successful message send
- **Requirement**: Must use controlled input components with proper state management

#### Dialpad Integration Technical Implementation
- **Component**: `/src/components/CallNowButton.tsx` - Reusable Call Now button component
- **Utility**: `/src/lib/utils/phoneUtils.ts` - Enhanced with `createBusinessDialpadUrl()` function
- **API Enhancement**: `/src/app/api/leads/[leadId]/route.ts` - Updated to fetch dialpad_phone from business_clients
- **Type Definition**: `/src/types/leads.ts` - LeadDetails interface includes dialpadPhone field
- **Phone Validation**: Uses `isValidDialpadPhone()` for number validation before showing button
- **URL Format**: `dialpad://{{phone}}?fromNumber={{dialpad_phone}}&customData=lead_id%3D{{lead_id}}`

#### Chat Interface Technical Implementation
- **File**: `/src/hooks/useChatWebhook.ts` - Custom hook for webhook functionality
- **Hook**: `useChatWebhook()` - Manages webhook calls, loading states, and error handling
- **Component**: Enhanced `CommunicationsHistory.tsx` with integrated chat interface
- **State Management**: Controlled input state with message validation and clearing
- **Error Handling**: Comprehensive error display and retry functionality
- **Authentication**: Automatic user ID retrieval from Supabase client authentication

#### SQL Queries Required
```sql
-- Fetch communications history
SELECT communication_id, created_at, message_type, summary, recording_url
FROM communications
WHERE account_id = $accountId
ORDER BY created_at ASC;
```

### UI Requirements
- **Requirement**: Must use two-column layout (lead info left, property info right)
- **UPDATED**: Must display source-based circular icon instead of score display
- **UPDATED**: Must implement dynamic source icon configuration with fallbacks for unknown sources
- **UPDATED**: Source icons must include: Facebook (blue), Google (multicolor), Website (gray), Referral (green)
- **Requirement**: Must display property image or fallback to `/images/noIMAGE.png`
- **Requirement**: Must include back navigation to New Leads
- **Requirement**: Communications must expand vertically (no internal scroll)
- **UPDATED**: Must maintain clean, minimal interface with removed clutter elements

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

#### Optimized Layout Requirements (Latest Update)
- **LAYOUT OPTIMIZATION**: Improved visual balance with reduced Call Windows width for better space utilization
- **DASHBOARD LAYOUT**: Lead Info card (left, flexible width) and Call Windows (right, max 240px width)
- **PERMALINK LAYOUT**: Lead Information (top, full width) with Communications History (60%) and Call Windows (40%) in grid below
- **REQUIREMENT**: Lead Info card must match exact height of Call Windows container (540px) in dashboard layout
- **REQUIREMENT**: Must ensure perfect height symmetry with no empty space at bottom
- **REQUIREMENT**: Must use compact design with efficient use of space while improving readability
- **REQUIREMENT**: Must maintain scrolling functionality for Call Windows when content exceeds container height
- **REQUIREMENT**: Must ensure text containment in Lead Info card without overflow
- **COMMUNICATIONS EXPANSION**: Communications History component gains additional space from Call Windows width reduction
- **RESPONSIVE DESIGN**: Both layout versions maintain mobile-first responsive behavior

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

## Unified Detail Pages Design System

### Functional Requirements

#### Consistent Layout Pattern
- **Requirement**: All detail pages (Lead Details, Actions, Property Details) must follow a unified design pattern
- **Requirement**: Must maintain consistent header layout with back navigation and Call Now button
- **Requirement**: Must use identical spacing, margins, and responsive grid patterns
- **Requirement**: Must provide seamless user experience across all detail views

#### Header Standardization
- **Requirement**: Must include back navigation button (left-aligned) with consistent styling
- **Requirement**: Must include Call Now button (right-aligned) using Dialpad integration
- **Requirement**: Call Now button must use business dialpad_phone and lead tracking data
- **Requirement**: Must handle loading states with animated placeholder for Call Now button

#### Layout Structure Requirements
- **Requirement**: Must use full-width Lead Information section at the top
- **Requirement**: Must implement two-column grid layout below Lead Information
- **Requirement**: Left column must always contain Communications History
- **Requirement**: Right column must contain page-specific component:
  - Lead Details: Call Windows component
  - Actions: Actions Checklist component
  - Property Details: Property Information component

#### Call Now Integration
- **Requirement**: Must integrate with Dialpad using custom URL format: `dialpad://{phone}?fromNumber={dialpad_phone}&customData=lead_id%3D{lead_id}`
- **Requirement**: Must validate phone numbers before showing Call Now button
- **Requirement**: Must handle invalid phone numbers gracefully (hide button)
- **Requirement**: Must fetch dialpad_phone from business_clients table
- **Requirement**: Must pass lead_id for call tracking and analytics

#### Component Export Standards
- **Requirement**: All components must use consistent React import patterns: `import React, { hooks } from 'react'`
- **Requirement**: All components must export as named exports only for consistency
- **Requirement**: Must avoid default exports to prevent import resolution conflicts
- **Requirement**: All JSX-using components must explicitly import React namespace

#### Error Handling Requirements
- **Requirement**: Must handle "Lead not found" errors with graceful redirects
- **Requirement**: Must use useEffect for navigation to comply with React hooks rules
- **Requirement**: Must provide loading states during data fetching
- **Requirement**: Must handle undefined component imports with proper error boundaries

#### SQL Queries for Unified Pages
```sql
-- Enhanced lead details query with dialpad integration
SELECT
  l.lead_id, l.account_id, l.business_id, l.first_name, l.last_name,
  l.email, l.phone, l.source, l.created_at, l.service, l.how_soon,
  l.payment_type, l.roof_age, l.homeowner, l.email_valid,
  bc.time_zone, bc.dialpad_phone
FROM leads l
INNER JOIN business_clients bc ON l.business_id = bc.business_id
WHERE l.lead_id = $leadId AND l.business_id = $businessId;

-- Communications query for all detail pages
SELECT communication_id, created_at, message_type, summary, recording_url,
       call_window, lead_id, ai_recap_outcome, ai_recap_recap_purposes
FROM communications
WHERE account_id = $accountId AND business_id = $businessId
ORDER BY created_at DESC;

-- Actions query for Actions page
SELECT ai_recap_action_id, created_at, updated_at, recap_action,
       action_response, action_done
FROM ai_recap_actions
WHERE account_id = $accountId AND business_id = $businessId
ORDER BY created_at DESC;
```

#### Implementation Files
- **Lead Details**: `src/app/[permalink]/lead-details/[leadId]/page.tsx`
- **Actions Page**: `src/app/[permalink]/actions/[leadId]/page.tsx`
- **Property Details**: `src/app/[permalink]/property-details/[leadId]/page.tsx`
- **Call Now Component**: `src/components/CallNowButton.tsx`
- **Lead Information**: `src/components/features/leads/LeadInformation.tsx`
- **Communications**: `src/components/features/leads/CommunicationsHistory.tsx`
- **Actions Component**: `src/components/features/leads/ActionsChecklist.tsx`
- **Property Component**: `src/components/features/leads/PropertyInformation.tsx`

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

## Actions (Phase 7 - Follow Up to Actions Page)

### Functional Requirements

#### Actions Page Navigation Integration
- **Requirement**: Must integrate with Follow Up table to provide seamless navigation to Actions pages
- **Requirement**: Must use permalink-based routing structure: `/[permalink]/actions/[leadId]`
- **Requirement**: Must maintain consistent layout with other lead detail pages (lead-details, property-details)
- **Requirement**: Must include proper BusinessContextProvider integration for multi-tenant access control

#### Actions Checklist Management
- **Requirement**: Must display comprehensive action checklist for individual leads
- **Requirement**: Must fetch actions from `ai_recap_actions` table filtered by lead_id and business_id
- **Requirement**: Must show actions in two organized sections: incomplete (pending) and completed
- **Requirement**: Must provide real-time toggle functionality for action completion status
- **Requirement**: Must implement optimistic updates with loading states during action modifications
- **Requirement**: Must support optional action_response field for additional notes/responses

#### Actions Data Structure
- **Requirement**: Must use AIRecapAction interface with comprehensive field support:
```typescript
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
```

#### SQL Queries Required
```sql
-- Fetch actions for specific lead with business filtering
SELECT ai_recap_action_id, created_at, updated_at, account_id, lead_id,
       business_id, assigned_id, recap_action, action_response, action_done
FROM ai_recap_actions
WHERE lead_id = $leadId AND business_id = $businessId
ORDER BY created_at ASC;

-- Update action completion status
UPDATE ai_recap_actions
SET action_done = $actionDone,
    action_response = $actionResponse,
    updated_at = NOW()
WHERE ai_recap_action_id = $actionId
AND business_id = $businessId;

-- Update action text (recap_action field) - Enhanced for edit functionality
UPDATE ai_recap_actions
SET recap_action = $recapAction,
    updated_at = NOW()
WHERE ai_recap_action_id = $actionId
AND business_id = $businessId;
```

#### API Endpoints Required
- **Endpoint**: `/api/actions` (GET) - Fetch actions with lead_id and business_id filtering
- **Endpoint**: `/api/actions/[actionId]` (PATCH) - Update action status and/or text with authentication
  - **Enhanced Support**: Must support updating action_done, action_response, and recap_action fields
  - **Flexible Updates**: Must allow partial updates (any combination of supported fields)
  - **Field Validation**: Must validate field types and required business access permissions
- **Authentication**: Must use JWT-based authentication with business context validation
- **Access Control**: Must validate user access to business and lead before allowing modifications

### UI Requirements

#### Layout Structure
- **Requirement**: Must use three-column layout: LeadInformation (left), ActionsChecklist (center), CommunicationsHistory (right)
- **Requirement**: Must follow same design patterns as lead-details and property-details pages
- **Requirement**: Must include proper spacing, shadows, and glass morphism styling consistent with application theme
- **Requirement**: Must provide responsive design that adapts to different screen sizes

#### ActionsChecklist Component Requirements
- **Requirement**: Must display actions grouped by completion status (pending vs completed)
- **Requirement**: Must show pending actions at top with incomplete action count in section header
- **Requirement**: Must show completed actions below with completed action count
- **Requirement**: Must provide toggle checkboxes for each action with smooth transitions
- **Requirement**: Must implement loading states (skeleton loaders) during data fetching
- **Requirement**: Must show individual action loading states during toggle operations
- **Requirement**: Must display action descriptions clearly with proper typography
- **Requirement**: Must handle empty states gracefully (no actions available)
- **Requirement**: Must use consistent color coding (purple theme) with other application components

#### Action Text Editing Functionality (Latest Implementation - September 2024)
- **Requirement**: Must provide edit functionality for action text (recap_action field) via pencil icon
- **Requirement**: Must display edit icon (Edit3 from Lucide React) on the right side of each action text
- **Requirement**: Must show edit icon for both pending and completed actions with hover effects
- **Requirement**: Must open modal dialog when edit icon is clicked with pre-populated text field
- **Requirement**: Must provide Cancel and Save buttons in edit modal with proper disabled states
- **Requirement**: Must implement textarea input with focus management and validation
- **Requirement**: Must update action text in real-time after successful save operation
- **Requirement**: Must show loading spinner on Save button during API call
- **Requirement**: Must maintain modal accessibility with ESC key support and backdrop click to close
- **Requirement**: Must validate that text is not empty before enabling Save button

#### Navigation Integration
- **Requirement**: Must update LeadsTable component to support Actions navigation target
- **Requirement**: Must use `navigationTarget="actions"` for Follow Up table configuration
- **Requirement**: Must maintain existing navigation patterns while adding Actions capability
- **Requirement**: Must ensure proper back navigation and breadcrumb support

#### Error Handling and Loading States
- **Requirement**: Must implement comprehensive error handling for all API operations
- **Requirement**: Must show user-friendly error messages for network failures or unauthorized access
- **Requirement**: Must provide retry mechanisms for failed operations
- **Requirement**: Must use skeleton loading states during initial data fetch
- **Requirement**: Must show individual action loading indicators during status updates

---

## Bookings (formerly Salesman)

### Functional Requirements

#### Booking Modal (Latest Implementation - September 2024)
- **REQUIREMENT**: Three-phase booking flow modal for creating lead appointments
- **PHASE 1 - Address Input**: Street name and postal code entry with address verification
- **PHASE 2 - Calendar & Time**: Date/time selection with profile assignment dropdown
- **PHASE 3 - Lead Details & Summary**: Lead attribute editing with booking confirmation
- **REQUIREMENT**: Modal fixed size 720x580px across all phases with no scrollbars
- **REQUIREMENT**: All phases must be vertically centered within modal content area
- **REQUIREMENT**: Booking Summary must display ONLY: Date, Time, Assigned to
- **REQUIREMENT**: Progress bar shows 3-step workflow (Address Info → Date & Time → Lead Details)
- **REQUIREMENT**: Modal closes when user clicks outside (click-outside-to-close behavior)
- **REQUIREMENT**: No close button (X) in modal - only background click closes modal
- **REQUIREMENT**: Clicks inside modal content do not close modal (stopPropagation)
- **REQUIREMENT**: On confirmation, must call webhook: `POST https://n8nio-n8n-pbq4r3.sliplane.app/webhook/ghl-create-booking`
- **REQUIREMENT**: Webhook payload must include: `lead_id`, `account_id`, `business_id`, `street_name`, `postal_code`
- **REQUIREMENT**: Must handle webhook errors gracefully with user-friendly error messages
- **REQUIREMENT**: Success stage shows 3-second confirmation before auto-closing modal
- **REQUIREMENT**: Profile assignment dropdown must fetch profiles with role 5 from business
- **REQUIREMENT**: Lead attributes (service, how_soon, payment_type, roof_age) editable in Phase 3
- **REQUIREMENT**: Calendar displays available slots from address verification response
- **REQUIREMENT**: Business timezone used for time formatting and display
- **UI OPTIMIZATION**: Compact spacing in Phase 3 (text-xs, h-8 inputs, space-y-2, gap-4 grid)
- **UI OPTIMIZATION**: Phase 1 & 2 use py-6/py-8 padding for vertical centering
- **COMPONENT**: `src/components/BookingModal.tsx` - Main modal implementation

#### Complete Bookings View (Latest Implementation - September 2024)
- **RESTORED**: BookingsMetrics component fully restored for comprehensive booking analytics
- **ENHANCED**: Complete booking management interface with dual-component architecture
- **REQUIREMENT**: Must display BookingsMetrics component in first row with comprehensive booking analytics
- **REQUIREMENT**: Must display Recent Leads table below metrics for lead management
- **REQUIREMENT**: Must use `useBookingsData` hook for complete data fetching (metrics + leads)
- **REQUIREMENT**: ~~Must include time period filtering (7/15/30/60/90 days) with TimePeriodFilter component~~ REMOVED - No time filtering
- **REQUIREMENT**: Must support proper error handling and loading states for both metrics and table components
- **REQUIREMENT**: Must display AI recap purpose tags in Next Step column
- **REQUIREMENT**: Must support proper array-like string parsing for `ai_recap_purposes` field
- **REQUIREMENT**: Bookings table must show leads from all time periods (no time filtering)
- **REQUIREMENT**: Bookings table must filter by stage = 3 (booking stage only)
- **REQUIREMENT**: AI recap purposes tags display correctly in stages where data exists (Follow up, not Call now)
- **REQUIREMENT**: Date filter UI completely removed from Bookings section (no TimePeriodFilter component)
- **REQUIREMENT**: All Bookings APIs updated to remove startDate parameter dependency
- **REQUIREMENT**: Bookings data fetching logic simplified to only require businessId parameter

#### Navigation Target Requirements (Fixed - September 2024)
- **REQUIREMENT**: New Leads table elements must redirect to lead-details pages
- **REQUIREMENT**: Follow Up table elements must redirect to actions pages
- **REQUIREMENT**: Recent Leads table elements (in Bookings) must redirect to property-details pages
- **IMPLEMENTATION**: Uses `navigationTarget` prop in table components for consistent routing behavior
- **FIXED**: Corrected Bookings Recent Leads navigation from incorrect lead-details to proper property-details target

#### AI Recap Purpose Tags Implementation
- **Data Format**: `ai_recap_purposes` field contains array-like strings (e.g., `'["Appointment", "Meeting"]'`)
- **REQUIREMENT**: Must parse JSON array strings using `JSON.parse()` with fallback to manual parsing
- **REQUIREMENT**: Must handle both double and single quote formats
- **REQUIREMENT**: Must remove brackets and quotes to display clean tag values
- **REQUIREMENT**: Must split multiple values and display as separate tags
- **REQUIREMENT**: Must maintain color coding based on purpose content (urgent=red, follow-up=blue, quotes=green, info=yellow)
- **REQUIREMENT**: Must handle malformed data gracefully with fallback parsing
- **Example**: Input `'["Follow-up", "Quote"]'` → Output: Two tags showing "Follow-up" and "Quote"

#### Technical Implementation Details
- **HTML Structure**: Must use proper table structure without `<Link>` components as direct children of `<tbody>`
- **Navigation**: Table row clicks handled via `onClick` handlers for proper hydration
- **Authentication**: API routes use `authenticateRequest` from `@/lib/api-auth` with `createCookieClient`
- **Business Access**: Proper validation using `user.accessibleBusinesses` array
- **Data Transformation**: Consistent `LeadWithClient` structure with client relationship handling
- **Time Period Removal**: All time period filtering removed to display all available leads

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

#### Profile Management System (Role-Based)

**For Super Admins (role = 0):**
- **Requirement**: Must display comprehensive Profile Management interface
- **Requirement**: Must show all users in the system except other Super Admins
- **Requirement**: Must include current Super Admin's own profile with role protection
- **Requirement**: Must provide role modification capabilities (promote/demote users)
- **Requirement**: Must enable business assignment management via `profile_businesses` table
- **Requirement**: Must prevent Super Admins from downgrading their own role
- **Requirement**: Must show user lists with role badges and business assignment counts
- **Requirement**: Must provide dual-panel UI (user list + business assignments)

**For Regular Users (role != 0 or null):**
- **Requirement**: Must redirect to dashboard (no access to Profile Management)
- **Requirement**: Must only see their own profile in other contexts
- **Requirement**: Must be limited to their assigned businesses

#### Role Management Features
- **Requirement**: Must allow promotion of Regular Users to Super Admin (role = 0)
- **Requirement**: Must allow demotion of Super Admins to Regular Users (role = 1)
- **Requirement**: Must show "Protected" status for current Super Admin's own profile
- **Requirement**: Must provide visual indicators (Shield/User/Lock icons) for role actions
- **Requirement**: Must validate role changes and prevent unauthorized modifications

#### Business Assignment Management
- **Requirement**: Must display all businesses with dashboard access enabled
- **Requirement**: Must show current assignment status for each user-business combination
- **Requirement**: Must provide Add/Remove business access functionality
- **Requirement**: Must handle Super Admin business access automatically (all businesses)
- **Requirement**: Must prevent business assignment modifications for Super Admins
- **Requirement**: Must validate business access before assignments

#### SQL Queries Required
```sql
-- Fetch all users except other Super Admins (for current Super Admin view)
SELECT id, email, full_name, role, business_id, created_at, updated_at
FROM profiles
WHERE id = $currentUserId OR role IS NULL OR role != 0
ORDER BY full_name;

-- Update user role (role modification)
UPDATE profiles
SET role = $newRole
WHERE id = $userId;

-- Assign business to user
INSERT INTO profile_businesses (profile_id, business_id)
VALUES ($profileId, $businessId);

-- Remove business assignment
DELETE FROM profile_businesses
WHERE profile_id = $profileId AND business_id = $businessId;

-- Fetch user's assigned businesses
SELECT pb.business_id, bc.company_name, bc.avatar_url
FROM profile_businesses pb
INNER JOIN business_clients bc ON pb.business_id = bc.business_id
WHERE pb.profile_id = $profileId;

-- Fetch all available businesses for assignment
SELECT business_id, company_name, avatar_url, city, state
FROM business_clients
WHERE dashboard = true
ORDER BY company_name;
```

#### Authentication & Authorization
- **Requirement**: Must use JWT-only authentication for all Profile Management operations
- **Requirement**: Must validate Super Admin role (role = 0) for all management functions
- **Requirement**: Must use `authenticateRequest()` for API authorization
- **Requirement**: Must include Authorization headers in all client-side requests
- **Requirement**: Must handle authentication errors gracefully with user feedback

### UI Requirements
- **Requirement**: Must use two-column layout (Users list + Business assignments)
- **Requirement**: Must show role badges with appropriate colors (Purple: Super Admin, Blue: Regular User)
- **Requirement**: Must provide role modification buttons with context-aware icons and labels
- **Requirement**: Must display business assignment counts for each user
- **Requirement**: Must show "Protected" button with lock icon for current Super Admin
- **Requirement**: Must provide loading states for all operations (role changes, business assignments)
- **Requirement**: Must show success/error messages for all operations
- **Requirement**: Must prevent clicking on disabled/protected elements
- **Requirement**: Must use consistent styling with rest of application (glass morphism, purple theme)

### UI Cleanup Implementation (September 2024)

#### Section Label Removal
- **COMPLETED**: Removed unnecessary descriptive labels from all application sections for cleaner UI
- **Dashboard**: Removed "Monitor your platform performance and lead metrics" descriptive text
- **Bookings**: Removed "Track appointment shows, closes, and revenue metrics" descriptive text
- **Incoming Calls**: Removed "Analyze call sources, caller types, and call flow patterns" descriptive text
- **Profile Management**: Removed "Manage user access to businesses and assign permissions." descriptive text (both permalink and dashboard routes)
- **RESULT**: Cleaner, more professional interface with reduced visual clutter while maintaining full functionality

#### Enhanced Bookings Functionality
- **RESTORED**: Complete BookingsMetrics component with comprehensive booking analytics
- **ENHANCED**: Dual-component architecture using `useBookingsData` hook for unified data management
- **FEATURES**: Time period filtering, error handling, loading states, and responsive design
- **INTEGRATION**: Seamless integration with existing RecentLeadsTable for complete booking management experience

### Database Schema Integration
```sql
-- profiles table structure (existing)
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text,
  full_name text,
  role smallint, -- 0 = Super Admin, 1+ = Regular User, NULL = Regular User
  business_id smallint, -- Current business context
  avatar_url text,
  created_at timestamp,
  updated_at timestamp
);

-- profile_businesses table structure (existing)
profile_businesses (
  profile_id uuid REFERENCES profiles(id),
  business_id smallint REFERENCES business_clients(business_id),
  created_at timestamp,
  PRIMARY KEY (profile_id, business_id)
);
```

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

## Enhanced Session Management & Business Switching

### Overview

The system implements intelligent session management with enhanced business switching capabilities, ensuring optimal user experience while maintaining proper context preservation and session persistence.

### Business Switching Context Preservation

#### Smart Section Routing
- **Requirement**: When switching from Company X to Company Z, the system must intelligently determine the appropriate target section
- **Requirement**: Must preserve current section (New Leads, Dashboard, Bookings, Incoming Calls) for general navigation pages
- **Requirement**: Must redirect to safe fallback sections for lead-specific pages that may not exist in the target company:
  - Lead Details → New Leads section (since lead IDs are company-specific)
  - Property Details → Bookings section (since property data is company-specific)
  - Actions → New Leads section (since actions are lead-specific)

#### Implementation Requirements
- **Requirement**: Must use `determineTargetPageForBusinessSwitch(pathname)` function for routing decisions
- **Requirement**: Must integrate with BusinessContext `setSelectedCompany` function
- **Requirement**: Must use `window.location.pathname` to detect current route context
- **Requirement**: Must implement graceful fallbacks to prevent 404 errors during business switching

### Session Persistence & Recovery

#### Last Company Memory
- **Requirement**: Must persist the user's last selected company across session expiration and long inactivity periods
- **Requirement**: Must automatically restore the last used company instead of defaulting to first available business
- **Requirement**: Must update database (`profiles.business_id`) whenever business selection changes
- **Requirement**: Must implement automatic fallback persistence when stored business becomes inaccessible

#### Implementation Details
- **Requirement**: Must prioritize `data.currentBusinessId` from user profile over default selection
- **Requirement**: Must automatically call `/api/user/switch-business` when fallback business selection occurs
- **Requirement**: Must implement proper error handling for persistence failures with user notification
- **Requirement**: Must maintain backward compatibility with existing session management

### Technical Architecture

#### File Modifications Required
- `src/contexts/BusinessContext.tsx`: Enhanced `setSelectedCompany` and `refreshContext` functions
- `src/lib/permalink-navigation.ts`: `determineTargetPageForBusinessSwitch` utility function
- Integration with existing authentication and business access validation

#### API Endpoints Used
- `/api/user/switch-business`: For updating user's current business context
- `/api/user/business-context`: For retrieving user's stored business preference
- Database updates to `profiles.business_id` for session persistence

---

## Session Security Architecture

### Overview

The system implements enterprise-grade session security to prevent session bleeding vulnerabilities, ensuring complete user isolation and business context integrity across multi-instance deployments.

### Session Bleeding Vulnerability Resolution

#### Critical Security Issue Addressed
- **Problem**: Session bleeding between concurrent users where User A's business context could leak to User B's session
- **Root Cause**: Missing external session store and inadequate session isolation in multi-instance deployments
- **Impact**: Critical data privacy and security vulnerability in production environments

#### Comprehensive Solution Implemented
- **External Session Store**: Redis-based distributed session storage with atomic operations
- **Real-time Anomaly Detection**: Live monitoring system detecting 4 types of session security violations
- **Enhanced Middleware**: Request-level session validation with sub-200ms performance
- **Atomic Business Switching**: Distributed locking preventing race conditions during business context changes

### Session Security Components

#### Request-Scoped Authentication System (`src/lib/auth-helpers-isolated.ts`)
- **Requirement**: Must use React's `cache()` function for complete request isolation
- **Requirement**: Must generate unique request IDs for tracking and debugging
- **Requirement**: Must prevent global cache contamination through request-scoped caching
- **Requirement**: Must include comprehensive session monitoring integration
- **Requirement**: Must provide session context tracking with user ID validation
- **Key Functions**: `getAuthenticatedUser()`, `getAuthenticatedUserForAPI()`, `validateCompanyAccess()`

#### Redis Session Store (`src/lib/redis-session-store.ts`)
- **Requirement**: Must use external Redis instance for session storage (no in-memory sessions)
- **Requirement**: Must implement atomic business switching with distributed locks (30-second TTL)
- **Requirement**: Must provide session cleanup and garbage collection
- **Requirement**: Must handle Redis connection failures gracefully without breaking application
- **Requirement**: Must support session TTL of 24 hours with automatic renewal
- **Environment Variables Required**: `REDIS_URL`, `SESSION_SECRET`, `SESSION_TTL`, `SESSION_LOCK_TTL`

#### Atomic Business Switching (`src/app/actions/business-switch-secure.ts`)
- **Requirement**: Must implement atomic business switching with distributed locking
- **Requirement**: Must validate business access permissions before context changes
- **Requirement**: Must track timing and performance metrics for operations
- **Requirement**: Must provide comprehensive error handling and rollback capabilities
- **Key Functions**: `atomicBusinessSwitch()`, `getAvailableBusinessesSecure()`, `validateBusinessAccessSecure()`

#### Enhanced Session Middleware (`src/lib/enhanced-session-middleware.ts`)
- **Requirement**: Must validate every request to protected paths with session integrity checks
- **Requirement**: Must detect and terminate compromised sessions immediately
- **Requirement**: Must provide session validation performance under 200ms
- **Requirement**: Must add diagnostic headers for monitoring: `X-Session-Validated`, `X-Process-ID`, `X-Request-ID`
- **Requirement**: Must handle admin path validation with role-based access control
- **Protected Paths**: `/dashboard`, `/new-leads`, `/lead-details`, `/incoming-calls`, `/bookings`, `/settings`, `/api/`
- **Admin Paths**: `/api/admin/`, `/api/system/`

#### Session Diagnostics System (`src/lib/session-diagnostics.ts`)
- **Requirement**: Must detect and alert on 4 critical anomaly types:
  - **session_hijack**: Same session ID used by different users (CRITICAL)
  - **cross_user_contamination**: Session data mixing between users (CRITICAL)
  - **business_context_leak**: Business context bleeding between users (HIGH)
  - **cookie_collision**: Cookie structure conflicts (MEDIUM)
- **Requirement**: Must maintain rolling buffer of 5,000 diagnostic entries
- **Requirement**: Must provide real-time anomaly detection with severity classification
- **Requirement**: Must generate session fingerprints for validation using browser characteristics
- **Requirement**: Must track per-user session mapping and detect violations

#### Admin Monitoring API (`/api/admin/session-diagnostics`)
- **Requirement**: Must provide comprehensive session reporting and anomaly data
- **Requirement**: Must restrict access to superadmin users only (role 0)
- **Available Actions**: `report`, `anomalies`, `user`, `compromised`, `clear`
- **Query Parameters**: `?action=anomalies&severity=critical`, `?action=user&userId=USER_ID`
- **Requirement**: Must support real-time session compromise detection
- **Development Features**: Test anomaly generation and diagnostic data clearing

### Security Validation Requirements

#### Session Integrity Validation
- **Requirement**: Must validate session fingerprints on every protected request
- **Requirement**: Must cross-reference session IDs with user mappings to detect hijacking
- **Requirement**: Must verify business context access rights before allowing switches
- **Requirement**: Must implement request-scoped authentication caching using React's `cache()` function
- **Requirement**: Must clear and regenerate sessions on security violations

#### Business Context Security
- **Requirement**: Must implement atomic business switching with Redis distributed locks
- **Requirement**: Must validate business access permissions before context changes
- **Requirement**: Must track business context changes for audit and anomaly detection
- **Requirement**: Must prevent race conditions during concurrent business switches
- **Requirement**: Must maintain business context isolation between user sessions

#### Monitoring and Alerting
- **Requirement**: Must log all session security events with appropriate severity levels
- **Requirement**: Must provide real-time anomaly detection with immediate alerting
- **Requirement**: Must maintain session statistics for monitoring dashboards
- **Requirement**: Must support session compromise detection API for external monitoring
- **Development Requirement**: Must include development-mode diagnostics with enhanced logging

### Production Deployment Requirements

#### Environment Configuration
```env
# CRITICAL - External Session Store
REDIS_URL=redis://username:password@host:port
SESSION_SECRET=32_CHAR_MINIMUM_STRONG_SECRET
NEXT_PUBLIC_ENABLE_GLOBAL_CACHE=false

# Session Security Settings
SESSION_TTL=86400                    # 24 hours
SESSION_LOCK_TTL=30                  # 30 seconds
SESSION_MAX_RETRY_ATTEMPTS=3

# Monitoring and Diagnostics
ENABLE_SESSION_MONITORING=true
SESSION_DIAGNOSTICS_RETENTION=5000
WORKER_ID=${HOSTNAME}

# Performance Tuning
REDIS_MAX_CONNECTIONS=50
REDIS_KEEPALIVE_INTERVAL=30000
REDIS_COMMAND_TIMEOUT=3000
```

#### Deployment Architecture
- **Requirement**: Must deploy with external Redis session store (Upstash, Redis Cloud, Railway)
- **Requirement**: Must start with single instance deployment for validation
- **Requirement**: Must enable session monitoring and anomaly detection
- **Requirement**: Must configure health checks that don't create sessions (`/api/health`)
- **Scaling Requirement**: Only scale to multiple instances after 24+ hours of zero critical anomalies

#### Security Testing Protocol
- **Pre-Production**: Must pass two-user simultaneous login test with business switching
- **Anomaly Detection**: Must verify zero critical anomalies in diagnostics dashboard
- **Performance**: Must maintain session validation under 200ms response time
- **Monitoring**: Must confirm admin diagnostics API accessible and functional

### Integration with Existing Components

#### Authentication Helpers Integration
- **Requirement**: Must use request-scoped caching in `auth-helpers-secure.ts`
- **Requirement**: Must integrate with existing Supabase authentication flow
- **Requirement**: Must maintain compatibility with business context switching
- **Requirement**: Must preserve existing user role validation and business access controls

#### Middleware Integration
- **Requirement**: Must initialize Redis session store on application startup
- **Requirement**: Must setup security cleanup processes and monitoring
- **Requirement**: Must integrate with existing Supabase middleware chain
- **Requirement**: Must preserve existing route protection and authentication flows

### Success Criteria

#### Security Validation
- **Zero Critical Anomalies**: No `session_hijack` or `cross_user_contamination` events
- **Session Isolation**: Multiple concurrent users with complete context separation
- **Business Context Integrity**: Atomic business switching with no data leakage
- **Performance**: Sub-200ms session validation with Redis backend

#### Monitoring and Operations
- **Real-time Detection**: Immediate anomaly detection and alerting
- **Admin Visibility**: Comprehensive session diagnostics and reporting
- **Production Readiness**: 24/7 monitoring with automated session cleanup
- **Scalability**: Multi-instance deployment support with external session store

---

## Session Debugging & Observability System

### Overview
A comprehensive debugging system designed to identify and resolve user data mixing issues through structured, secure, and user-specific debug logs that track authentication, business context, cache operations, and API requests across frontend and backend components.

### Debugging System Architecture

#### Core Debug Infrastructure (`src/lib/debug.ts`)
- **Requirement**: Must provide structured, secure debugging utility with automatic data masking
- **Requirement**: Must generate unique tab/session identifiers for each browser tab
- **Requirement**: Must support conditional logging that can be enabled/disabled in production
- **Requirement**: Must implement automatic sensitive data masking (JWT tokens, passwords, emails)
- **Requirement**: Must provide user-specific tracking with consistent metadata extraction
- **Security Features**:
  - JWT token masking: Shows only first/last 8 characters for correlation
  - Email masking: Protects user privacy while maintaining debuggability
  - Sensitive field detection: Automatically masks passwords, secrets, keys
  - No data persistence: Debug logs exist only in browser session

#### Debug Context Categories
- **AUTH**: Authentication operations, JWT validation, session management
- **BUSINESS**: Business switching, access validation, context synchronization
- **CACHE**: Cache hits/misses, performance metrics, invalidation tracking
- **API**: API route operations, request/response logging, error handling
- **SESSION**: Session management, context refresh, cross-tab coordination
- **UI**: User interface operations, component state changes, user interactions

#### API Route Debug Middleware (`src/lib/api-debug-middleware.ts`)
- **Requirement**: Must provide consistent debugging for Next.js API routes
- **Requirement**: Must track request/response flow, authentication, and business context
- **Requirement**: Must operate as passive observer without affecting actual API responses
- **Requirement**: Must include request correlation IDs for end-to-end tracing
- **Requirement**: Must handle debug operation failures gracefully without crashing APIs
- **Key Functions**: `withApiDebug()`, `withAuthenticatedApiDebug()`, `logBusinessAccess()`

### Frontend Debug Integration

#### Business Context Debugging (`src/contexts/BusinessContext.tsx`)
- **Requirement**: Must log all business switching operations with full context
- **Requirement**: Must track authentication token correlation across operations
- **Requirement**: Must monitor session context refresh and synchronization
- **Requirement**: Must log URL vs context synchronization for permalink routes
- **Key Debug Points**: 
  - Authentication token retrieval and validation
  - Business context refresh operations
  - Business switching attempts and results
  - Context state updates and component synchronization

#### Authentication Flow Debugging (`src/lib/auth-helpers.ts`)
- **Requirement**: Must log all authentication operations with cache performance
- **Requirement**: Must track rate limiting and stale cache serving
- **Requirement**: Must monitor business access validation and role-based operations
- **Requirement**: Must log cache hits/misses with timing and performance metrics
- **Key Debug Points**:
  - User authentication success/failure with detailed context
  - Cache performance monitoring (hits, misses, stale serving)
  - Rate limit detection and handling
  - Business access validation for different user roles

### Backend Debug Integration

#### Cache System Debugging (`src/lib/cache.ts`)
- **Requirement**: Must log all cache operations with performance metrics
- **Requirement**: Must track cache hit rates and aging patterns
- **Requirement**: Must monitor cache invalidation and eviction operations
- **Requirement**: Must provide insights into cache efficiency and optimization needs
- **Key Debug Points**:
  - Cache hit/miss events with age and performance data
  - Cache set operations with TTL and tag information
  - Cache invalidation tracking with eviction counts
  - Memory usage and cleanup operations

#### API Route Debugging Implementation
- **Requirement**: Must instrument critical API routes with comprehensive logging
- **Routes Instrumented**:
  - `/api/user/business-context` - User context fetching with full debugging
  - `/api/user/switch-business` - Business switching with access validation logging
- **Debug Features**:
  - Authentication debugging with request correlation
  - Business access validation logging
  - Error handling with full context
  - Performance timing for all operations

### Debug Log Format & Correlation

#### Structured Log Format
```
[LEVEL][CONTEXT][TAB_ID][U:USER_ID][B:BUSINESS_ID][JWT:TOKEN_HASH][REQUEST_ID] Message
```

#### Example Debug Flows
```
[DEBUG][AUTH][tab_abc123][][JWT:eyJhbGci] Authentication attempt
[DEBUG][AUTH][tab_abc123][U:user1][JWT:eyJhbGci] Authentication successful
[DEBUG][CACHE][tab_abc123][U:user1] Cache SET: user:1:businesses
[DEBUG][BUSINESS][tab_abc123][U:user1][B:biz1] Business switch attempt
[DEBUG][API][tab_abc123][U:user1][B:biz1] POST /api/user/switch-business - START
[DEBUG][BUSINESS][tab_abc123][U:user1][B:biz2] Business switch successful
```

### Debug Activation & Control

#### Activation Methods
- **Development**: Automatically enabled in development mode
- **Production Browser**: `__enableSessionDebug()` / `__disableSessionDebug()` in console
- **URL Parameter**: `?debug=true` in URL
- **Environment Variable**: `DEBUG_SESSION_TRACKING=true`

#### Debug Status Functions
- **Browser Console**: `__debugStatus()` - Check current debug status
- **Dynamic Control**: Enable/disable logging without application restart
- **Performance Monitoring**: Zero impact when disabled in production

### User Data Mixing Detection

#### Key Detection Patterns
- **Session Isolation Monitoring**: Multiple user IDs appearing in same tab session
- **Authentication Flow Tracking**: JWT token correlation across requests
- **Business Context Synchronization**: Business switches should be atomic and consistent
- **Cache Performance Issues**: Cache serving wrong user data or stale entries

#### Debug Investigation Workflow
1. **Enable Debug Logging**: Activate structured logging for affected users
2. **Monitor Log Patterns**: Look for user ID mismatches, business context inconsistencies
3. **Trace Request Flows**: Use request IDs to follow operations end-to-end
4. **Analyze Cache Behavior**: Monitor cache hits/misses and data consistency
5. **Validate Session Isolation**: Ensure each browser tab maintains consistent context

### Production Deployment Requirements

#### Security & Performance
- **Requirement**: Debug logging must have zero performance impact when disabled
- **Requirement**: Sensitive data must be automatically masked in all debug output
- **Requirement**: Debug logs must not persist beyond browser session
- **Requirement**: Production deployment must disable debugging by default

#### Monitoring Integration
- **Requirement**: Debug system must integrate with existing session security monitoring
- **Requirement**: Debug events must be correlatable with session diagnostics
- **Requirement**: Debug system must support external monitoring and alerting integration
- **Requirement**: Must provide debug performance metrics and health monitoring

---

## Recent Feature Updates

### Address Verification Booking Feature ✅ COMPLETED (2025-09-26)
**Manual Address Verification with Webhook Integration**
- **Purpose**: Allow users to manually verify lead addresses and send verification data to external webhook for processing
- **UI Implementation**:
  - Added "Booking" button to Lead Details, Actions, and Property Details pages
  - Positioned next to LeadStageDropdown for consistent placement
  - Modal form with street_name and postal_code input fields
  - Form validation and error handling with loading states
- **API Integration**:
  - Created `/api/booking/verify-address` POST endpoint with authentication
  - Webhook URL: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/ghl-verify-address`
  - Request payload includes: `lead_id`, `account_id`, `business_id`, `street_name`, `postal_code`
  - Comprehensive error handling and logging for webhook failures
- **Components Created**:
  - `BookingModal.tsx` - Reusable modal with form validation and submission
  - `BookingButton.tsx` - Button component that triggers the modal
- **Security**: Proper authentication and business context validation
- **User Experience**: Success feedback with auto-close after confirmation

### Property Details Page Major Refactoring ✅ COMPLETED (2025-09-26)
**Complete Layout and Component Architecture Redesign**
- **Layout Changes**:
  - Property Information moved from right column to full-width row (second section)
  - Actions component added to Property Details page in right column position
  - New structure: Lead Info → Property Information (full-width) → Communications + Actions (two-column)
- **Property Information Component Redesign**:
  - Implemented two-column layout: Left (property image), Right (property data)
  - Adopted Lead Info component styling for consistency
  - Removed custom gradient styling, applied standard gray-50 background cards
  - Enhanced visual hierarchy with proper Lead Info-style header
- **Actions Integration**:
  - Added full ActionsChecklist component from actions page to property details
  - Maintains complete CRUD functionality (create, read, update, delete actions)
  - Proper business context and authentication integration
- **Styling Consistency**:
  - Applied exact Lead Info styling patterns across property data fields
  - Consistent rounded containers, shadows, and color schemes
  - Responsive design maintained across all screen sizes

### Critical Database Schema Fix ✅ COMPLETED (2025-09-26)
**Deprecated Column Reference Removal**
- **Issue**: 500 Internal Server Error caused by referencing non-existent `called_out` column in call_windows table
- **Root Cause**: Legacy column reference remained in multiple API endpoints after database schema evolution
- **Solution**: Comprehensive removal of `called_out` column references across all API routes
- **Files Fixed**:
  - `src/app/api/bookings/leads/route.ts` - Removed from SELECT query and mapping logic
  - `src/app/api/leads/recent/route.ts` - Removed from SELECT query and mapping logic
  - `src/app/api/leads/[leadId]/route.ts` - Removed from SELECT query and mapping logic
- **Impact**: Bookings page and lead details now load successfully without 500 errors
- **Data Integrity**: Set `calledOut` property to `null` to maintain interface compatibility
- **Deployment Status**: Ready for production deployment with full backward compatibility

### Call Window History Icons Implementation ✅ COMPLETED (2025-09-25)
**Visual Interaction History for Lead Management**
- **Purpose**: Provide quick visual history of lead interactions directly within table rows
- **Implementation**: Created `CallWindowHistoryIcons` component for unified display across all lead tables
- **Visual Design**: Horizontal single-row layout displaying maximum of 6 call window icons
- **Layout Update (2025-09-26)**: Changed from 2-column, 3-row grid to 1-row, 6-column horizontal layout for improved visual flow
- **Integration Points**:
  - Call Now table (`LeadsTable.tsx`)
  - Follow Up table (`FollowUpTable.tsx`)
  - Recent Leads table (`RecentLeadsTable.tsx`)
  - Waiting to Call table (via `LeadsTable` component)
- **API Enhancement**: Updated `/api/leads/recent` and `/api/bookings/leads` routes to include call window data
- **Database Integration**: Added `call_windows` left join to fetch interaction history
- **Status Color Mapping**: Dynamic color system based on call window status:
  - Status 1 = Green (successful contact)
  - Status 2 = Orange (attempted contact)
  - Status 3 = Yellow (scheduled callback)
  - Status 4 = Red (missed/failed contact)
  - Status 10 = Diamond with sparkles (premium interaction)
  - Status 11 = Gold (high-value interaction)
  - Status 12 = Silver (medium-value interaction)
  - Status 13 = Bronze/copper (standard interaction)
- **Data Filtering**: Icons display only call windows with non-null status values
- **Performance**: Component optimized with React.memo for efficient re-rendering
- **User Experience**: Icons positioned inline to the left of "Next Step" data for contextual visibility

### Universal Header Visibility Optimization ✅ COMPLETED (2025-09-24)
**Header Missing on Critical Pages**
- **Issue**: UniversalHeader was not visible on `/actions`, `/lead-details`, and `/property-details` pages
- **Root Cause**: Layout files were missing `OptimizedLayoutWrapper` component that includes the header
- **Solution**: Updated three layout files to use consistent architecture:
  - `src/app/[permalink]/actions/layout.tsx` - Added OptimizedLayoutWrapper
  - `src/app/[permalink]/lead-details/layout.tsx` - Added OptimizedLayoutWrapper
  - `src/app/[permalink]/property-details/layout.tsx` - Added OptimizedLayoutWrapper
- **Architecture Benefit**: Standardized layout pattern across all permalink-based routes
- **Performance**: Zero impact - maintains optimized authentication data flow without additional API calls
- **User Experience**: Navigation and business switching now available on all pages

### Actions Management Enhancement ✅ COMPLETED
**Delete Functionality for Actions**
- Added DELETE API endpoint (`/api/actions/[actionId]`) with proper authentication and business access validation
- Enhanced Actions edit popup with delete button featuring:
  - Red-styled delete button with trash icon
  - Safety confirmation dialog with action preview
  - Loading states and error handling
  - Immediate UI state sync after deletion
- Maintains existing save/cancel functionality while adding destructive action capability

### Incoming Calls Analytics Fixes ✅ COMPLETED
**Business Context Integration**
- **Root Issue**: Fixed hardcoded business ID usage that caused cross-business data display
- **Solution**: Integrated `useBusinessContext()` hook for dynamic business switching
- **Authentication**: Standardized API authentication using `authenticateRequest()` pattern
- **Business Filtering**: Corrected string/number type mismatches in business access validation
- **Coordinated Loading**: Implemented proper loading states to prevent empty content flash

### Authentication Debug System ✅ COMPLETED
**Comprehensive Logging for Cookie-Based Authentication**
- Environment variables debugging (`NEXT_PUBLIC_USE_COOKIE_AUTH=true` validation)
- Session establishment and token management monitoring
- Cookie resource usage tracking (count, names, sizes)
- Request performance monitoring (timing, status, errors)
- Business access resolution debugging
- Client-side and server-side authentication flow tracing
- All logs use `[AUTH_DEBUG]` prefix for easy filtering

### API Routes Performance Optimization ✅ COMPLETED
**Centralized Authentication with Request-Scoped Caching**
- **Root Issue**: API routes performing redundant authentication and data fetching, repeating checks already done on server
- **Solution**: Created optimized authentication middleware using request-scoped caching
- **Performance Impact**:
  - Eliminated 70+ redundant `createCookieClient()` calls (now 1 per request)
  - Removed duplicate user profile fetching (uses cached layout data)
  - Streamlined business access validation (uses cached accessible businesses list)
  - Reduced API route overhead from 4 DB queries to 0 additional queries
- **Implementation**:
  - `authenticateApiRequest()` - Uses `getRequestAuthUser()` cached data
  - `authenticateAndAuthorizeApiRequest()` - All-in-one auth + business validation
  - `validateBusinessAccess()` - Uses cached user data for access checks
- **Refactored Endpoints**: `/api/dashboard/platform-spend`, `/api/leads/metrics`, `/api/incoming-calls/analytics`, `/api/leads/recent`, `/api/business/accessible`
- **Architecture**: Request-scoped Supabase client singleton shared between layout and API routes
- **Result**: API calls now have predictable, minimal authentication overhead with zero redundant database calls

### End-to-End User Experience Performance Analysis ✅ COMPLETED
**Comprehensive Flow Performance Optimization**
- **Login to Dashboard Flow**: Analyzed complete user authentication and dashboard loading flow
  - Backend Performance: ~200-400ms with optimized authentication caching
  - Frontend Performance: Unified loading states prevent UI flashing
  - **Result**: Already highly optimized with no significant bottlenecks identified
- **"Call Now" to Lead Details Flow**: Analyzed high-priority lead navigation experience
  - Backend Performance: Parallel database queries (~300-600ms total)
  - Frontend Performance: Memoized components with unified loading strategy
  - **Result**: Enterprise-grade performance with optimistic UI updates
- **"Follow Up" to Actions Flow**: Analyzed stage 2 lead action management experience
  - Backend Performance: Dual API loading (Lead Details + Actions) with parallel execution
  - Frontend Performance: Independent component loading with error isolation
  - **Result**: Excellent performance with real-time action feedback and graceful degradation

**Performance Architecture Achievements**:
- **Authentication**: Zero redundant calls using `AuthDataProvider` cached data pattern
- **Component Optimization**: Strategic use of `memo()`, `useCallback()`, and `useMemo()`
- **Loading Strategy**: Unified loading states eliminate component flashing across all flows
- **Error Handling**: Component-level error isolation prevents cascade failures
- **Database Efficiency**: Optimized queries with selective field projection and proper indexing
- **User Experience**: Real-time feedback with optimistic updates and loading indicators

### Technical Improvements
- **API Consistency**: All incoming calls APIs now use standardized authentication patterns
- **Type Safety**: Fixed business_id string/number conversion issues across the application
- **Error Handling**: Enhanced error reporting with detailed context information
- **Performance Monitoring**: Comprehensive end-to-end user flow performance analysis completed
- **Architecture Validation**: All critical user flows demonstrate enterprise-grade optimization
- **Resource Monitoring**: Added performance metrics for authentication requests
- **Code Quality**: Removed temporary debug logs to maintain clean production code

---

## Database Schema

### Core Tables

#### leads
- **Purpose**: Store lead information and status
- **Key Fields**: lead_id, account_id, business_id, first_name, last_name, email, phone, service, source, how_soon, score, status, contacted, start_time, show, closed_amount, working_hours, calls_count, communications_count, next_step
- **Enhanced Fields for New Leads Table**:
  - calls_count (integer): Number of calls made to this lead (replaces score display in UI)
  - working_hours (boolean): Indicates if calls were made during working hours (affects icon display)
  - how_soon (text): Priority/urgency level (displayed as colored tags)
  - source (text): Lead source information (displayed as colored badges)
  - next_step (text): Next action to take with this lead

#### clients
- **Purpose**: Store property and location data
- **Key Fields**: account_id, business_id, full_address, house_value, house_url, distance_meters, duration_seconds

#### communications
- **Purpose**: Store communication history
- **Key Fields**: communication_id, account_id, message_type, summary, recording_url, created_at

#### business_clients
- **Purpose**: Store business configuration and Dialpad integration settings
- **Key Fields**: business_id, company_name, avatar_url, time_zone, dialpad_phone
- **Enhanced Features**: Dialpad phone number storage for Call Now button integration

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

## Metrics Components Architecture

### Overview

The system implements distributed metrics components that provide consistent styling and behavior across different sections while maintaining optimal user experience and performance.

### Component Distribution Strategy

#### Rationale for Section-Specific Metrics
- **UX Improvement**: Users working in specific sections (New Leads, Bookings) benefit from having relevant metrics immediately visible
- **Performance Optimization**: Reduces dashboard complexity and loading overhead by distributing data fetching
- **Context Relevance**: Metrics are displayed where they are most actionable and relevant to user workflow
- **Elimination of Duplication**: Prevents metric redundancy across multiple pages

#### Implementation Architecture

##### Reusable Metrics Components
- **Component**: `LeadsMetrics` - Displays New Leads section metrics
  - Location: `src/components/features/metrics/LeadsMetrics.tsx`
  - Props: `metrics`, `isLoading`, `error`
  - Styling: Maintains exact original styling with icons, colors, badges, responsive grid

- **Component**: `BookingsMetrics` - Displays Bookings section metrics
  - Location: `src/components/features/metrics/BookingsMetrics.tsx`
  - Props: `metrics`, `isLoading`, `error`
  - Styling: Maintains exact original styling with icons, colors, badges, responsive grid

##### Component Integration Requirements
- **Requirement**: Must maintain identical styling and behavior from original Dashboard implementation
- **Requirement**: Must preserve all loading states, error handling, and data formatting
- **Requirement**: Must use responsive grid layouts (4 columns for New Leads, 5 columns for Bookings)
- **Requirement**: Must maintain all original icons and color schemes
- **Requirement**: Must preserve percentage calculations and badge displays

### Section-Specific Requirements

#### New Leads Section Metrics
- **Order**: Leads, Contacts, Booked, Booking Rate (exact order required)
- **Grid**: 4 columns responsive layout (1 col mobile, 2 cols md, 4 cols lg)
- **Data Source**: `useLeadsData` hook with 30-day default period
- **Position**: First row, above lead tables

#### Bookings Section Metrics
- **Order**: Shows, Total Calls, Closes, Total Revenue, Close Rate (exact order required)
- **Grid**: 5 columns responsive layout (1 col mobile, 2 cols md, 5 cols lg)
- **Data Source**: `useBookingsData` hook with 30-day default period
- **Position**: First row, above bookings table

#### Dashboard Simplification (Updated Platform Focus)
- **Requirement**: Must display only Platform Breakdown component with enhanced design
- **Requirement**: Must remove all lead and booking metrics to eliminate duplication
- **Requirement**: Must maintain TimePeriodFilter functionality for Platform Breakdown
- **Requirement**: Must use simplified data fetching with only `useDashboardData` hook
- **Requirement**: Must implement unified component design with total spend calculation
- **Requirement**: Must support horizontal card layout for individual platforms
- **Requirement**: Must exclude deprecated expandable/collapsible functionality

---

## Technical Requirements

### Technology Stack
- **Frontend Framework**: Next.js 14 with App Router
- **UI Library**: React 18
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS
- **Typography**: Plus Jakarta Sans (Google Fonts) - weights 300, 400, 500, 600, 700, 800
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **Charts**: Recharts for pie charts, D3 with d3-sankey for flow diagrams
- **Icons**: Lucide React

### Runtime Requirements
- **Node.js**: Version 20.0.0 or higher
- **NPM**: Version 8.0.0 or higher
- **Environment Variables**:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  - NEXT_PUBLIC_SITE_URL (required for production deployments)
  - NEXT_PUBLIC_USE_COOKIE_AUTH=true (enables optimized cookie-only authentication)

### UI Theme Requirements ✅ IMPLEMENTED (2025-09-25)
**Enforced Light Theme System**
- **CRITICAL**: System uses **EXCLUSIVELY** light theme at all times, regardless of system preferences or time-based conditions
- **Tailwind Configuration**: Dark mode set to `'class'` mode instead of `'media'` to disable automatic system preference detection
- **Component Implementation**: All `dark:` utility classes removed from all components to prevent dark theme application
- **Consistency**: Light theme enforced across all pages, modals, dropdowns, tables, and interactive components
- **Performance**: Eliminated theme switching logic reduces computational overhead and ensures consistent rendering
- **User Experience**: Provides predictable, consistent visual experience without unexpected theme transitions
- **Components Updated**:
  - CallWindows component - removed 7 dark theme class references
  - Settings page - removed 12 dark theme class references
  - Layout wrappers - removed dark background classes
  - UserDropdown - removed 6 dark theme class references
  - BusinessSwitcher - removed 6 dark theme class references
  - All layout files - standardized to light theme backgrounds
- **Production Ready**: Build process validates no remaining `dark:` classes, ensuring deployment consistency

### Typography Requirements ✅ IMPLEMENTED (2025-09-29)
**Plus Jakarta Sans Font System**
- **CRITICAL**: System uses **EXCLUSIVELY** "Plus Jakarta Sans" as the primary font family across the entire application
- **Font Import**: Imported via Next.js Google Fonts (`next/font/google`) in root layout
- **Font Weights**: Configured with weights 300, 400, 500, 600, 700, 800 for complete design flexibility
- **Tailwind Integration**: Set as default sans-serif font family in `tailwind.config.js` via CSS variable `--font-plus-jakarta-sans`
- **Global Application**: Applied to `<body>` element via className in root layout for universal inheritance
- **Fallback Stack**: System fonts (`system-ui`, `sans-serif`) configured as fallbacks for reliability
- **Font Display**: Set to `swap` for optimal loading performance and preventing FOIT (Flash of Invisible Text)
- **CSS Variable**: Global CSS variable ensures consistent font application across all components
- **Component Compatibility**: All existing Tailwind utility classes (font-bold, font-semibold, etc.) automatically use Plus Jakarta Sans
- **No Hardcoded Fonts**: Zero hardcoded font-family declarations in any component ensures consistency
- **Files Modified**:
  - `src/app/layout.tsx` - Added Plus Jakarta Sans import and application
  - `tailwind.config.js` - Extended fontFamily with Plus Jakarta Sans as default sans
  - `src/app/globals.css` - Updated body font-family to use CSS variable
- **Verification**: Browser inspect element shows "Plus Jakarta Sans" instead of system fonts (.AppleSystemUIFont, etc.)
- **Production Ready**: Build validates font loading and application across all pages

### Authentication Architecture Requirements ✅ OPTIMIZED
- **Cookie Storage**: All authentication state stored in secure HTTP-only cookies
- **Consolidated API**: Single `/api/auth/post-login` endpoint handles all post-login logic
- **Data Flow**: Server components fetch user data once, pass to client components via props
- **Context Optimization**: BusinessContext accepts `initialUser` prop to avoid redundant API calls
- **Middleware**: Cookie-only authentication in middleware for consistent session handling
- **API Route Optimization**: Request-scoped caching eliminates redundant authentication in API endpoints
- **Request-Scoped Clients**: Single Supabase client instance shared between layout and API routes per request
- **Performance**: 50-75% reduction in authentication-related API calls per page load + 100% elimination of API route auth overhead

### React Hooks Compliance Requirements
- **Rules of Hooks**: All components must strictly follow React's Rules of Hooks
- **Hook Call Order**: All hooks must be called in the same order every time a component renders
- **No Conditional Hooks**: Hooks must never be called inside loops, conditions, or nested functions
- **Early Returns**: All hook declarations must occur before any conditional return statements
- **Component Structure**: Required pattern for all functional components:
  1. All hook declarations (useState, useCallback, useMemo, useEffect, custom hooks)
  2. Conditional logic and early returns (loading, error, no data states)
  3. Main component rendering logic
- **Error Prevention**: Prevents "Rendered fewer hooks than expected" runtime errors
- **Navigation Safety**: Ensures reliable component re-rendering during route navigation
- **Production Stability**: Critical for stable production deployments and user experience

### Hook Declaration Pattern
```tsx
// ✅ CORRECT: All hooks declared first
const Component = ({ prop1, prop2 }) => {
  // 1. ALL HOOKS FIRST
  const [state, setState] = useState(initial)
  const memoValue = useMemo(() => computation, [deps])
  const callback = useCallback(() => action, [deps])
  const customHookResult = useCustomHook(params)
  
  // 2. THEN CONDITIONAL RETURNS
  if (loading) return <LoadingComponent />
  if (error) return <ErrorComponent />
  if (!data) return <NoDataComponent />
  
  // 3. MAIN RENDER LOGIC
  return <MainComponent />
}

// ❌ WRONG: Hooks after conditional returns
const Component = ({ loading, data }) => {
  if (loading) return <LoadingComponent /> // ❌ Early return
  const [state, setState] = useState(data) // ❌ Hook after return
}
```

### Production Deployment Requirements
- **Build Type**: Next.js standalone build optimized for production
- **Static Assets**: Public folder assets automatically copied to standalone build
- **Logo Requirements**: Production logo path must resolve to `/images/jennsLogo.png` (Jenn's Roofing branding)
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

### Session Security & Isolation Requirements

#### Critical Session Management
- **Requirement**: Must implement request-scoped authentication caching to prevent session bleeding
- **Requirement**: Must validate user identity on every cache access to prevent cross-user contamination
- **Requirement**: Must use unique request identifiers to isolate cache entries between concurrent requests
- **Requirement**: Must implement session monitoring with real-time anomaly detection
- **Requirement**: Must prevent global state pollution that could cause session mixing

#### Session Isolation Implementation
- **File**: `/src/lib/auth-helpers.ts` - Request-scoped authentication cache with user validation
- **File**: `/src/lib/session-monitoring.ts` - Session monitoring and security alerting system
- **Cache Architecture**: RequestScopedAuthCache replaces global authCache to prevent cross-user contamination
- **Validation**: All cache entries must include userId validation and request ID tracking
- **Monitoring**: Real-time detection of cache contamination, session bleeding, and suspicious switching patterns

#### Business Context Security
- **Requirement**: Must implement session-aware business context with validation
- **Requirement**: Must track business context changes for security monitoring
- **Requirement**: Must validate business access rights on every context switch
- **Requirement**: Must prevent unauthorized business data access through context manipulation

#### Atomic Business Switching
- **Requirement**: Must implement atomic business switching operations with race condition prevention
- **Requirement**: Must use unique request IDs and session tracking for all business switch operations
- **Requirement**: Must validate business access before and after switching operations
- **Requirement**: Must implement operation locking to prevent concurrent switches
- **Requirement**: Must include comprehensive error handling and rollback mechanisms

#### Session Monitoring & Alerting
- **Requirement**: Must track all authentication events, business switches, and cache accesses
- **Requirement**: Must detect and alert on session anomalies: bleeding, contamination, suspicious patterns
- **Requirement**: Must provide session diagnostics and statistics for monitoring dashboards
- **Requirement**: Must implement configurable alert thresholds and notification systems
- **Requirement**: Must maintain session audit trail for security compliance

#### Testing & Validation Framework
- **File**: `/test-session-isolation.js` - Automated session isolation testing with concurrent users
- **File**: `/test-business-switching.js` - Business context validation and switching tests
- **Requirement**: Must validate session isolation under concurrent load
- **Requirement**: Must test business switching with multiple simultaneous users
- **Requirement**: Must verify no session bleeding occurs during rapid switching
- **Requirement**: Must validate cache isolation and user ID validation

#### Security Compliance
- **Session Isolation**: Zero tolerance for session bleeding or cross-user data exposure
- **Authentication Integrity**: All cache access must be validated against authenticated user
- **Business Access Control**: Strict validation of business context access rights
- **Monitoring Coverage**: Comprehensive tracking of all session-related security events
- **Production Readiness**: Full deployment with monitoring alerts and audit capabilities

#### SQL Queries Required
```sql
-- Session validation with business access
SELECT p.id, p.role, pb.business_id
FROM profiles p
LEFT JOIN profile_businesses pb ON p.id = pb.profile_id
WHERE p.id = $userId
AND (p.role = 0 OR pb.business_id = $businessId);

-- Session monitoring audit trail
INSERT INTO session_audit_log (session_id, user_id, action, business_id, ip_address, created_at)
VALUES ($sessionId, $userId, $action, $businessId, $ipAddress, NOW());
```

---

*This document defines the complete requirements for the Lead Management System. All implementations must align with these specifications.*
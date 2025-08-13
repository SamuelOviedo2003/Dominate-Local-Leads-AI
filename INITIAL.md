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
- [Salesman](#salesman)
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
- **Requirement**: Company logo must display above form (`/images/DominateLeads2.webp`)
- **Requirement**: Logo must maintain natural aspect ratio

#### Authentication Flow
- **Requirement**: Unauthenticated users must redirect to login page
- **Requirement**: Successful login must redirect to `/home` page
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
- **Status**: Currently under construction
- **Future Requirement**: Will display key performance metrics and overview charts

---

## New Leads

### Functional Requirements

#### Lead Metrics Component
- **Requirement**: Must display total leads count for selected time period
- **Requirement**: Must show contacted leads count and percentage
- **Requirement**: Must show booked leads count and percentage
- **Requirement**: Must calculate contact rate (contacted/total)
- **Requirement**: Must calculate booking rate (booked/contacted)

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
- **Requirement**: Must use 2x2 grid layout with table spanning full width at bottom
- **Requirement**: Must include time period filter (30/60/90 days) in top-right
- **Requirement**: Must show loading states while fetching data
- **Requirement**: Score must display as color-coded circle (Red: 0-33%, Yellow: 34-66%, Green: 67-100%)
- **Requirement**: How Soon must use color coding (Red: ASAP, Orange: week, Blue: month, Gray: default)

---

## Lead Details

### Functional Requirements

#### Lead Information Display
- **Requirement**: Must display complete lead profile including name, email, phone
- **Requirement**: Must show email validation status (✓/✗)
- **Requirement**: Must display service details, urgency, and metadata
- **Requirement**: Must show property information with image
- **Requirement**: Must display lead score with color coding

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

#### Message Type Colors
- Email: Blue background
- SMS/Text: Green background
- Call/Phone: Purple background
- Voicemail: Orange background

---

## Incoming Calls

### Functional Requirements

#### Analytics Dashboard
- **Requirement**: Must display source distribution pie chart
- **Requirement**: Must display caller type distribution pie chart
- **Requirement**: Must show Sankey diagram linking sources to caller types
- **Requirement**: Must display recent calls table
- **Requirement**: Must include time period filter (30/60/90 days)

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

-- Sankey relationships
SELECT source, caller_type, COUNT(*) as value
FROM incoming_calls
WHERE created_at >= $startDate
AND source IS NOT NULL AND source != 'Unknown'
AND caller_type IS NOT NULL AND caller_type != 'Unknown'
GROUP BY source, caller_type
ORDER BY value DESC;

-- Recent calls table
SELECT *
FROM incoming_calls
WHERE created_at >= $startDate
ORDER BY created_at DESC
LIMIT 20;
```

### UI Requirements
- **Requirement**: Must use responsive grid layout for charts
- **Requirement**: Must exclude "Unknown" values from visualizations
- **Requirement**: Must show hover tooltips on charts
- **Requirement**: Table must display: Date & Time, Source, Caller Type, Duration, Status

---

## Salesman

### Functional Requirements

#### Revenue Metrics
- **Requirement**: Must display shows count (leads where show = true)
- **Requirement**: Must display closes count (leads with closed_amount)
- **Requirement**: Must calculate total revenue
- **Requirement**: Must calculate close rate (closes/shows)
- **Requirement**: Must calculate average order value

#### SQL Queries Required
```sql
-- Shows count
SELECT COUNT(*) as shows
FROM leads
WHERE created_at >= $startDate
AND business_id = $businessId
AND show = true;

-- Closes count
SELECT COUNT(*) as closes
FROM leads
WHERE created_at >= $startDate
AND business_id = $businessId
AND closed_amount IS NOT NULL;

-- Total revenue
SELECT SUM(COALESCE(closed_amount, 0)) as total_amount
FROM leads
WHERE created_at >= $startDate
AND business_id = $businessId;
```

### UI Requirements
- **Requirement**: Must display metrics in card layout
- **Requirement**: Must include time period filter
- **Requirement**: Must show loading states during data fetch

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
- **Requirement**: Must provide animated loading screens with house roof repair theme
- **Requirement**: Must support multiple sizes (sm, md, lg)
- **Requirement**: Must include 7-phase animation sequence
- **Requirement**: Must provide contextual loading messages

### Animation Phases
1. Construction worker appears (500ms)
2. Top center shingle slides in (1000ms)
3. Second row shingles slide from sides (1400ms)
4. Third row shingles with stagger (1800ms)
5. Bottom row shingles complete (2200ms)
6. Success glow and sparkles (2600ms)
7. Final shimmer sweep (3000ms, reset at 3500ms)

### UI Requirements
- **Requirement**: Must use purple/violet gradients (#6366f1 to #8b5cf6)
- **Requirement**: Must include coral accent colors (#f87171)
- **Requirement**: Must be hardware-accelerated (CSS transforms only)
- **Requirement**: Must respect prefers-reduced-motion settings

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
- **Purpose**: Store call analytics data
- **Key Fields**: incoming_call_id, source, caller_type, duration, status, created_at

#### leads_calls
- **Purpose**: Store appointment setter call data
- **Key Fields**: leads_call_id, lead_id, assigned, duration, time_speed, created_at

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
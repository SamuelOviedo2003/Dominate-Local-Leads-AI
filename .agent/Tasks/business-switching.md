# Business Switching & Multi-Tenant Context

**Technical Documentation:** [../System/business-switching.md](../System/business-switching.md)

## User Need & Purpose

Super admins need to efficiently switch between multiple client businesses to manage leads, review metrics, and provide support. The system must maintain clear context about which business data is being displayed at all times.

## Business Context

### Target Users
- **Super Admins**: Manage multiple roofing business clients
- **Platform Support Staff**: Troubleshoot issues across businesses

### Business Value
- Enables one admin to manage multiple clients efficiently
- Reduces need for multiple accounts or separate logins
- Maintains data isolation between businesses
- Provides clear visual indication of current business context

## User Workflows

### Switching Between Businesses
1. Super admin clicks business logo/switcher in header
2. Dropdown displays all accessible businesses with logos and names
3. User selects target business
4. URL updates from `/1234/old-permalink/section` to `/5678/new-permalink/section`
5. Page content updates to show selected business data
6. Business context persists across navigation

### Context-Aware Navigation
- When switching from lead-specific pages (Lead Details, Actions, Property Details), system redirects to New Leads section
- When switching from general pages (Dashboard, Bookings), system maintains the same section
- URL always reflects current business via business_id and permalink

### Visual Context Indicators
- Business logo displayed in header
- Business name shown in navigation
- URL contains business identifier
- All data clearly scoped to selected business

## Feature Requirements

### Business Selection
- Super admins see all businesses with `dashboard=true`
- Regular users see only their assigned businesses
- Business list sorted alphabetically by company name
- Each business shows logo, name, city, and state

### URL Structure
- Format: `/{business_id}/{permalink}/{section}`
- Example: `/1234/hard-roof/dashboard`
- Business ID enables fast database lookups
- Permalink provides human-readable context

### State Management
- Selected business stored in database (`profiles.business_id`)
- Business context persists across sessions
- Page refreshes maintain current business
- URL changes trigger business context updates

### Data Isolation
- All API requests include business_id filter
- Database queries validate business access
- Cross-business data leaks prevented
- User sees only authorized business data

## Edge Cases

### Invalid Business Access
- User attempts to access unauthorized business via URL
- System validates access permissions
- Redirects to user's first accessible business
- Shows error message if no businesses accessible

### Business Switch During Form Entry
- User is entering data when business switch occurs
- Unsaved changes are lost (expected behavior)
- User sees new business data immediately
- No cross-business data contamination

### Concurrent Business Switches
- User rapidly clicks different businesses
- System prevents race conditions with operation mutex
- Only final selection takes effect
- Database updates occur atomically

### Permalink Conflicts
- Two businesses might have similar permalinks
- Business ID provides unique identification
- System can handle duplicate permalinks
- URL always includes both ID and permalink

### Business Deletion/Deactivation
- Business is deactivated while user is viewing it
- System detects invalid business_id
- Redirects to user's next accessible business
- Clear error message shown

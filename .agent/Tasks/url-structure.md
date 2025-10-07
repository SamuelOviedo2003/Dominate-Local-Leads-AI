# URL Structure - Permalink-Based Routing with Business ID

**Technical Documentation:** [../System/url-structure.md](../System/url-structure.md)

## User Need & Purpose

Users need intuitive, bookmarkable URLs that clearly indicate which business they're viewing. The URL structure must support multi-tenant operations while remaining human-readable and SEO-friendly.

## Business Context

### Target Users
- **All Users**: Navigate platform with clear URL context
- **Super Admins**: Switch businesses with URL updates
- **Business Owners**: Share URLs with team members

### Business Value
- Clear business context in every URL
- Bookmarkable pages maintain context
- Direct links to specific business sections
- Fast database lookups via business_id
- Human-readable permalinks for usability

## URL Pattern

### Structure
```
/{business_id}/{permalink}/{section}/[optional-params]
```

### Examples
- Dashboard: `/1234/hard-roof/dashboard`
- New Leads: `/5678/roofing-pros/new-leads`
- Lead Details: `/1234/hard-roof/lead-details/789`
- Actions: `/1234/hard-roof/actions/789`
- Bookings: `/5678/roofing-pros/bookings`

## User Workflows

### Direct Navigation
1. User types or clicks URL with business context
2. System extracts business_id and permalink
3. Validates user has access to business
4. Displays requested section for that business
5. URL remains stable during page interaction

### Business Switching via URL
1. Super admin receives URL to different business
2. Clicks link or pastes in browser
3. System detects business change
4. Updates context and displays new business data
5. User's business_id preference updated in database

### Sharing URLs
1. User copies URL from browser
2. Shares with team member
3. Recipient clicks link
4. System validates their access
5. If authorized, shows same view
6. If not, redirects to their first accessible business

### Bookmark Usage
1. User bookmarks specific section URL
2. Returns days later and clicks bookmark
3. System restores exact business and section
4. No need to reselect business
5. Seamless return to work

## Feature Requirements

### URL Components
- **business_id**: Numeric identifier for fast lookup
- **permalink**: Human-readable business identifier
- **section**: Dashboard, new-leads, bookings, incoming-calls, etc.
- **params**: Optional lead_id or other identifiers

### Business Resolution
- Primary lookup by business_id (fast integer index)
- Permalink provides context and readability
- Both must match same business for validation
- Mismatched permalink/ID returns 404

### Access Control
- Every URL request validates business access
- Super Admins can access any business_id
- Regular users restricted to assigned businesses
- Unauthorized access redirects to accessible business

### URL Synchronization
- Business switching updates URL immediately
- Browser history tracks business changes
- Back/forward buttons respect business context
- Refresh maintains current URL state

### SEO Considerations
- Human-readable permalinks in URL
- Descriptive section names
- Consistent URL structure across platform
- No arbitrary session tokens in URLs

## Edge Cases

### Mismatched business_id and permalink
- URL has business_id=1234 but permalink for business 5678
- System validates both against database
- Returns 404 if mismatch detected
- Prevents confusion and data errors

### Invalid business_id
- User enters non-existent business_id
- System queries database, finds nothing
- Returns 404 page
- Suggests returning to dashboard

### Unauthorized Business Access
- Regular user tries URL for unassigned business
- System validates access permissions
- Redirects to user's first accessible business
- Shows "Access denied" message

### Missing Permalink
- Old URL format without permalink (migration scenario)
- System looks up business_id
- Redirects to proper format with permalink
- Preserves section and parameters

### Business Permalink Change
- Business owner changes permalink
- Old bookmarks still use old permalink
- business_id lookup still works
- Optional: redirect to new permalink

### URL Tampering
- User manually changes business_id in URL
- System validates access on every request
- Unauthorized changes blocked
- No data leakage across businesses

### Deleted Business
- URL references deleted or deactivated business
- Database query returns no results
- User sees 404 or "Business not found"
- Redirected to their accessible businesses

### Special Characters in Permalink
- Permalink contains spaces or special chars
- URL encoding handles properly
- Database lookup works correctly
- Display decodes for readability

### Very Long Permalinks
- Business has lengthy permalink
- URL remains functional
- Browser handles long URLs
- No truncation or errors

### Deep Linking
- External link directly to lead details
- User not logged in
- System saves intended URL
- Redirects to login
- After login, returns to original URL

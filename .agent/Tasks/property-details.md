# Property Details - Property Information Display

**Technical Documentation:** [../System/property-details.md](../System/property-details.md)

## User Need & Purpose

Sales teams need to understand property characteristics when engaging with leads. Property details provide context about the home's value, location, and condition to inform sales conversations and estimate project scope.

## Business Context

### Target Users
- **Sales Teams**: Assess property fit for roofing services
- **Estimators**: Prepare preliminary quotes
- **Appointment Setters**: Qualify leads based on property value

### Business Value
- Property context improves sales conversations
- Home value indicates lead quality and potential
- Location details help route field appointments
- Visual reference aids property identification

## User Workflows

### Viewing Property Information
1. User navigates to Property Details page from lead
2. System displays property characteristics
3. User reviews home value, location, and features
4. Property image provides visual reference

### Assessing Lead Quality
1. User checks home value for project viability
2. Reviews distance from business location
3. Considers drive time for in-person appointments
4. Evaluates roof age for replacement urgency

### Planning Site Visits
1. User views full address
2. Checks distance and duration to property
3. Plans efficient route for appointments
4. Uses address for GPS navigation

### Accessing Property Resources
- Clicks property image to view full size
- Reviews property URL if available
- Examines roof age for replacement timing
- Considers all factors for sales strategy

## Feature Requirements

### Property Information Display
- Home value (formatted currency)
- Full street address
- Distance from business (meters/miles)
- Drive duration to property
- Roof age (if available)
- Property image or fallback

### Visual Layout
- Property image prominently displayed
- Information organized in logical sections
- Consistent with other detail pages
- Responsive design for all devices

### Integrated Lead Context
- Lead information at top of page
- Communications history in left column
- Property details in right column
- Call Now button for quick contact

### Data Formatting
- Currency formatting for home value
- Distance in appropriate units
- Duration in minutes/hours
- Conditional display for optional fields

## Edge Cases

### Missing Property Image
- Falls back to placeholder image (/images/noIMAGE.png)
- No broken image links
- Layout remains intact
- User still sees other property details

### No Property Data
- Shows "Property information not available" message
- Explains data may be pending
- Other page sections still functional
- User can still contact lead

### Missing Optional Fields
- Roof age: Only shows if not null
- Property URL: Hidden if not available
- Conditional rendering for optional data
- No empty fields displayed

### Invalid Home Value
- Handles $0 or null values gracefully
- Shows "Value not available" instead of $0
- No misleading information
- Data validation on display

### Extremely Long Address
- Address text wraps properly
- No overflow beyond container
- Maintains readability
- Responsive on mobile devices

### Distance Calculation Errors
- Distance is null or invalid
- Shows "Distance not available"
- Duration also handles null case
- No mathematical errors displayed

### Property Data Mismatch
- Property belongs to different account_id
- System validates relationship
- Prevents unauthorized property access
- Clear error if mismatch detected

### Stale Property Data
- Property information updated externally
- Page shows data from last refresh
- User can refresh to get latest
- No real-time updates needed for static data

### Image Loading Failures
- Property image URL returns 404
- Fallback image displayed automatically
- No broken image icon shown
- Seamless user experience

### Large Property Values
- Handles homes worth $1M+ correctly
- Currency formatting with proper commas
- No number truncation
- Full value displayed clearly

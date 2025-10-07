# New Leads - Lead Management & Tracking

**Technical Documentation:** [../System/new-leads.md](../System/new-leads.md)

## User Need & Purpose

Sales teams need to efficiently manage incoming leads, track contact attempts, and prioritize follow-ups. The system provides a comprehensive view of all leads requiring attention, organized by urgency and status.

## Business Context

### Target Users
- **Appointment Setters**: Make initial contact with leads
- **Sales Teams**: Follow up on contacted leads
- **Business Owners**: Monitor lead conversion pipeline

### Business Value
- Prioritized lead lists reduce missed opportunities
- Clear next steps for each lead
- Performance metrics guide team management
- Efficient lead routing and assignment

## User Workflows

### Viewing Lead Metrics
1. User navigates to New Leads section
2. Sees four key metrics at top: Total Leads, Contacts, Booked, Booking Rate
3. Metrics provide quick performance overview
4. Time period filter allows historical analysis

### Managing "Call Now" Leads
1. User views "Call now" table showing urgent leads
2. Table displays leads where stage=1 AND call_now_status IN (1,2)
3. User clicks lead row to view full details
4. After handling, lead moves to appropriate list

### Following Up on Leads
1. User scrolls to "Follow Up" table
2. Sees leads where stage=2
3. Reviews communication history and next steps
4. Takes appropriate follow-up action

### Handling "Waiting to Call" Leads
1. User views "Waiting to call" table at bottom
2. Shows leads where stage=1 AND call_now_status=3
3. Leads waiting for optimal calling window
4. User prepares for upcoming call opportunities

### Filtering by Time Period
1. User selects time period (7, 15, 30, 60, 90 days)
2. Metrics and tables update to show filtered data
3. Default is 30 days for typical sales cycle
4. User analyzes trends across different periods

## Feature Requirements

### Lead Metrics
- **Leads**: Total count of leads in period
- **Contacts**: Number of leads contacted
- **Booked**: Number of leads with appointments scheduled
- **Booking Rate**: Percentage of contacted leads that booked

### Three-Table Structure
- **Table 1 - "Call now"**: Urgent leads requiring immediate attention
- **Table 2 - "Follow Up"**: Leads in follow-up stage
- **Table 3 - "Waiting to call"**: Leads waiting for call window

### Conditional Table Display
- Tables with zero leads are hidden
- Reduces visual clutter
- Improves focus on actionable items
- Dynamic layout based on data

### Lead Table Columns
- **Lead Name**: Displays name with calls count circle and working hours indicator
- **Source**: Platform origin (Google Ads, Facebook, etc.)
- **Date**: Creation timestamp in "Tue Sep 16, 6:05PM" format
- **Next Step**: Recommended action for lead

### Calls Count Display
- Gray circle with white number
- Shows total call attempts
- Working hours indicator (sun/moon icon):
  - Sun (☀️) for working hours = true/null (yellow tint)
  - Moon (🌙) for working hours = false (blue tint)

### Urgency Indicators
- **how_soon** field displayed as colored tag:
  - Red: ASAP, immediately, urgent
  - Orange: week, 7 days, soon
  - Blue: month, 30 days
  - Gray: default/other

### Interactive Lead Access
- Click any lead row to view full details
- Navigate to Lead Details page
- Access communications, call windows, and actions
- Return to New Leads maintains context

## Edge Cases

### No Leads in Period
- All three tables empty
- Shows "No leads found" message
- Encourages user to adjust time period
- Metrics show zeros

### All Leads in Single Category
- Only "Call now" table visible, others hidden
- Layout adjusts dynamically
- No empty table clutter
- Clear focus on available leads

### Lead Status Changes
- Lead moves from "Call now" to "Follow Up" after contact
- Tables update in real-time (on refresh)
- Lead appears in correct table
- No duplicate entries

### Missing Communication Data
- Lead has no calls_count data
- Shows "0" in circle
- Working hours indicator still displays
- No UI breakage

### Time Zone Handling
- Lead created_at displayed in business timezone
- Consistent time display across users
- No UTC confusion
- Proper date formatting

### Rapid Business Switching
- User switches to different business
- Leads table clears and reloads
- No cross-business data leakage
- Smooth transition with loading states

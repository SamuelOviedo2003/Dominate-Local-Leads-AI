# Incoming Calls - Call Analytics Dashboard

**Technical Documentation:** [../System/incoming-calls.md](../System/incoming-calls.md)

## User Need & Purpose

Business owners and managers need visibility into incoming call patterns to understand lead sources, caller types, and team assignment effectiveness. The analytics dashboard provides actionable insights for optimizing call handling and lead response.

## Business Context

### Target Users
- **Business Owners**: Monitor call volume and quality
- **Marketing Managers**: Track which sources generate calls
- **Operations Managers**: Optimize team assignments

### Business Value
- Source attribution shows which marketing channels drive calls
- Caller type analysis identifies qualified vs unqualified calls
- Team assignment tracking shows workload distribution
- Time-based filtering reveals trends and patterns

## User Workflows

### Viewing Call Analytics
1. User navigates to Incoming Calls section
2. System displays source distribution bar chart
3. Caller type distribution shown in second chart
4. Recent calls table shows latest activity
5. Default view shows last 30 days

### Analyzing Source Performance
1. User hovers over source distribution bar
2. Popup appears showing caller types for that source
3. User sees breakdown (Client, Sales person, Other, Job seeker)
4. Popup disappears when hover ends
5. User compares multiple sources via hovering

### Filtering by Time Period
1. User clicks time period selector (7, 15, 30, 60, 90 days)
2. All charts and tables update for selected period
3. User identifies seasonal trends
4. Compares performance across timeframes

### Reviewing Recent Calls
1. User scrolls to recent calls table
2. Sees date/time, source, caller type, duration, assigned person
3. Clicks call row to open detailed popup
4. Reviews call summary and recording
5. Updates caller type if needed

### Managing Caller Types
1. User clicks call in recent calls table
2. Popup opens with call details and audio player
3. User selects correct caller type from dropdown
4. Auto-save updates database immediately
5. Table reflects updated caller type

## Feature Requirements

### Source Distribution Chart
- Bar chart showing calls by source
- Sources ordered by volume (highest first)
- Excludes "Unknown" values
- Interactive hover for drill-down

### Caller Type Distribution Chart
- Bar chart showing calls by type
- Types: Client, Sales person, Other, Looking for job
- Excludes "Unknown" entries
- Clear visual distinction between types

### Interactive Hover System
- Hover on source bar shows caller type popup
- Popup positioned near hovered element
- Loading state while fetching source-specific data
- Smooth fade-in/slide-up animation
- Popup auto-closes when hover ends

### Recent Calls Table
- Columns: Date & Time, Source, Caller Type, Duration, Assigned
- Last 20 calls displayed
- Assigned person shown with badge (blue=assigned, gray=unassigned)
- Clickable rows open detail popup
- Sorted by most recent first

### Call Detail Popup
- Opens when clicking table row
- Displays call date/time, summary, caller type
- Integrated audio player with controls
- Caller type dropdown with auto-save
- Close via ESC, backdrop click, or X button
- Modal overlay with backdrop blur

### Audio Player
- Play/pause button with loading state
- Progress bar with seek functionality
- Current time and total duration display
- Automatic resource cleanup on close
- Fallback message if no recording available

### Caller Type Management
- Dropdown with predefined options
- Current value pre-selected
- Optimistic UI updates
- Loading spinner during save
- Error handling without UI break

## Edge Cases

### No Calls in Period
- Charts show "No data available" message
- Table shows empty state
- Time period filter still functional
- User can adjust filter to find data

### All Calls from Single Source
- Source chart shows single bar
- Hover popup still functional
- Caller type distribution unaffected
- No visualization errors

### Missing Caller Type Data
- Calls with null caller_type excluded from charts
- Table shows "Unknown" for null values
- User can update via popup
- No broken visualizations

### Unassigned Calls
- assigned_id is null
- Table shows "Unassigned" with gray badge
- No errors or empty cells
- Clear indication of unassigned status

### Missing Call Recording
- recording_url is null
- Audio player shows "No recording available"
- Other popup functionality intact
- No playback errors

### Very Long Call Durations
- Duration properly formatted (hours:minutes:seconds)
- No truncation or overflow
- Readable in table cell
- Audio player handles long files

### Rapid Caller Type Changes
- User quickly changes caller type multiple times
- Auto-save queues operations
- Final selection persists
- No duplicate save attempts

### Popup Scroll Behavior
- Call summary is very long
- Popup content scrolls internally
- Header and audio player remain visible
- Proper scrollbar styling

### Network Errors During Save
- Caller type update fails
- Error message shown
- Dropdown reverts to previous value
- User can retry

### Hover Popup Edge Clipping
- Popup positioned near screen edge
- Intelligent positioning prevents clipping
- Popup visible in all scenarios
- Smooth repositioning if needed

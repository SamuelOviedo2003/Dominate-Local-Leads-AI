# Lead Details - Comprehensive Lead Information

**Technical Documentation:** [../System/lead-details.md](../System/lead-details.md)

## User Need & Purpose

Sales teams need complete visibility into individual leads including contact information, property details, call windows, and communication history to effectively nurture leads toward booking appointments.

## Business Context

### Target Users
- **Appointment Setters**: Contact leads and schedule appointments
- **Sales Teams**: Follow up and close deals
- **Business Owners**: Review lead quality and team performance

### Business Value
- Complete lead context in single view
- Efficient call planning with call windows
- Communication history prevents duplicated efforts
- Direct dial integration accelerates outreach

## User Workflows

### Viewing Lead Information
1. User clicks lead from New Leads table
2. System displays comprehensive lead details page
3. User reviews contact information and source
4. Property details and value shown for context

### Planning Call Timing
1. User scrolls to Call Windows section
2. Reviews available call windows with time ranges
3. Sees which calls have been completed (status tags)
4. 30-minute countdown timer shows urgency for active windows
5. Plans optimal call timing based on window schedule

### Calling the Lead
1. User clicks "Call Now" button in header
2. Dialpad integration launches with pre-populated lead phone
3. Call includes tracking via lead_id in URL
4. Business dialpad_phone number used as caller ID

### Reviewing Communications
1. User examines communications history
2. Sees all previous calls, texts, emails, and voicemails
3. Plays audio recordings of past calls
4. Reviews summaries and message content

### Sending Messages via Chat
1. User types message in chat interface at bottom
2. Clicks send or presses Enter
3. Message sent via n8n automation webhook
4. Message appears in communications history

### Managing Lead Stage
1. User clicks stage dropdown in header
2. Selects new stage (Contact, Follow up, Booked, etc.)
3. Confirms stage change in dialog
4. Webhook updates lead stage in system

## Feature Requirements

### Lead Information Display
- Full name, email, phone number
- Lead source with visual icon (Google, Facebook, Website, Referral)
- Created date in readable format
- Service requested and urgency (how_soon tag)
- Roof age if available

### Call Windows System
- Display all active call windows (active=true)
- Time ranges in format "5:34 PM - 6:04 PM"
- Status tags with color coding:
  - Green: Done on time
  - Orange: Done late
  - Yellow: Due
  - Red: Missed
- Call number labels ("Call 1", "Call 2", etc.)
- Working hours indicator (green=working, orange=after hours)
- "Called at" timestamp for completed calls (Call 1 only, working hours)
- 30-minute countdown timer for active Call 1 window

### Communications History
- All communications in chronological order
- Message type badges (Call, SMS, Email, Voicemail) with color coding
- Audio player for call recordings with progress bar
- Play/pause controls and seeking functionality
- Message summaries and content display
- Vertical expansion (no internal scrolling)

### Dialpad Integration
- "Call Now" button in page header
- Opens Dialpad with lead phone pre-populated
- Includes business dialpad_phone as caller ID
- Tracking via lead_id in custom data parameter
- Validates phone number before showing button

### Chat Interface
- Text input area for new messages
- Send button with loading states
- Webhook integration to n8n platform
- Includes account_id, lead_id, message, business_id
- Keyboard shortcut support (Enter to send)

### Lead Stage Management
- Dropdown in page header
- Options: Contact, Follow up, Booked, Not interested, Email campaign
- Confirmation dialog before stage change
- Webhook POST to n8n for stage updates
- Loading states during API calls
- Error handling with user-friendly messages

## Edge Cases

### Missing Property Information
- No house_url available
- Falls back to placeholder image
- Other property fields still display
- No broken image links

### No Call Windows
- Call windows section shows "No call windows scheduled"
- Page layout remains intact
- Other sections function normally

### Empty Communications History
- Shows "No communications yet" message
- Chat interface still available
- User can initiate first contact

### Invalid Phone Number
- Call Now button hidden
- User sees contact info but can't quick-dial
- Other features remain functional

### Missing Dialpad Configuration
- dialpad_phone is null in business settings
- Call Now button hidden
- Error logged for admin attention

### Chat Webhook Failure
- Error message shown to user
- Message not lost (can retry)
- Communications history unaffected

### Stage Change Webhook Failure
- Error message displayed
- Stage dropdown reverts to original
- User can retry operation

### Countdown Timer Edge Cases
- Timer reaches zero: automatically hides
- User views page after window expires: no timer shown
- Multiple active windows: only Call 1 shows timer
- Outside call window time range: no timer displayed

# Settings - Profile Management

**Technical Documentation:** [../System/settings.md](../System/settings.md)

## User Need & Purpose

Users need to manage their account information, update personal details, and configure preferences. The Settings page provides a centralized interface for profile management separate from business operations.

## Business Context

### Target Users
- **All Users**: Manage personal account information
- **Business Owners**: Update contact details
- **Team Members**: Maintain current information

### Business Value
- Self-service profile management reduces admin overhead
- Current contact information improves communication
- User preferences enhance personalization
- Consistent user data across platform

## User Workflows

### Accessing Settings
1. User clicks profile dropdown in header
2. Selects "Settings" option
3. Navigates to settings page (unique layout without header)
4. Views current profile information

### Updating Profile Information
1. User reviews current name, email, phone
2. Clicks edit button next to field
3. Modifies information in input field
4. Saves changes
5. System validates and updates database

### Changing Password
1. User clicks "Change Password" button
2. Enters current password for verification
3. Enters new password twice for confirmation
4. Submits password change
5. System validates and updates credentials

### Reviewing Business Assignments
1. User views list of assigned businesses (if applicable)
2. Sees business names and access level
3. Cannot modify assignments (admin-controlled)
4. Contact admin for access changes

### Returning to Dashboard
1. User clicks "Back to Dashboard" link
2. Returns to their active business dashboard
3. Settings changes take effect immediately
4. Header reappears in normal pages

## Feature Requirements

### Profile Information Display
- Full name (editable)
- Email address (editable)
- Phone number (optional, editable)
- Account creation date (read-only)
- Last login timestamp (read-only)

### Unique Layout
- No UniversalHeader displayed
- Dedicated settings navigation
- Clean, focused interface
- Return to dashboard link prominent

### Profile Editing
- Inline editing for each field
- Save/cancel buttons per field
- Input validation before save
- Success confirmation after update

### Password Management
- Secure password change form
- Current password verification
- New password strength requirements
- Confirmation password matching

### Business Access Display
- List of assigned businesses (read-only)
- Business name and role for each
- Clear indication this is admin-managed
- No user modification allowed

### Data Validation
- Email format verification
- Phone number format checking
- Name length requirements
- Password complexity rules

## Edge Cases

### Invalid Email Format
- User enters malformed email
- System shows validation error
- Save button disabled until fixed
- Clear error message displayed

### Password Mismatch
- New password and confirmation don't match
- Error shown before submission
- User corrects mismatch
- Form only submits when matching

### Weak Password
- User enters password below requirements
- Real-time strength indicator
- Requirements list shown
- Save disabled until requirements met

### Concurrent Profile Updates
- User opens settings in two tabs
- Makes different changes in each
- Last save wins (eventual consistency)
- Refresh shows final state

### Missing Optional Fields
- User clears phone number
- System accepts null value
- Field saved as empty
- No validation errors

### Super Admin Settings
- Super admin views settings
- Sees all accessible businesses (many)
- Same functionality as regular users
- No special admin controls in settings

### Network Error During Save
- Save operation fails
- Error message displayed
- Changes not persisted
- User can retry save

### Session Expiry in Settings
- User stays in settings past session timeout
- Save attempt triggers re-authentication
- User redirected to login
- Can return to settings after login

### Navigation During Edit
- User clicks away while editing
- Unsaved changes warning appears
- User can save, discard, or cancel navigation
- No data loss without warning

### Business Access Empty
- User has no business assignments
- Settings still accessible
- Empty state message shown
- Contact admin for access

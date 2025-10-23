# Timezone Debug Tool Documentation

## Overview

This document describes the timezone debugging tools available in the application to help identify and verify what timezone is being used to render time-based labels such as "RECEIVED" timestamps, call window times, and communication history.

## Features

### 1. **Debug Logging** (`src/lib/utils/timezoneDebug.ts`)

Comprehensive timezone debugging utilities that provide:

- **Current timezone information**: Name, abbreviation, UTC offset, DST status
- **Real-time clock**: Shows current time in the specified timezone
- **Format examples**: Demonstrates how timestamps are formatted
- **Timezone comparison**: Compare two timezones to show differences
- **Validation**: Check if a timezone string is valid

#### Key Functions

##### `getTimezoneDebugInfo(timezone, location?)`
Returns comprehensive timezone information for debugging.

```typescript
const info = getTimezoneDebugInfo('America/New_York', 'LeadInformation')
// Returns:
// {
//   timezone: 'America/New_York',
//   currentTime: 'Oct 22, 2025, 2:38:45 PM EDT',
//   offset: 'UTC-4.0',
//   abbreviation: 'EDT',
//   isDST: true,
//   location: 'LeadInformation',
//   formattedExample: 'Wed, Oct 22, 2:38 PM'
// }
```

##### `logTimezoneOperation(operation, timezone, timestamp, formattedResult)`
Logs timezone information for a specific rendering operation.

```typescript
logTimezoneOperation(
  'Lead Received Timestamp',
  'America/New_York',
  '2025-10-22T18:38:00Z',
  'Wed, Oct 22, 2:38 PM'
)
```

##### `compareTimezones(timezone1, timezone2, sampleDate?)`
Compare two timezones to identify differences.

```typescript
const comparison = compareTimezones('America/New_York', 'America/Los_Angeles')
// Shows 3-hour difference and detailed info for both timezones
```

##### `getTimezoneAbbreviation(timezone)`
Get short timezone abbreviation (e.g., 'EST', 'PST', 'CST').

```typescript
getTimezoneAbbreviation('America/New_York') // Returns 'EDT' or 'EST' depending on DST
```

### 2. **Visual Timezone Indicator** (`src/components/TimezoneIndicator.tsx`)

React components that display the active timezone in the UI.

#### `<TimezoneIndicator />`
Full-featured timezone indicator with hover tooltip.

**Props:**
- `timezone?: string` - IANA timezone identifier (default: 'UTC')
- `showDetails?: boolean` - Show detailed info on hover (default: true)
- `compact?: boolean` - Use compact layout (default: false)
- `className?: string` - Additional CSS classes

**Features:**
- Real-time clock showing current time in timezone
- Timezone abbreviation display
- Hover tooltip with detailed information:
  - Full timezone name
  - UTC offset
  - DST status
  - Current time
  - Format example

**Usage:**
```tsx
<TimezoneIndicator
  timezone="America/New_York"
  showDetails={true}
/>
```

#### `<TimezoneBadge />`
Compact timezone badge for headers and tight spaces.

**Props:**
- `timezone?: string` - IANA timezone identifier (default: 'UTC')
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
<TimezoneBadge timezone="America/Chicago" />
```

### 3. **Enhanced Date Format Logging** (`src/lib/utils/dateFormat.ts`)

All date formatting functions include debug logging that shows:
- Input timestamp (ISO 8601)
- Output formatted string
- Timezone used for formatting
- Detailed timezone context (via `logTimezoneOperation`)

## Implementation

### Where Timezone Indicators Are Displayed

1. **LeadInformation Component** ([src/components/features/leads/LeadInformation.tsx](../src/components/features/leads/LeadInformation.tsx))
   - Shows timezone badge next to "RECEIVED" timestamp
   - Visible on both desktop and mobile layouts
   - Lines 217-222 (desktop) and 253-258 (mobile)

### Existing Debug Logs

The following date formatting functions already include timezone debug logging:

1. **`formatReceivedTimestamp()`** - Lead received timestamps
2. **`formatCommunicationTimestamp()`** - Communication history timestamps
3. **`formatTableTimestamp()`** - Table display timestamps
4. **`formatTimeOnly()`** - Time-only displays (call windows)
5. **`formatCallWindowTime()`** - Call window time ranges

## How to Use

### Enable Debug Mode

Set the environment variable in your `.env.local`:

```bash
NEXT_PUBLIC_DEBUG_MODE=true
```

Or run in development mode (debug logs enabled by default).

### View Debug Logs in Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs prefixed with `[DEBUG]` or `[TIMEZONE]`

Example log output:
```
[DEBUG] formatReceivedTimestamp called {
  dateString: '2025-10-22T18:38:00Z',
  timezone: 'America/New_York'
}

[TIMEZONE] Lead Received Timestamp {
  timezone: 'America/New_York',
  input: '2025-10-22T18:38:00Z',
  output: 'Wed, Oct 22, 2:38 PM',
  debugInfo: { ... }
}
```

### Visual Indicators

Look for the timezone badge in the UI:
- **Location**: Next to "RECEIVED" timestamp in Lead Information
- **Appearance**: Small gray badge with clock icon and timezone abbreviation
- **Hover**: Shows detailed timezone information

## Troubleshooting

### Timezone Not Showing Correctly

1. **Check Browser Console**: Look for `[TIMEZONE]` logs to see what timezone is being used
2. **Verify Business Timezone**: Check that `businessTimezone` prop is passed correctly
3. **Check API Response**: Verify the `/api/leads/[leadId]` endpoint returns `businessTimezone`
4. **Validate Timezone String**: Use `isValidTimezone()` to check if timezone is valid

### Debug Info Not Appearing

1. **Enable Debug Mode**: Set `NEXT_PUBLIC_DEBUG_MODE=true` in `.env.local`
2. **Restart Dev Server**: After changing environment variables
3. **Clear Browser Cache**: Force refresh (Cmd+Shift+R or Ctrl+Shift+R)
4. **Check Console Filters**: Ensure console shows all log levels

### Timezone Indicator Not Visible

1. **Check Component Import**: Verify `TimezoneBadge` is imported correctly
2. **Check Props**: Ensure `businessTimezone` prop is passed to component
3. **Inspect Element**: Use DevTools to check if component is rendered but hidden by CSS
4. **Check Responsive Layout**: Some indicators are hidden on mobile (`.hidden.sm:flex`)

## API Reference

### Timezone Debug Functions

```typescript
// Get comprehensive timezone info
function getTimezoneDebugInfo(
  timezone?: string,
  location?: string
): TimezoneDebugInfo

// Log timezone operation
function logTimezoneOperation(
  operation: string,
  timezone: string,
  timestamp: string,
  formattedResult: string
): void

// Compare two timezones
function compareTimezones(
  timezone1: string,
  timezone2: string,
  sampleDate?: Date
): ComparisonResult

// Get friendly name
function getTimezoneFriendlyName(timezone: string): string

// Get abbreviation
function getTimezoneAbbreviation(timezone: string): string

// Validate timezone
function isValidTimezone(timezone: string): boolean
```

### React Components

```typescript
// Full indicator with tooltip
<TimezoneIndicator
  timezone?: string        // Default: 'UTC'
  showDetails?: boolean    // Default: true
  compact?: boolean        // Default: false
  className?: string
/>

// Compact badge
<TimezoneBadge
  timezone?: string        // Default: 'UTC'
  className?: string
/>
```

## Examples

### Example 1: Debug Timezone in Component

```tsx
import { getTimezoneDebugInfo } from '@/lib/utils/timezoneDebug'

function MyComponent({ businessTimezone }) {
  useEffect(() => {
    const info = getTimezoneDebugInfo(businessTimezone, 'MyComponent')
    console.log('Timezone Info:', info)
  }, [businessTimezone])

  return <div>...</div>
}
```

### Example 2: Add Timezone Indicator

```tsx
import { TimezoneBadge } from '@/components/TimezoneIndicator'

function MyComponent({ timestamp, timezone }) {
  return (
    <div className="flex items-center gap-2">
      <span>Received: {formatTimestamp(timestamp, timezone)}</span>
      <TimezoneBadge timezone={timezone} />
    </div>
  )
}
```

### Example 3: Compare Timezones

```typescript
import { compareTimezones } from '@/lib/utils/timezoneDebug'

// Compare user's timezone with business timezone
const comparison = compareTimezones(
  Intl.DateTimeFormat().resolvedOptions().timeZone, // User timezone
  'America/New_York' // Business timezone
)

console.log(`Time difference: ${comparison.timeDifferenceMinutes} minutes`)
```

## Best Practices

1. **Always pass timezone prop**: Never rely on default 'UTC' timezone
2. **Use debug mode in development**: Enable `NEXT_PUBLIC_DEBUG_MODE=true`
3. **Check console logs**: Look for `[TIMEZONE]` logs when debugging time issues
4. **Add timezone indicators**: Use `<TimezoneBadge />` next to important timestamps
5. **Log timezone operations**: Use `logTimezoneOperation()` in custom date formatting
6. **Validate timezone strings**: Use `isValidTimezone()` before using timezone values

## Related Files

- [`src/lib/utils/timezoneDebug.ts`](../src/lib/utils/timezoneDebug.ts) - Debug utilities
- [`src/lib/utils/dateFormat.ts`](../src/lib/utils/dateFormat.ts) - Date formatting functions
- [`src/components/TimezoneIndicator.tsx`](../src/components/TimezoneIndicator.tsx) - Visual components
- [`src/lib/logging.ts`](../src/lib/logging.ts) - Logging service
- [`src/components/features/leads/LeadInformation.tsx`](../src/components/features/leads/LeadInformation.tsx) - Implementation example

## Support

For issues or questions about timezone debugging:
1. Check browser console for debug logs
2. Review this documentation
3. Check implementation in LeadInformation component
4. Verify timezone prop is being passed correctly

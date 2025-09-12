/**
 * Demo and testing for date formatting utilities
 * Use this in browser console to test formatting
 */

import { formatCallWindowTime, formatCalledOutTime, shouldIncludeYear } from './dateFormat'

export const runDateFormatDemo = () => {
  const testDate = '2025-09-01T17:34:12.635+00:00'
  const testDateDifferentYear = '2024-09-01T17:34:12.635+00:00'
  
  // Date Format Demo Results
  
  // Test different timezones
  // Timezone Tests
  // UTC timezone test
  // EST timezone test
  // PST timezone test
  // CST timezone test
  
  // Test options
  // Formatting Options
  // With Year option test
  // 24-hour format test
  
  // Test called out formatting
  // Called Out Tests
  // Called Out UTC test
  // Called Out EST test
  
  // Test year detection
  // Year Detection
  // Should include year test
  // Should include current year test
  
  // Test error handling
  // Error Handling
  // Invalid date test
  // Empty string test
  
  // End demo results
  
  return {
    utc: formatCallWindowTime(testDate, 'UTC'),
    est: formatCallWindowTime(testDate, 'America/New_York'),
    pst: formatCallWindowTime(testDate, 'America/Los_Angeles'),
    withYear: formatCallWindowTime(testDateDifferentYear, 'UTC', { includeYear: true }),
    calledOut: formatCalledOutTime(testDate, 'America/New_York')
  }
}

// Export for manual testing in browser console
if (typeof window !== 'undefined') {
  (window as any).runDateFormatDemo = runDateFormatDemo
  // Date format demo available
}
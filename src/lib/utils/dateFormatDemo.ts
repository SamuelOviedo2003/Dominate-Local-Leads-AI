/**
 * Demo and testing for date formatting utilities
 * Use this in browser console to test formatting
 */

import { formatCallWindowTime, formatCalledOutTime, shouldIncludeYear } from './dateFormat'

export const runDateFormatDemo = () => {
  const testDate = '2025-09-01T17:34:12.635+00:00'
  const testDateDifferentYear = '2024-09-01T17:34:12.635+00:00'
  
  console.group('📅 Date Format Demo Results:')
  
  // Test different timezones
  console.log('🌍 Timezone Tests:')
  console.log('UTC:', formatCallWindowTime(testDate, 'UTC'))
  console.log('EST:', formatCallWindowTime(testDate, 'America/New_York'))
  console.log('PST:', formatCallWindowTime(testDate, 'America/Los_Angeles'))
  console.log('CST:', formatCallWindowTime(testDate, 'America/Chicago'))
  
  // Test options
  console.log('\n⚙️ Formatting Options:')
  console.log('With Year:', formatCallWindowTime(testDateDifferentYear, 'UTC', { includeYear: true }))
  console.log('24-hour format:', formatCallWindowTime(testDate, 'UTC', { use24Hour: true }))
  
  // Test called out formatting
  console.log('\n📞 Called Out Tests:')
  console.log('Called Out UTC:', formatCalledOutTime(testDate, 'UTC'))
  console.log('Called Out EST:', formatCalledOutTime(testDate, 'America/New_York'))
  
  // Test year detection
  console.log('\n📆 Year Detection:')
  console.log('Should include year (2024):', shouldIncludeYear(testDateDifferentYear))
  console.log('Should include year (current):', shouldIncludeYear(testDate))
  
  // Test error handling
  console.log('\n⚠️ Error Handling:')
  console.log('Invalid date:', formatCallWindowTime('invalid-date', 'UTC'))
  console.log('Empty string:', formatCallWindowTime('', 'UTC'))
  
  console.groupEnd()
  
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
  console.log('🚀 Date format demo available. Run: runDateFormatDemo()')
}
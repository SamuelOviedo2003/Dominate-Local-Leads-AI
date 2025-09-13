/**
 * Session Isolation Testing Script
 * Tests the new localStorage-based authentication system
 */

const { test, expect, chromium, firefox, webkit } = require('@playwright/test')

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  users: {
    userA: { email: 'user1@example.com', password: 'password123' },
    userB: { email: 'user2@example.com', password: 'password456' }
  }
}

test.describe('Session Isolation Tests', () => {
  
  test('Multi-browser session isolation', async () => {
    console.log('🧪 Testing multi-browser session isolation...')
    
    // Launch Chrome and Firefox
    const chromiumBrowser = await chromium.launch()
    const firefoxBrowser = await firefox.launch()
    
    const chromeContext = await chromiumBrowser.newContext()
    const firefoxContext = await firefoxBrowser.newContext()
    
    const chromePage = await chromeContext.newPage()
    const firefoxPage = await firefoxContext.newPage()
    
    try {
      // Login userA in Chrome
      console.log('📱 Logging in User A (Chrome)...')
      await chromePage.goto(`${TEST_CONFIG.baseURL}/login`)
      await chromePage.fill('[name=\"email\"]', TEST_CONFIG.users.userA.email)
      await chromePage.fill('[name=\"password\"]', TEST_CONFIG.users.userA.password)
      await chromePage.click('button[type=\"submit\"]')
      await chromePage.waitForURL('**/dashboard')
      
      // Login userB in Firefox  
      console.log('🦊 Logging in User B (Firefox)...')
      await firefoxPage.goto(`${TEST_CONFIG.baseURL}/login`)
      await firefoxPage.fill('[name=\"email\"]', TEST_CONFIG.users.userB.email)
      await firefoxPage.fill('[name=\"password\"]', TEST_CONFIG.users.userB.password)
      await firefoxPage.click('button[type=\"submit\"]')
      await firefoxPage.waitForURL('**/dashboard')
      
      // Verify session isolation
      console.log('🔍 Verifying session isolation...')
      
      // Check localStorage in Chrome (should have userA session)
      const chromeSessionData = await chromePage.evaluate(() => {
        return localStorage.getItem('sb-auth-token-default')
      })
      
      // Check localStorage in Firefox (should have userB session)  
      const firefoxSessionData = await firefoxPage.evaluate(() => {
        return localStorage.getItem('sb-auth-token-default')
      })
      
      expect(chromeSessionData).toBeTruthy()
      expect(firefoxSessionData).toBeTruthy()
      expect(chromeSessionData).not.toEqual(firefoxSessionData)
      
      // Verify user contexts are different
      const chromeUserEmail = await chromePage.evaluate(() => {
        const sessionData = localStorage.getItem('sb-auth-token-default')
        if (sessionData) {
          const parsed = JSON.parse(sessionData)
          return parsed.user?.email
        }
        return null
      })
      
      const firefoxUserEmail = await firefoxPage.evaluate(() => {
        const sessionData = localStorage.getItem('sb-auth-token-default')
        if (sessionData) {
          const parsed = JSON.parse(sessionData)
          return parsed.user?.email
        }
        return null
      })
      
      expect(chromeUserEmail).toBe(TEST_CONFIG.users.userA.email)
      expect(firefoxUserEmail).toBe(TEST_CONFIG.users.userB.email)
      
      console.log('✅ Multi-browser session isolation: PASSED')
      
    } finally {
      await chromiumBrowser.close()
      await firefoxBrowser.close()
    }
  })
  
  test('Cookie cleanup verification', async () => {
    console.log('🧹 Testing cookie cleanup...')
    
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    
    try {
      // Login to establish session
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[name=\"email\"]', TEST_CONFIG.users.userA.email)
      await page.fill('[name=\"password\"]', TEST_CONFIG.users.userA.password)
      await page.click('button[type=\"submit\"]')
      await page.waitForURL('**/dashboard')
      
      // Check that no Supabase auth cookies exist
      const cookies = await context.cookies()
      const supabaseCookies = cookies.filter(cookie => 
        cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
      )
      
      expect(supabaseCookies.length).toBe(0)
      console.log('✅ No Supabase auth cookies found (expected behavior)')
      
      // Verify localStorage has session data
      const localStorageSession = await page.evaluate(() => {
        return localStorage.getItem('sb-auth-token-default')
      })
      
      expect(localStorageSession).toBeTruthy()
      console.log('✅ Session data properly stored in localStorage')
      
    } finally {
      await browser.close()
    }
  })
  
  test('Logout cleanup verification', async () => {
    console.log('🚪 Testing logout cleanup...')
    
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    
    try {
      // Login
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[name=\"email\"]', TEST_CONFIG.users.userA.email)
      await page.fill('[name=\"password\"]', TEST_CONFIG.users.userA.password)
      await page.click('button[type=\"submit\"]')
      await page.waitForURL('**/dashboard')
      
      // Verify session exists
      let sessionData = await page.evaluate(() => {
        return localStorage.getItem('sb-auth-token-default')
      })
      expect(sessionData).toBeTruthy()
      console.log('✅ Session established')
      
      // Logout
      await page.click('[data-testid=\"user-dropdown\"]') // Adjust selector as needed
      await page.click('button:has-text(\"Sign out\")')
      await page.waitForURL('**/login')
      
      // Verify session cleanup
      sessionData = await page.evaluate(() => {
        return localStorage.getItem('sb-auth-token-default')
      })
      expect(sessionData).toBeFalsy()
      console.log('✅ Session properly cleaned up after logout')
      
    } finally {
      await browser.close()
    }
  })
  
  test('Feature flag rollback functionality', async () => {
    console.log('🏁 Testing feature flag rollback...')
    
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    
    try {
      // Test with localStorage auth (default)
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      
      // Check client configuration
      const usesLocalStorage = await page.evaluate(() => {
        return !process.env.NEXT_PUBLIC_USE_COOKIE_AUTH || 
               process.env.NEXT_PUBLIC_USE_COOKIE_AUTH !== 'true'
      })
      
      expect(usesLocalStorage).toBe(true)
      console.log('✅ Feature flag correctly configured for localStorage auth')
      
    } finally {
      await browser.close()
    }
  })
})

// Utility function to run migration tests
async function testMigration() {
  console.log('🔄 Testing session migration...')
  
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Simulate existing cookie session (would normally be set by old system)
    await context.addCookies([{
      name: 'sb-jsgdawsyvjxyoyamuwrj-auth-token',
      value: JSON.stringify({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        user: { email: TEST_CONFIG.users.userA.email }
      }),
      domain: 'localhost',
      path: '/'
    }])
    
    // Visit app (should trigger migration)
    await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
    
    // Check if migration occurred
    const migrationOccurred = await page.evaluate(() => {
      // Check if localStorage now has the session
      const localSession = localStorage.getItem('sb-auth-token-default')
      return !!localSession
    })
    
    if (migrationOccurred) {
      console.log('✅ Session migration: PASSED')
    } else {
      console.log('❌ Session migration: FAILED')
    }
    
  } finally {
    await browser.close()
  }
}

// Export test runner
module.exports = {
  runSessionIsolationTests: async () => {
    console.log('🚀 Starting Session Isolation Test Suite...')
    
    // Run Playwright tests
    const { spawn } = require('child_process')
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npx', ['playwright', 'test', __filename], {
        stdio: 'inherit',
        cwd: __dirname
      })
      
      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ All session isolation tests passed!')
          resolve()
        } else {
          console.log('❌ Some tests failed')
          reject(new Error(`Tests failed with exit code ${code}`))
        }
      })
    })
  },
  
  testMigration
}

// Run if called directly
if (require.main === module) {
  testMigration()
}
#!/usr/bin/env node
/**
 * Session Isolation Test Script
 * 
 * This script tests for session bleeding vulnerabilities by simulating
 * multiple concurrent users and checking for session contamination.
 */

const https = require('https')
const http = require('http')

// Configuration
const CONFIG = {
  // Update these with your actual deployment URL and credentials
  baseUrl: process.env.TEST_BASE_URL || 'https://your-app.sliplane.app',
  
  // Test users (replace with actual test accounts)
  users: [
    {
      email: 'oviedosamuel@gmail.com',
      password: 'Sep202003$',
      expectedBusinessId: '1'
    },
    {
      email: 'mario@130percent.com',
      password: 'Mario2018!',
      expectedBusinessId: '6'
    }
  ],
  
  // Test configuration
  concurrentSessions: 10,
  businessSwitchIterations: 20,
  testDurationMs: 60000, // 1 minute
}

class SessionIsolationTester {
  constructor() {
    this.results = {
      sessionsCreated: 0,
      businessSwitches: 0,
      sessionBleedingDetected: 0,
      errors: [],
      warnings: [],
      timeline: []
    }
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, CONFIG.baseUrl)
      const requestOptions = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SessionIsolationTester/1.0',
          ...options.headers
        }
      }

      const protocol = url.protocol === 'https:' ? https : http
      
      const req = protocol.request(url, requestOptions, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            const result = {
              statusCode: res.statusCode,
              headers: res.headers,
              body: data ? JSON.parse(data) : null,
              cookies: res.headers['set-cookie'] || []
            }
            resolve(result)
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data,
              cookies: res.headers['set-cookie'] || []
            })
          }
        })
      })

      req.on('error', reject)

      if (options.body) {
        req.write(JSON.stringify(options.body))
      }

      req.end()
    })
  }

  extractCookies(cookieHeaders) {
    if (!cookieHeaders) return ''
    return cookieHeaders.map(cookie => cookie.split(';')[0]).join('; ')
  }

  async loginUser(userIndex) {
    const user = CONFIG.users[userIndex]
    
    try {
      const loginResponse = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: user.email,
          password: user.password
        }
      })

      if (loginResponse.statusCode !== 200) {
        throw new Error(`Login failed: ${loginResponse.statusCode} - ${JSON.stringify(loginResponse.body)}`)
      }

      const cookies = this.extractCookies(loginResponse.cookies)
      
      this.results.sessionsCreated++
      this.results.timeline.push({
        timestamp: new Date().toISOString(),
        event: 'login',
        userId: userIndex,
        email: user.email
      })

      return {
        userId: userIndex,
        email: user.email,
        cookies,
        expectedBusinessId: user.expectedBusinessId
      }
    } catch (error) {
      this.results.errors.push({
        type: 'login_error',
        userId: userIndex,
        error: error.message
      })
      throw error
    }
  }

  async getCurrentUser(session) {
    try {
      const response = await this.makeRequest('/api/auth/user', {
        method: 'GET',
        headers: {
          'Cookie': session.cookies
        }
      })

      if (response.statusCode !== 200) {
        throw new Error(`Get user failed: ${response.statusCode}`)
      }

      return response.body
    } catch (error) {
      this.results.errors.push({
        type: 'get_user_error',
        sessionUserId: session.userId,
        error: error.message
      })
      return null
    }
  }

  async switchBusiness(session, businessId) {
    try {
      const response = await this.makeRequest('/api/company/switch', {
        method: 'POST',
        headers: {
          'Cookie': session.cookies
        },
        body: {
          companyId: businessId
        }
      })

      this.results.businessSwitches++
      this.results.timeline.push({
        timestamp: new Date().toISOString(),
        event: 'business_switch',
        userId: session.userId,
        businessId: businessId
      })

      return response.statusCode === 200
    } catch (error) {
      this.results.errors.push({
        type: 'business_switch_error',
        sessionUserId: session.userId,
        businessId: businessId,
        error: error.message
      })
      return false
    }
  }

  async testSessionIsolation() {
    console.log('🧪 Starting Session Isolation Test...')
    console.log(`Target: ${CONFIG.baseUrl}`)
    console.log(`Testing with ${CONFIG.users.length} users, ${CONFIG.concurrentSessions} concurrent sessions`)
    
    // Phase 1: Create multiple sessions for different users
    console.log('\n📝 Phase 1: Creating concurrent user sessions...')
    const sessions = []
    
    try {
      for (let i = 0; i < CONFIG.concurrentSessions; i++) {
        const userIndex = i % CONFIG.users.length
        console.log(`Creating session ${i + 1} for user ${userIndex + 1} (${CONFIG.users[userIndex].email})`)
        
        const session = await this.loginUser(userIndex)
        sessions.push(session)
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      console.log(`✅ Created ${sessions.length} sessions successfully`)
      
    } catch (error) {
      console.error(`❌ Failed to create sessions: ${error.message}`)
      return this.results
    }

    // Phase 2: Test concurrent business switching
    console.log('\n🔄 Phase 2: Testing concurrent business switching...')
    
    const businessSwitchPromises = sessions.map(async (session, sessionIndex) => {
      for (let i = 0; i < CONFIG.businessSwitchIterations; i++) {
        try {
          // Alternate between available businesses
          const targetBusinessId = session.userId === 0 ? '1' : '6'
          
          await this.switchBusiness(session, targetBusinessId)
          
          // Small delay between switches
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200))
          
          // Verify user identity hasn't changed
          const currentUser = await this.getCurrentUser(session)
          if (currentUser && currentUser.email !== session.email) {
            this.results.sessionBleedingDetected++
            this.results.errors.push({
              type: 'session_bleeding',
              expectedEmail: session.email,
              actualEmail: currentUser.email,
              sessionIndex: sessionIndex,
              iteration: i
            })
            
            console.error(`🚨 SESSION BLEEDING DETECTED!`)
            console.error(`  Session ${sessionIndex} expected: ${session.email}`)
            console.error(`  But got: ${currentUser.email}`)
          }
          
        } catch (error) {
          // Continue testing even if individual operations fail
          console.warn(`⚠️  Session ${sessionIndex}, iteration ${i} failed: ${error.message}`)
        }
      }
    })

    // Run all business switching operations concurrently
    await Promise.allSettled(businessSwitchPromises)
    
    console.log(`✅ Completed business switching tests`)

    // Phase 3: Final verification
    console.log('\n🔍 Phase 3: Final session verification...')
    
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i]
      try {
        const currentUser = await this.getCurrentUser(session)
        if (currentUser && currentUser.email !== session.email) {
          this.results.sessionBleedingDetected++
          this.results.errors.push({
            type: 'final_verification_failure',
            expectedEmail: session.email,
            actualEmail: currentUser.email,
            sessionIndex: i
          })
        }
      } catch (error) {
        console.warn(`⚠️  Final verification failed for session ${i}: ${error.message}`)
      }
    }

    return this.results
  }

  generateReport() {
    console.log('\n📊 SESSION ISOLATION TEST REPORT')
    console.log('=====================================')
    console.log(`Sessions Created: ${this.results.sessionsCreated}`)
    console.log(`Business Switches: ${this.results.businessSwitches}`)
    console.log(`Session Bleeding Detected: ${this.results.sessionBleedingDetected}`)
    console.log(`Errors: ${this.results.errors.length}`)
    console.log(`Warnings: ${this.results.warnings.length}`)
    
    if (this.results.sessionBleedingDetected > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUE DETECTED!')
      console.log('Session bleeding has been confirmed. This is a severe security vulnerability.')
      console.log('Immediate action required:')
      console.log('1. Review auth cache implementation')
      console.log('2. Check for global state pollution')
      console.log('3. Verify session isolation in production')
    } else {
      console.log('\n✅ No session bleeding detected in this test')
      console.log('However, continue monitoring for session-related issues')
    }

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      this.results.errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error.type}: ${error.error || JSON.stringify(error)}`)
      })
      
      if (this.results.errors.length > 10) {
        console.log(`... and ${this.results.errors.length - 10} more errors`)
      }
    }

    // Save detailed results to file
    const fs = require('fs')
    const reportFile = `session-isolation-test-${Date.now()}.json`
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2))
    console.log(`\n📁 Detailed results saved to: ${reportFile}`)
  }
}

// Main execution
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Session Isolation Tester')
    console.log('========================')
    console.log('')
    console.log('Usage: node test-session-isolation.js [options]')
    console.log('')
    console.log('Environment variables:')
    console.log('  TEST_BASE_URL    Base URL of the application (default: https://your-app.sliplane.app)')
    console.log('')
    console.log('Options:')
    console.log('  --help, -h       Show this help message')
    console.log('')
    console.log('Before running:')
    console.log('1. Update CONFIG.baseUrl with your actual deployment URL')
    console.log('2. Update CONFIG.users with valid test account credentials')
    console.log('3. Ensure the test accounts have access to different businesses')
    return
  }

  const tester = new SessionIsolationTester()
  
  try {
    const results = await tester.testSessionIsolation()
    tester.generateReport()
    
    // Exit with error code if session bleeding detected
    process.exit(results.sessionBleedingDetected > 0 ? 1 : 0)
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { SessionIsolationTester }
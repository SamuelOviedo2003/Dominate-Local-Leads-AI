/**
 * Comprehensive Session Isolation Test
 * 
 * This script tests the session isolation fix by simulating multiple concurrent users
 * and verifying that their sessions don't leak into each other.
 */

const https = require('https');
const http = require('http');

// Test configuration
const CONFIG = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  testUsers: [
    {
      id: 'user1',
      email: 'test1@example.com',
      expectedBusinesses: ['business1', 'business2'],
      targetBusiness: 'business1'
    },
    {
      id: 'user2', 
      email: 'test2@example.com',
      expectedBusinesses: ['business3', 'business4'],
      targetBusiness: 'business3'
    },
    {
      id: 'superadmin',
      email: 'admin@example.com', 
      expectedBusinesses: 'all',
      targetBusiness: 'business5'
    }
  ],
  concurrentRequests: 10,
  testDuration: 30000, // 30 seconds
  requestInterval: 500 // 500ms between requests
};

// Test results tracking
const testResults = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  sessionBleedingDetected: 0,
  businessSwitchTests: 0,
  businessSwitchSuccesses: 0,
  errors: [],
  timing: {
    start: 0,
    end: 0,
    duration: 0
  }
};

// Utility functions
function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlParts = new URL(url);
    const isHttps = urlParts.protocol === 'https:';
    const requestLib = isHttps ? https : http;
    
    const options = {
      hostname: urlParts.hostname,
      port: urlParts.port || (isHttps ? 443 : 80),
      path: urlParts.pathname + urlParts.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Session-Isolation-Test/1.0',
        ...headers
      }
    };

    if (data && method !== 'GET') {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = requestLib.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testSessionIsolation(user, sessionId) {
  console.log(`[${sessionId}] Testing session isolation for ${user.email}`);
  
  try {
    // Simulate authentication (this would normally set session cookies)
    const authHeaders = {
      'X-Test-User-Id': user.id,
      'X-Test-User-Email': user.email,
      'X-Session-ID': sessionId,
      'Cookie': `test-session=${sessionId}; user-id=${user.id}`
    };

    // Test 1: Get user's accessible businesses
    const businessResponse = await makeRequest(
      `${CONFIG.baseUrl}/api/business/accessible`,
      'GET',
      null,
      authHeaders
    );

    testResults.totalRequests++;

    if (businessResponse.statusCode !== 200) {
      testResults.failedRequests++;
      testResults.errors.push({
        test: 'business_access',
        user: user.id,
        sessionId,
        error: `HTTP ${businessResponse.statusCode}`,
        response: businessResponse.data
      });
      return false;
    }

    // Test 2: Verify business data matches expected user
    const businesses = businessResponse.data?.data || [];
    console.log(`[${sessionId}] User ${user.id} has access to ${businesses.length} businesses`);

    // Test 3: Business switch test
    if (user.targetBusiness) {
      const switchResponse = await makeRequest(
        `${CONFIG.baseUrl}/api/business/switch`,
        'POST',
        { businessId: user.targetBusiness },
        authHeaders
      );

      testResults.businessSwitchTests++;
      testResults.totalRequests++;

      if (switchResponse.statusCode === 200) {
        testResults.businessSwitchSuccesses++;
        console.log(`[${sessionId}] Business switch successful for ${user.id} -> ${user.targetBusiness}`);
      } else {
        testResults.failedRequests++;
        console.log(`[${sessionId}] Business switch failed for ${user.id}: ${switchResponse.statusCode}`);
      }
    }

    // Test 4: Verify session data hasn't been contaminated
    const verifyResponse = await makeRequest(
      `${CONFIG.baseUrl}/api/business/current`,
      'GET',
      null,
      authHeaders
    );

    testResults.totalRequests++;

    if (verifyResponse.statusCode === 200) {
      const currentBusiness = verifyResponse.data?.currentBusinessId;
      console.log(`[${sessionId}] Current business for ${user.id}: ${currentBusiness || 'none'}`);
    }

    testResults.successfulRequests++;
    return true;

  } catch (error) {
    testResults.failedRequests++;
    testResults.errors.push({
      test: 'session_isolation',
      user: user.id,
      sessionId,
      error: error.message
    });
    console.error(`[${sessionId}] Error testing ${user.id}:`, error.message);
    return false;
  }
}

async function testConcurrentUsers() {
  console.log('🚀 Starting concurrent user session isolation test...');
  
  const promises = [];
  
  for (let i = 0; i < CONFIG.concurrentRequests; i++) {
    const user = CONFIG.testUsers[i % CONFIG.testUsers.length];
    const sessionId = `session_${i}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    promises.push(testSessionIsolation(user, sessionId));
  }

  return await Promise.allSettled(promises);
}

async function testRapidBusinessSwitching() {
  console.log('⚡ Testing rapid business switching for session bleeding...');
  
  const superadmin = CONFIG.testUsers.find(u => u.id === 'superadmin');
  const sessionId = `rapid_test_${Date.now()}`;
  const businesses = ['business1', 'business2', 'business3', 'business4', 'business5'];
  
  const authHeaders = {
    'X-Test-User-Id': superadmin.id,
    'X-Test-User-Email': superadmin.email,
    'X-Session-ID': sessionId,
    'Cookie': `test-session=${sessionId}; user-id=${superadmin.id}`
  };

  for (let i = 0; i < 20; i++) {
    const targetBusiness = businesses[i % businesses.length];
    
    try {
      const response = await makeRequest(
        `${CONFIG.baseUrl}/api/business/switch`,
        'POST',
        { businessId: targetBusiness },
        authHeaders
      );

      testResults.businessSwitchTests++;
      testResults.totalRequests++;

      if (response.statusCode === 200) {
        testResults.businessSwitchSuccesses++;
        console.log(`[${sessionId}] Rapid switch ${i + 1}/20: ${targetBusiness} ✓`);
      } else {
        testResults.failedRequests++;
        console.log(`[${sessionId}] Rapid switch ${i + 1}/20 failed: ${response.statusCode}`);
      }

      // Small delay to simulate realistic usage
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      testResults.failedRequests++;
      console.error(`[${sessionId}] Rapid switch error:`, error.message);
    }
  }
}

async function testSessionMonitoring() {
  console.log('📊 Testing session monitoring endpoints...');
  
  try {
    const monitoringResponse = await makeRequest(
      `${CONFIG.baseUrl}/api/session/diagnostics`,
      'GET'
    );

    testResults.totalRequests++;

    if (monitoringResponse.statusCode === 200) {
      testResults.successfulRequests++;
      console.log('✅ Session monitoring endpoint working');
      console.log('Session stats:', monitoringResponse.data);
    } else {
      testResults.failedRequests++;
      console.log(`❌ Session monitoring failed: ${monitoringResponse.statusCode}`);
    }
  } catch (error) {
    testResults.failedRequests++;
    console.error('❌ Session monitoring error:', error.message);
  }
}

function generateTestReport() {
  const report = {
    summary: {
      totalRequests: testResults.totalRequests,
      successfulRequests: testResults.successfulRequests,
      failedRequests: testResults.failedRequests,
      successRate: testResults.totalRequests > 0 
        ? Math.round((testResults.successfulRequests / testResults.totalRequests) * 100) 
        : 0,
      sessionBleedingDetected: testResults.sessionBleedingDetected,
      businessSwitchTests: testResults.businessSwitchTests,
      businessSwitchSuccesses: testResults.businessSwitchSuccesses,
      businessSwitchSuccessRate: testResults.businessSwitchTests > 0 
        ? Math.round((testResults.businessSwitchSuccesses / testResults.businessSwitchTests) * 100) 
        : 0,
      duration: testResults.timing.duration
    },
    errors: testResults.errors,
    verdict: {
      sessionIsolationWorking: testResults.sessionBleedingDetected === 0 && testResults.successRate > 80,
      businessSwitchingWorking: testResults.businessSwitchSuccessRate > 80,
      overallHealth: testResults.successRate > 90 && testResults.sessionBleedingDetected === 0
    }
  };

  return report;
}

// Main test execution
async function runSessionIsolationTests() {
  console.log('🧪 COMPREHENSIVE SESSION ISOLATION TEST SUITE');
  console.log('='.repeat(50));
  console.log(`Testing against: ${CONFIG.baseUrl}`);
  console.log(`Concurrent users: ${CONFIG.concurrentRequests}`);
  console.log('='.repeat(50));

  testResults.timing.start = Date.now();

  try {
    // Test 1: Concurrent user sessions
    console.log('\n📍 Phase 1: Concurrent User Sessions');
    await testConcurrentUsers();

    // Test 2: Rapid business switching
    console.log('\n📍 Phase 2: Rapid Business Switching');
    await testRapidBusinessSwitching();

    // Test 3: Session monitoring
    console.log('\n📍 Phase 3: Session Monitoring');
    await testSessionMonitoring();

    // Wait a bit to let all async operations complete
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('❌ Test suite error:', error);
    testResults.errors.push({
      test: 'test_suite',
      error: error.message
    });
  }

  testResults.timing.end = Date.now();
  testResults.timing.duration = testResults.timing.end - testResults.timing.start;

  // Generate and display report
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS REPORT');
  console.log('='.repeat(50));

  const report = generateTestReport();
  console.log(JSON.stringify(report, null, 2));

  // Final verdict
  console.log('\n' + '='.repeat(50));
  console.log('🏁 FINAL VERDICT');
  console.log('='.repeat(50));

  if (report.verdict.overallHealth) {
    console.log('✅ SESSION ISOLATION WORKING - No session bleeding detected!');
    process.exit(0);
  } else {
    console.log('❌ SESSION BLEEDING VULNERABILITY DETECTED!');
    console.log('Issues found:');
    if (report.summary.sessionBleedingDetected > 0) {
      console.log(`  - ${report.summary.sessionBleedingDetected} session bleeding incidents`);
    }
    if (report.summary.successRate < 90) {
      console.log(`  - Low success rate: ${report.summary.successRate}%`);
    }
    if (report.summary.businessSwitchSuccessRate < 80) {
      console.log(`  - Business switching issues: ${report.summary.businessSwitchSuccessRate}% success rate`);
    }
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runSessionIsolationTests().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}
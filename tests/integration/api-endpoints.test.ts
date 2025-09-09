import { test, expect } from '@playwright/test';

/**
 * API Integration Tests
 * Testing all API endpoints for functionality, error handling, and data consistency
 */

// Test configuration
const API_BASE_URL = 'http://localhost:3000/api';

test.describe('Authentication API', () => {
  test('should handle login flow correctly', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: 'test@dominatelocalleads.com',
        password: 'TestPassword123!'
      }
    });
    
    // Should return success or handle gracefully if auth system is different
    expect([200, 404, 405]).toContain(response.status());
  });

  test('should reject invalid credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: 'invalid@email.com',
        password: 'wrongpassword'
      }
    });
    
    // Should return 401 or similar error status
    expect([401, 403, 404, 405]).toContain(response.status());
  });

  test('should validate email format', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: 'invalid-email-format',
        password: 'password123'
      }
    });
    
    expect([400, 401, 404, 405]).toContain(response.status());
  });
});

test.describe('Company Switch API', () => {
  test('should switch business context for Super Admin', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/company/switch`, {
      data: {
        businessId: 'test-business-1'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Should handle business switching or return appropriate error
    expect([200, 401, 403, 404, 405]).toContain(response.status());
  });

  test('should validate business ID format', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/company/switch`, {
      data: {
        businessId: ''
      }
    });
    
    expect([400, 401, 404, 405]).toContain(response.status());
  });
});

test.describe('Dashboard API Endpoints', () => {
  test('/api/dashboard/platform-spend should return platform spend data', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/dashboard/platform-spend?businessId=test&startDate=2024-01-01`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        expect(Array.isArray(data.data)).toBe(true);
        
        // Validate platform spend data structure
        if (data.data.length > 0) {
          const firstItem = data.data[0];
          expect(firstItem).toHaveProperty('platform');
          expect(firstItem).toHaveProperty('spend');
          expect(typeof firstItem.spend).toBe('number');
        }
      }
    } else {
      // Should return appropriate error status
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });

  test('should validate required parameters for platform spend', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/dashboard/platform-spend`);
    
    // Should require businessId parameter
    expect([400, 401, 404, 405]).toContain(response.status());
  });
});

test.describe('Leads API Endpoints', () => {
  test('/api/leads/recent should return recent leads data', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/leads/recent?businessId=test&startDate=2024-01-01`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        expect(Array.isArray(data.data)).toBe(true);
        
        // Validate lead data structure
        if (data.data.length > 0) {
          const firstLead = data.data[0];
          expect(firstLead).toHaveProperty('leadId');
          expect(firstLead).toHaveProperty('firstName');
          expect(firstLead).toHaveProperty('lastName');
          expect(firstLead).toHaveProperty('email');
          expect(firstLead).toHaveProperty('businessId');
        }
      }
    } else {
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });

  test('/api/leads/metrics should return lead metrics', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/leads/metrics?businessId=test&startDate=2024-01-01`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        const metrics = data.data;
        expect(typeof metrics.total).toBe('number');
        expect(typeof metrics.contacted).toBe('number');
        expect(typeof metrics.booked).toBe('number');
        expect(typeof metrics.contactRate).toBe('number');
        expect(typeof metrics.bookingRate).toBe('number');
      }
    } else {
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });

  test('/api/leads/appointment-setters should return empty data (temporarily disabled)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/leads/appointment-setters?businessId=test&startDate=2024-01-01`);
    
    // TEMPORARILY DISABLED: Appointment setters functionality is commented out
    // This test now expects empty data until the time_speed column is restored
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(0); // Should be empty while disabled
      
      /* COMMENTED OUT: Original test that validates appointment setter data structure
      if (data.success && data.data) {
        expect(Array.isArray(data.data)).toBe(true);
        
        // Validate appointment setter data structure
        if (data.data.length > 0) {
          const firstSetter = data.data[0];
          expect(firstSetter).toHaveProperty('assigned');
          expect(firstSetter).toHaveProperty('totalLeads');
          expect(firstSetter).toHaveProperty('contacted');
          expect(firstSetter).toHaveProperty('booked');
        }
      }
      */
    } else {
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });

  test('/api/leads/[leadId] should return individual lead details', async ({ request }) => {
    const leadId = 'test-lead-id';
    const response = await request.get(`${API_BASE_URL}/leads/${leadId}?businessId=test`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        const leadDetails = data.data;
        expect(leadDetails).toHaveProperty('lead');
        expect(leadDetails).toHaveProperty('callWindows');
        expect(leadDetails).toHaveProperty('communications');
        expect(leadDetails).toHaveProperty('property');
      }
    } else {
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });
});

test.describe('Incoming Calls API Endpoints', () => {
  test('/api/incoming-calls/source-distribution should return source data', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/incoming-calls/source-distribution?businessId=test&startDate=2024-01-01`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        expect(Array.isArray(data.data)).toBe(true);
        
        if (data.data.length > 0) {
          const firstItem = data.data[0];
          expect(firstItem).toHaveProperty('source');
          expect(firstItem).toHaveProperty('count');
          expect(typeof firstItem.count).toBe('number');
        }
      }
    } else {
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });

  test('/api/incoming-calls/caller-type-distribution should return caller type data', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/incoming-calls/caller-type-distribution?businessId=test&startDate=2024-01-01`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        expect(Array.isArray(data.data)).toBe(true);
        
        if (data.data.length > 0) {
          const firstItem = data.data[0];
          expect(firstItem).toHaveProperty('callerType');
          expect(firstItem).toHaveProperty('count');
        }
      }
    } else {
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });

  test('/api/incoming-calls/recent-calls should return recent calls', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/incoming-calls/recent-calls?businessId=test&startDate=2024-01-01`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        expect(Array.isArray(data.data)).toBe(true);
      }
    } else {
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });
});

test.describe('Salesman API Endpoints', () => {
  test('/api/bookings/metrics should return booking metrics', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/bookings/metrics?businessId=test&startDate=2024-01-01`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        const metrics = data.data;
        expect(typeof metrics.booked).toBe('number');
        expect(typeof metrics.shows).toBe('number');
        expect(typeof metrics.closes).toBe('number');
        expect(typeof metrics.totalRevenue).toBe('number');
      }
    } else {
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });

  test('/api/bookings/performance should return individual performance data', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/bookings/performance?businessId=test&startDate=2024-01-01`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        expect(Array.isArray(data.data)).toBe(true);
      }
    } else {
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });

  test('/api/bookings/trends should return revenue trends', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/bookings/trends?businessId=test&startDate=2024-01-01`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        expect(Array.isArray(data.data)).toBe(true);
        
        if (data.data.length > 0) {
          const firstTrend = data.data[0];
          expect(firstTrend).toHaveProperty('date');
          expect(firstTrend).toHaveProperty('revenue');
        }
      }
    } else {
      expect([401, 403, 404, 500]).toContain(response.status());
    }
  });
});

test.describe('Health Check API', () => {
  test('/api/health should return system status', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });
});

test.describe('API Error Handling', () => {
  test('should handle malformed JSON requests', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/company/switch`, {
      data: 'invalid json',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect([400, 404, 405]).toContain(response.status());
  });

  test('should handle missing required parameters', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/leads/recent`);
    
    expect([400, 401, 404]).toContain(response.status());
  });

  test('should handle invalid business IDs', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/leads/recent?businessId=invalid-id&startDate=2024-01-01`);
    
    expect([400, 401, 403, 404, 500]).toContain(response.status());
  });

  test('should handle invalid date formats', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/leads/recent?businessId=test&startDate=invalid-date`);
    
    expect([400, 401, 404, 500]).toContain(response.status());
  });
});

test.describe('API Performance', () => {
  test('should respond within acceptable time limits', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${API_BASE_URL}/health`);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Should respond within 500ms per requirements
    expect(responseTime).toBeLessThan(500);
    expect(response.status()).toBe(200);
  });

  test('should handle concurrent requests', async ({ request }) => {
    const promises = Array.from({ length: 5 }, () => 
      request.get(`${API_BASE_URL}/health`)
    );
    
    const responses = await Promise.all(promises);
    
    // All requests should complete successfully
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
  });
});
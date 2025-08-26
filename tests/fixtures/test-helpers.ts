import { test as base, expect, Page } from '@playwright/test';

// Test data factories
export const testData = {
  user: {
    validEmail: 'test@dominatelocalleads.com',
    validPassword: 'TestPassword123!',
    invalidEmail: 'invalid@email.com',
    invalidPassword: 'wrongpassword'
  },
  lead: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    service: 'Roof Repair',
    howSoon: 'ASAP',
    score: 85
  },
  business: {
    companyName: 'Test Roofing Company',
    timeZone: 'America/New_York'
  }
};

// Custom test fixture with authenticated user
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }: { page: Page }, use) => {
    // Login before each test that uses this fixture
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testData.user.validEmail);
    await page.fill('[data-testid="password-input"]', testData.user.validPassword);
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login redirect
    await page.waitForURL('/dashboard');
    
    await use(page);
  }
});

// Custom matchers and utilities
export const testUtils = {
  // Wait for loading to complete
  waitForLoadingComplete: async (page: any) => {
    await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden', timeout: 10000 });
  },
  
  // Generate random test data
  generateRandomEmail: () => `test-${Date.now()}@example.com`,
  generateRandomPhone: () => `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
  
  // Performance helpers
  measurePageLoad: async (page: any, url: string) => {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  },
  
  // Database helpers
  cleanupTestData: async () => {
    // This would connect to Supabase and clean up test data
    console.log('Cleaning up test data...');
  }
};

export { expect };
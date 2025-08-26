import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🧪 Starting global test setup...');
  
  const { baseURL } = config.projects[0]?.use || {};
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(baseURL || 'http://localhost:3000');
    
    // Wait for the main application to load
    await page.waitForSelector('body', { timeout: 30000 });
    
    console.log('✅ Application is ready for testing');
    
    // Store authentication state if needed
    // This would be used for tests that require authentication
    await page.context().storageState({ path: 'tests/auth-state.json' });
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
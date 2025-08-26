import { FullConfig } from '@playwright/test';
import fs from 'fs';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  // Clean up any test artifacts
  const authStatePath = 'tests/auth-state.json';
  if (fs.existsSync(authStatePath)) {
    fs.unlinkSync(authStatePath);
    console.log('🗑️  Cleaned up authentication state');
  }
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;
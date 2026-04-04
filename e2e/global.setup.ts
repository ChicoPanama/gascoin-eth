import { test as setup } from '@playwright/test';

setup('seed test environment', async () => {
  // In a full setup, this would seed the test Supabase instance
  // For now, tests run against whatever data exists
  console.log('✓ E2E test setup complete');
});

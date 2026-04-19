import { execSync } from 'child_process';
import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Running db:reset...');
  execSync('npm run db:reset', { stdio: 'inherit' });
  console.log('db:reset completed.');
}

export default globalSetup;

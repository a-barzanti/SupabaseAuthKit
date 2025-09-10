import { execa } from 'execa';

export default async function globalSetup() {
  // 1) Run the pnpm db reset script
  await execa('pnpm', ['supabase:dbreset'], { stdio: 'inherit' });

  // 2) Run the test user setup script
  await execa('node', ['scripts/setup-test-users.js'], { stdio: 'inherit' });
}

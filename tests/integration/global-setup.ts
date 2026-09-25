import { setupTestUsers } from '../../scripts/setup-test-users.js';

export default async function globalSetup() {
  // Does not reset databases, delete existing accounts, or use signup metadata.
  return await setupTestUsers();
}

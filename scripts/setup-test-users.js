// Controlled fixture setup only; never trust signup metadata for role assignment.
import { createClient } from '@supabase/supabase-js';

export async function setupTestUsers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !url ||
    !key ||
    process.env.AUTHKIT_TEST_DISPOSABLE !== '1' ||
    !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)
  ) {
    throw new Error(
      'Integration fixtures require a loopback disposable stack, SUPABASE_SERVICE_ROLE_KEY and AUTHKIT_TEST_DISPOSABLE=1.',
    );
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const created = [];
  async function cleanup() {
    for (const id of created) {
      const { error } = await client.auth.admin.deleteUser(id);
      if (error) throw error;
    }
  }
  try {
    for (const name of ['admin', 'alice', 'bob']) {
      const { data, error } = await client.auth.admin.createUser({
        email: `${name}@example.com`,
        password: 'Passw0rd!',
        email_confirm: true,
      });
      if (error) throw error;
      created.push(data.user.id);
      if (name === 'admin') {
        const result = await client
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', data.user.id);
        if (result.error) throw result.error;
      }
    }
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}

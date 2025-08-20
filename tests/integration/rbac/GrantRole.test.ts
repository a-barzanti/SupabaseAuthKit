import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient;

beforeAll(async () => {
  client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
});

afterEach(async () => {
  await client.auth.signOut().catch(() => {});
});

describe('grant_role RPC', () => {
  it('allows admin to grant roles', async () => {
    const { error: signInError } = await client.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'Passw0rd!',
    });
    expect(signInError).toBeNull();

    const { data: alice, error: profileError } = await client
      .from('profiles')
      .select('id')
      .eq('username', 'alice')
      .single();
    expect(profileError).toBeNull();

    const { data, error } = await client.rpc('grant_role', {
      p_user_id: alice!.id,
      p_role: 'user',
    });

    expect(error).toBeNull();
    expect(data).toBe('user');
  });

  it('prevents normal users from granting roles', async () => {
    const { error: signInError } = await client.auth.signInWithPassword({
      email: 'alice@example.com',
      password: 'Passw0rd!',
    });
    expect(signInError).toBeNull();

    const userId = (await client.auth.getUser()).data.user!.id;

    const { data, error } = await client.rpc('grant_role', {
      p_user_id: userId,
      p_role: 'user',
    });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error?.message).toContain('permission');
  });
});

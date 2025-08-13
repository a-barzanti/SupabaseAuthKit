import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// 1) We will import the function under test AFTER mocks
//    so the function sees our mocks.
let GetAuthUser: typeof import('@/lib/auth-utils').GetAuthUser;

// 2) Real browser-safe client (anon) that our mock createClient() will return
let client: SupabaseClient;

// ----- Mocks -----

// Mock next/navigation to prevent real redirects during tests
vi.mock('next/navigation', () => {
  return {
    redirect: (path: string) => {
      const err: Error & { isRedirect?: boolean } = new Error(`REDIRECT:${path}`);
      // Mark so assertable if needed
      err.isRedirect = true;
      throw err;
    },
  };
});

// Mock your server client factory so GetAuthUser() uses our real client
vi.mock('@/lib/supabase/server', () => {
  return {
    createClient: async () => client,
  };
});

// ----- Setup -----

beforeAll(async () => {
  client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Now that mocks are in place, import the function under test
  ({ GetAuthUser } = await import('@/lib/auth-utils'));
});

afterEach(async () => {
  // Ensure clean session between tests
  await client.auth.signOut().catch(() => {});
});

// ----- Tests -----

describe('Profiles RBAC with RLS', () => {
  describe('Profile View Access', () => {
    it('allows users to view their own profile', async () => {
      // Sign in as alice
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'alice@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      // Get alice's profile
      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', (await client.auth.getUser()).data.user!.id)
        .single();

      expect(error).toBeNull();
      expect(profile).toBeTruthy();
      expect(profile.username).toBe('alice');
    });

    it('allows admin users to view any profile', async () => {
      // Sign in as admin
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      // Get alice's profile (admin should have access)
      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('username', 'alice')
        .single();

      expect(error).toBeNull();
      expect(profile).toBeTruthy();
      expect(profile.username).toBe('alice');
    });

    it('prevents regular users from viewing other profiles', async () => {
      // Sign in as alice
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'alice@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      // Try to get bob's profile (should fail)
      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('username', 'bob')
        .single();

      expect(error).toBeTruthy();
      expect(profile).toBeNull();
    });

    it('prevents anonymous users from viewing any profiles', async () => {
      // Ensure no user is signed in
      await client.auth.signOut();

      // Try to get any profile (should fail)
      const { data } = await client.from('profiles').select('*').limit(1);

      // Empty Data, No error https://github.com/supabase/supabase/issues/30190
      expect(data?.length).toBe(0);
    });
  });

  describe('Profile Update Access', () => {
    it('allows users to update their own profile', async () => {
      // Sign in as alice
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'alice@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      const userId = (await client.auth.getUser()).data.user!.id;

      // Update alice's profile
      const { data: profile, error } = await client
        .from('profiles')
        .update({ username: 'alice_updated' })
        .eq('id', userId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile).toBeTruthy();
      expect(profile.username).toBe('alice_updated');

      // Clean up - restore original username
      await client.from('profiles').update({ username: 'alice' }).eq('id', userId);
    });

    it('allows admin users to update any profile', async () => {
      // Sign in as admin
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      // Update bob's profile (admin should have access)
      const { data: profile, error } = await client
        .from('profiles')
        .update({ username: 'bob_updated' })
        .eq('username', 'bob')
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile).toBeTruthy();
      expect(profile.username).toBe('bob_updated');

      // Clean up - restore original username
      await client.from('profiles').update({ username: 'bob' }).eq('username', 'bob_updated');
    });

    it('prevents regular users from updating other profiles', async () => {
      // Sign in as alice
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'alice@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      // Try to update bob's profile (should fail)
      const { data: profile, error } = await client
        .from('profiles')
        .update({ username: 'bob_hacked' })
        .eq('username', 'bob')
        .select()
        .single();

      expect(error).toBeTruthy();
      expect(profile).toBeNull();
    });
  });

  describe('Profile Delete Access', () => {
    it('prevents users to delete their own profile', async () => {
      // Sign in as alice
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'alice@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      const userId = (await client.auth.getUser()).data.user!.id;

      const { data: deletedProfile } = await client.from('profiles').delete().eq('id', userId);

      // Null Data, No error https://github.com/supabase/supabase/issues/30190
      expect(deletedProfile).toBeNull();

      // Get alice's profile
      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', (await client.auth.getUser()).data.user!.id)
        .single();

      expect(error).toBeNull();
      expect(profile).toBeTruthy();
      expect(profile.username).toBe('alice');
    });

    it('prevents admin users to delete any profile', async () => {
      // Sign in as admin
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      // Try to delete bob's profile (should fail)
      const { data: deletedProfile } = await client.from('profiles').delete().eq('username', 'bob');

      // Null Data, No error https://github.com/supabase/supabase/issues/30190
      expect(deletedProfile).toBeNull();

      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('username', 'bob')
        .select()
        .single();

      expect(error).toBeNull();
      expect(profile).toBeTruthy();
      expect(profile.username).toBe('bob');
    });
  });

  describe('Role-Based Permission System', () => {
    it('correctly identifies user roles from JWT claims', async () => {
      // Sign in as admin
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      const result = await GetAuthUser();
      expect(result.role).toBe('admin');
      expect(result.profile.username).toBe('admin');
    });

    it('correctly identifies regular user roles from JWT claims', async () => {
      // Sign in as alice
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'alice@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      const result = await GetAuthUser();
      expect(result.role).toBe('user');
      expect(result.profile.username).toBe('alice');
    });

    it('enforces role-based permissions correctly', async () => {
      // Test that admin can access profiles.view permission
      const { error: signInError } = await client.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'Passw0rd!',
      });
      expect(signInError).toBeNull();

      // Admin should be able to list all profiles due to profiles.view permission
      const { data: profiles, error } = await client.from('profiles').select('*');

      expect(error).toBeNull();
      expect(profiles).toBeTruthy();
      expect(profiles!.length).toBeGreaterThan(1);

      // Sign out
      await client.auth.signOut().catch(() => {});

      // Test that user can access profiles.view permission only for his own profile
      const { error: userSignInError } = await client.auth.signInWithPassword({
        email: 'alice@example.com',
        password: 'Passw0rd!',
      });
      expect(userSignInError).toBeNull();

      // User should be able to list his own profile due to profiles.view permission
      const { data: userProfile, error: userError } = await client.from('profiles').select('*');

      expect(userError).toBeNull();
      expect(userProfile).toBeTruthy();
      expect(userProfile!.length).toBe(1);
    });
  });
});

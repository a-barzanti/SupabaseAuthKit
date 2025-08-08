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

describe('GetAuthUser', () => {
  it('returns role "user" for a normal user', async () => {
    // These users should be created in globalSetup with proper roles,
    // and your custom-claims hook must include { user_role: "user" } in the JWT.
    const { error } = await client.auth.signInWithPassword({
      email: 'alice@example.com',
      password: 'Passw0rd!',
    });
    expect(error).toBeNull();

    const result = await GetAuthUser();

    expect(result.role).toBe('user');
    expect(result.profile.username).toBeTruthy();
    expect(result.id).toBeTruthy(); // from auth user
  });

  it('returns role "admin" for an admin user', async () => {
    const { error } = await client.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'Passw0rd!',
    });
    expect(error).toBeNull();

    const result = await GetAuthUser();

    expect(result.role).toBe('admin'); // <- requires you fix the 'admim' typo
    expect(result.profile.username).toBeTruthy();
  });

  it('redirects to /auth/login when no session', async () => {
    await client.auth.signOut();

    await expect(async () => {
      await GetAuthUser();
    }).rejects.toMatchObject({
      isRedirect: true,
      message: expect.stringContaining('REDIRECT:/auth/login'),
    });
  });
});

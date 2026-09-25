// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ user: null as { id: string } | null, role: 'user' }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: (cookies: unknown[]) => void } },
  ) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll([
          { name: 'sb-refresh', value: 'renewed', options: { httpOnly: true, path: '/' } },
        ]);
        return { data: { user: state.user } };
      },
    },
    rpc: async () => ({ data: state.role }),
  }),
}));
import { updateSession } from '@/lib/supabase/middleware';

beforeEach(() => {
  state.user = null;
  state.role = 'user';
});
describe('cookie refresh and protected navigation', () => {
  it('preserves refreshed cookies and removes tenant context on login redirects', async () => {
    const response = await updateSession(
      new NextRequest('http://localhost/protected?organization=forged'),
    );
    expect(response.headers.get('location')).toBe('http://localhost/auth/login');
    expect(response.cookies.get('sb-refresh')?.value).toBe('renewed');
  });
  it('propagates refreshed cookies to the downstream request and response', async () => {
    state.user = { id: 'user' };
    const request = new NextRequest('http://localhost/protected');
    const response = await updateSession(request);
    expect(response.status).toBe(200);
    expect(request.cookies.get('sb-refresh')?.value).toBe('renewed');
    expect(response.cookies.get('sb-refresh')?.value).toBe('renewed');
  });
  it('keeps authentication routes public and refreshes cookies there too', async () => {
    const response = await updateSession(new NextRequest('http://localhost/auth/update-password'));
    expect(response.status).toBe(200);
    expect(response.cookies.get('sb-refresh')?.value).toBe('renewed');
  });
  it('does not confuse auth-prefixed protected paths with auth routes', async () => {
    const response = await updateSession(new NextRequest('http://localhost/auth-secret'));
    expect(response.status).toBe(307);
  });
  it('requires a current platform role for the admin area', async () => {
    state.user = { id: 'user' };
    const response = await updateSession(new NextRequest('http://localhost/admin/users'));
    expect(response.headers.get('location')).toBe('http://localhost/protected');
    expect(response.cookies.get('sb-refresh')?.value).toBe('renewed');
  });
});

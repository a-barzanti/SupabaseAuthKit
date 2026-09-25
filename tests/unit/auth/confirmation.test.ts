// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { verifyOtp: async () => ({ error: null }) } }),
}));
import { GET } from '@/app/auth/confirm/route';

it('cannot redirect an authenticated confirmation to an external destination', async () => {
  await expect(
    GET(
      new NextRequest(
        'http://localhost/auth/confirm?token_hash=test&type=signup&next=https://example.test',
      ),
    ),
  ).rejects.toThrow('redirect:/protected');
});
it('preserves the password recovery destination', async () => {
  await expect(
    GET(
      new NextRequest(
        'http://localhost/auth/confirm?token_hash=test&type=recovery&next=/auth/update-password',
      ),
    ),
  ).rejects.toThrow('redirect:/auth/update-password');
});
it('rejects unsupported confirmation types', async () => {
  await expect(
    GET(new NextRequest('http://localhost/auth/confirm?token_hash=test&type=unsupported')),
  ).rejects.toThrow('redirect:/auth/error');
});

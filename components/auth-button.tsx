import Link from 'next/link';

import { GetAuthUser } from '@/lib/auth-utils';

import { Button } from './ui/button';
import { LogoutButton } from './logout-button';

export async function AuthButton() {
  const user = await GetAuthUser();

  return user ? (
    <div className="flex items-center gap-4">
      <Link href="/protected">Organizations</Link>
      {user.role === 'admin' && <Link href="/admin/users">Platform admin</Link>}
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={'outline'}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={'default'}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}

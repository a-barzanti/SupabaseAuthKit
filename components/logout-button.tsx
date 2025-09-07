'use client';

import { useRouter } from 'next/navigation';

import { signOutUser } from '@/lib/actions/user-actions';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const { success } = await signOutUser();
    if (success) {
      router.push('/auth/login');
    }
  };

  return <Button onClick={logout}>Logout</Button>;
}

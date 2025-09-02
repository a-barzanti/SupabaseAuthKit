import { redirect } from 'next/navigation';

import { PageFooter } from '@/components/footer';
import { PageHeader } from '@/components/header';
import { GetAuthUser } from '@/lib/auth-utils';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authUser = await GetAuthUser();

  if (!authUser || authUser.role !== 'admin') {
    console.log('Admin access denied: user not authenticated or not admin', {
      hasUser: !!authUser,
      role: authUser?.role,
    });
    redirect('/protected');
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <PageHeader />
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">{children}</div>
      </div>
      <PageFooter />
    </main>
  );
}

import { PageFooter } from '@/components/footer';
import { PageHeader } from '@/components/header';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
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

import Link from 'next/link';

export function Hero() {
  return (
    <div className="flex flex-col gap-6 py-16 max-w-2xl">
      <p className="text-sm uppercase tracking-widest">SupabaseAuthKit · Reference app</p>
      <h1 className="text-4xl font-semibold">Authentication, organizations, and permissions.</h1>
      <p className="text-lg text-muted-foreground">
        A portable Agent Skill for adding Supabase authentication and organization-based access
        control to Next.js applications.
      </p>
      <Link className="underline" href="/protected">
        Open your organization workspace
      </Link>
      <a className="underline" href="https://github.com/a-barzanti/SupabaseAuthKit">
        Get the skill and integration guide
      </a>
    </div>
  );
}

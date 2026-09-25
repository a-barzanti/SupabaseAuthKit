import { redirect } from 'next/navigation';

import { Workspace } from '@/components/organization-workspace';
import { createClient } from '@/lib/supabase/server';

export default async function ProtectedPage({
  searchParams,
}: {
  searchParams: Promise<{ organization?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id, name')
    .order('created_at');
  if (error) throw new Error(error.message);
  const { organization: requested } = await searchParams;
  // Treat URLs as untrusted context, and choose only an RLS-visible organization.
  const active =
    organizations.find((org) => org.id === requested)?.id ?? organizations[0]?.id ?? null;
  const [members, projects] = active
    ? await Promise.all([
        supabase
          .from('organization_memberships')
          .select('user_id, role')
          .eq('organization_id', active)
          .order('created_at'),
        supabase
          .from('organization_projects')
          .select('id, name')
          .eq('organization_id', active)
          .order('name'),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (members.error || projects.error)
    throw new Error(members.error?.message ?? projects.error?.message);
  return (
    <Workspace
      userId={user.id}
      organizations={organizations}
      active={active}
      members={members.data ?? []}
      projects={projects.data ?? []}
    />
  );
}

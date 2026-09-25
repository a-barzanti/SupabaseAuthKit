import { UserResponse } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

type AuthUser = NonNullable<UserResponse['data']['user']> & {
  profile: { username: string | null };
  role: 'user' | 'admin';
};

// Platform roles are separate from organization membership. Never authorize from
// stale JWT role claims; the database rechecks the current platform role.
export async function GetAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const [profileResult, roleResult] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', data.user.id).single(),
    supabase.rpc('current_platform_role'),
  ]);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (roleResult.error) throw new Error(roleResult.error.message);
  return { ...data.user, profile: profileResult.data, role: roleResult.data ?? 'user' };
}

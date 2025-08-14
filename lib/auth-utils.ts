import { UserResponse } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';

import { createClient } from '@/lib/supabase/server';

type UserRole = 'user' | 'admin';

type AuthUser = UserResponse['data']['user'] & {
  profile: {
    username: string;
  };
  role: UserRole;
};

export async function GetAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return null;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    throw new Error(sessionError ? sessionError.message : 'Cannot get session');
  }
  const jwt = jwtDecode<{ user_role: UserRole }>(sessionData.session.access_token);
  if (!jwt?.user_role) throw new Error('No user_role in authentication ensure the hook is enabled');
  const role = jwt.user_role;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
  if (profileError || !profile?.username) {
    throw new Error(profileError ? profileError.message : 'Error getting profile');
  }

  return { ...data.user, profile, role: role };
}

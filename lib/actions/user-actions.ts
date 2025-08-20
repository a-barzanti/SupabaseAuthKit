import { createAdminClient } from '@/lib/supabase/admin';
import { UserData } from '@/components/user-list';

// This is a server action for user management.
export async function createUser(formData: FormData): Promise<{ data?: UserData; error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as 'user' | 'admin';

  const supabaseAdmin = createAdminClient();

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        user_role: role,
      },
    });

    if (error) {
      console.error('Error creating user:', error);
      return { error: error.message };
    }

    if (!data.user) {
      return { error: 'User data not returned after creation.' };
    }

    // Supabase admin.createUser does not return username, so we default to null
    const newUser: UserData = {
      id: data.user.id,
      email: data.user.email || '',
      role: (data.user.app_metadata.user_role as 'user' | 'admin') || 'user',
      username: null, // Admin created users do not have a username by default
    };

    return { data: newUser };
  } catch (e) {
    console.error('Caught exception during user creation:', e);
    return { error: 'An unexpected error occurred during user creation.' };
  }
}

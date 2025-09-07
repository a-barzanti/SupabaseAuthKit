import { createClient } from '@/lib/supabase/server';
import { UserList } from '@/components/user-list';
import { UserData } from '@/lib/types';

export default async function UserManagementPage() {
  const supabase = await createClient();
  const { data: users, error } = await supabase.rpc('get_all_auth_users');

  if (error) {
    console.error('Error fetching users:', error);
    return <p>Error loading users.</p>;
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <h2 className="font-bold text-2xl mb-4">User Management</h2>
      <UserList initialUsers={users as UserData[]} />
    </div>
  );
}

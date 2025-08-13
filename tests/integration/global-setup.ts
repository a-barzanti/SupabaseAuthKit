import { execa } from 'execa';
import { createClient } from '@supabase/supabase-js';

export default async function globalSetup() {
  // 1) Run the pnpm db reset script
  await execa('pnpm', ['supabase:dbreset'], { stdio: 'inherit' });

  // Create demo users with service role
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
  );

  const demoUsers = [
    { email: 'admin@example.com', password: 'Passw0rd!' },
    { email: 'alice@example.com', password: 'Passw0rd!' },
    { email: 'bob@example.com', password: 'Passw0rd!' },
  ];

  for (const u of demoUsers) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`✅ Created ${u.email} (${data.user?.id})`);
  }

  // Promote admin user to admin role
  const { data: adminUser } = await admin.auth.admin.listUsers();
  const adminUserData = adminUser.users.find((user) => user.email === 'admin@example.com');

  if (adminUserData) {
    const { error: grantError } = await admin.rpc('grant_role', {
      p_user_id: adminUserData.id,
      p_role: 'admin',
      skip_auth_check: true,
    });

    if (grantError) {
      console.error('❌ Failed to grant admin role:', grantError);
      throw grantError;
    }

    console.log(`✅ Promoted admin@example.com to admin role`);
  } else {
    console.error('❌ Admin user not found');
  }
}

#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

async function setupTestUsers() {
  // Get anon key from environment (client-side key)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error(
      '❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables',
    );
    console.error('Make sure to set these in your environment');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
    },
  });

  const demoUsers = [
    { email: 'admin@example.com', password: 'Passw0rd!', role: 'admin' },
    { email: 'alice@example.com', password: 'Passw0rd!', role: 'user' },
    { email: 'bob@example.com', password: 'Passw0rd!', role: 'user' },
  ];

  console.log('🚀 Setting up test users...');

  for (const u of demoUsers) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: u.email,
        password: u.password,
        options: {
          data: {
            intended_role: u.role,
          },
        },
      });

      if (error) throw error;
      console.log(`✅ Created ${u.email} as ${u.role} (${data.user?.id})`);
    } catch (error) {
      console.error(`❌ Failed to create ${u.email}:`, error.message);
    }
  }

  console.log('🎉 Test users setup complete!');
  console.log('ℹ️  Note: Users will need to confirm their email addresses before they can sign in');
}

setupTestUsers().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

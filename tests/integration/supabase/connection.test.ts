import { createClient } from '@/lib/supabase/client';

it('connects to the API while anonymous profile access is denied', async () => {
  const { data, error } = await createClient().from('profiles').select('*').limit(1);
  expect(data).toBeNull();
  expect(error?.code).toBe('42501');
});

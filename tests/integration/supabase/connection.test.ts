import { createClient } from '@/lib/supabase/client';

describe('Supabase connection', () => {
  const supabase = createClient();

  it('should connect to Supabase and select from profiles', async () => {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});

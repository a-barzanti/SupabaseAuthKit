'use client';

import { useState, type ComponentProps } from 'react';

import { createClient } from '@/lib/supabase/client';
import { OrganizationWorkspace } from '@/skills/supabase-authkit/assets/ui/organization-workspace';

export function Workspace(props: Omit<ComponentProps<typeof OrganizationWorkspace>, 'client'>) {
  const [client] = useState(createClient);
  return <OrganizationWorkspace {...props} client={client} />;
}

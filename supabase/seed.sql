-- Seed the admin permissions
insert into public.role_permissions (role, permission) values
  ('admin', 'profiles.view'),
  ('admin', 'profiles.update'),
  ('admin', 'profiles.delete');

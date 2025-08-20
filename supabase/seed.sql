-- Seed the admin permissions
insert into public.role_permissions (role, permission) values
  ('admin', 'users.view'),
  ('admin', 'users.update'),
  ('admin', 'users.delete')
/**
 * TRIGGERS
 */

-- Create user profile and assign default role on user creation
create or replace function public.handle_new_user()
returns trigger
as $$
declare
  default_role public.app_role := 'user';
begin
  -- Insert into profiles
  insert into public.profiles (id, username)
    values (new.id, split_part(new.email, '@', 1));  -- username = email prefix

  -- Assign default role
  insert into public.user_roles (user_id, role)
    values (new.id, default_role);

  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

/**
 * TRIGGERS
 */

-- Create user profile and assign role on user creation
create or replace function public.handle_new_user()
returns trigger
as $$
declare
  assigned_role public.app_role;
  intended_role text;
begin
  -- Check if user has an intended role from signup metadata
  intended_role := (new.raw_user_meta_data->>'intended_role')::text;

  -- Assign role: use intended role if valid, otherwise default to 'user'
  if intended_role in ('admin', 'user') then
    assigned_role := intended_role::public.app_role;
  else
    assigned_role := 'user'::public.app_role;
  end if;

  -- Insert into profiles
  insert into public.profiles (id, username)
    values (new.id, split_part(new.email, '@', 1));  -- username = email prefix

  -- Assign role
  insert into public.user_roles (user_id, role)
    values (new.id, assigned_role);

  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

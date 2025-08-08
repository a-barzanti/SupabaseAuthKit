/**
 * HELPER FUNCTIONS
 */

create or replace function public.grant_role(
  p_user_id uuid,
  p_role public.app_role,
  skip_auth_check boolean default false
)
returns public.app_role
as $$
begin
  if not skip_auth_check then
    if not authorize('profiles.update') then
      raise exception 'You do not have permission to grant roles';
    end if;
  end if;

  update public.user_roles
  set role = p_role
  where user_id = p_user_id;

  if not found then
    raise exception 'User % does not have an existing role to update', p_user_id;
  end if;

  -- Set jwtValid to false in profiles table
  update public.profiles
  set jwt_valid = false
  where id = p_user_id;

  return p_role;
end;
$$ language plpgsql security definer set search_path = '';

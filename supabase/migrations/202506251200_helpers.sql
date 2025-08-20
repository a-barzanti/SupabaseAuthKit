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
    if not authorize('users.update') then
      raise exception 'You do not have permission to grant roles';
    end if;
  end if;

  update public.user_roles
  set role = p_role
  where user_id = p_user_id;

  if not found then
    raise exception 'User % does not have an existing role to update', p_user_id;
  end if;

  return p_role;
end;
$$ language plpgsql security definer set search_path = '';

create or replace function public.get_all_auth_users() returns table (
  id uuid,
  email text,
  role text,
  username text
) as $$
declare
  user_role text;
begin
  if not authorize('users.view') then
    raise exception 'Access denied. You do not have permission to view users.';
  end if;

  return query
  select
    au.id,
    au.email::text,
    ur.role::text,
    p.username
  from
    auth.users as au
  left join public.profiles as p
    on au.id = p.id
  left join public.user_roles as ur
    on au.id = ur.user_id;
end;
$$ language plpgsql security definer;

grant execute on function public.get_all_auth_users() to authenticated;

create or replace function public.update_user(
  user_id_in uuid,
  new_email_in text default null,
  new_password_in text default null,
  new_role_in public.app_role default null,
  new_username_in text default null
) returns void as $$
declare
  current_user_role text;
begin
  if not authorize('users.update') then
    raise exception 'Access denied. You do not have permission to update users.';
  end if;

  -- Update email if provided
  if new_email_in is not null then
    update auth.users
    set email = new_email_in
    where id = user_id_in;
  end if;

  -- Update password if provided
  if new_password_in is not null then
    update auth.users
    set encrypted_password = crypt(new_password_in, gen_salt('bf'))
    where id = user_id_in;
  end if;

  -- Update role if provided
  if new_role_in is not null then
    select role
    into current_user_role
    from public.user_roles
    where user_id = user_id_in;

    if current_user_role = 'admin' and new_role_in != 'admin' then
      if (select count(*) from public.user_roles where role = 'admin') = 1 then
        raise exception 'Cannot change the role of the last admin user.';
      end if;
    end if;

    update public.user_roles
    set role = new_role_in
    where user_id = user_id_in;
  end if;

  -- Update username if provided
  if new_username_in is not null then
    update public.profiles
    set username = new_username_in
    where id = user_id_in;
  end if;
end;
$$ language plpgsql security definer;

grant execute on function public.update_user(uuid, text, text, public.app_role, text) to authenticated;

create or replace function public.delete_user(
  user_id_in uuid
) returns void as $$
declare
  user_role text;
begin
  if not authorize('users.delete') then
    raise exception 'Access denied. You do not have permission to delete users.';
  end if;

  -- Get the user's role before deletion
  select role
  into user_role
  from public.user_roles
  where user_id = user_id_in;

  -- Check if the user is an admin and if there are other admins
  if user_role = 'admin' then
    if (select count(*) from public.user_roles where role = 'admin') = 1 then
      raise exception 'Cannot delete the last admin user.';
    end if;
  end if;

  -- Delete from public.profiles table (cascades from auth.users)
  delete from auth.users where id = user_id_in;
end;
$$ language plpgsql security definer;

grant execute on function public.delete_user(uuid) to authenticated;

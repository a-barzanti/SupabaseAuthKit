-- UPGRADE ONLY: the original SupabaseAuthKit global-role schema must exist.
-- Never install the old starter migrations in an unrelated application.
begin;
-- Preserve role data, but never trust caller-controlled signup metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, username) values (new.id, split_part(new.email, '@', 1));
  insert into public.user_roles(user_id, role) values (new.id, 'user');
  return new;
end;
$$;
create or replace function public.authorize(requested_permission public.app_permission)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r join public.role_permissions p on p.role = r.role
    where r.user_id = (select auth.uid()) and p.permission = requested_permission);
$$;
-- Remove the dangerous signature entirely, including its default argument.
drop function public.grant_role(uuid, public.app_role, boolean);
create function public.grant_role(p_user_id uuid, p_role public.app_role)
returns public.app_role language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize changes; write current admin rows so repeatable-read callers
  -- get a serialization failure rather than using a stale admin count.
  lock table public.user_roles in share row exclusive mode;
  update public.user_roles set role = role where role = 'admin';
  if not public.authorize('users.update') then
    raise exception 'You do not have permission to grant roles' using errcode = '42501';
  end if;
  if p_role <> 'admin' and exists (select 1 from public.user_roles where user_id = p_user_id and role = 'admin')
    and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'Cannot demote the last platform admin' using errcode = '23514';
  end if;
  update public.user_roles set role = p_role where user_id = p_user_id;
  if not found then raise exception 'User does not have an existing role' using errcode = 'P0002'; end if;
  return p_role;
end;
$$;
-- Keep role/profile editing. Identity administration belongs to the Auth Admin
-- API in trusted server code, not direct writes to auth.users from browser RPCs.
create or replace function public.update_user(user_id_in uuid, new_email_in text default null,
  new_password_in text default null, new_role_in public.app_role default null, new_username_in text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  lock table public.user_roles in share row exclusive mode;
  if not public.authorize('users.update') then raise exception 'Permission denied' using errcode = '42501'; end if;
  if new_email_in is not null or new_password_in is not null then
    raise exception 'Use the server-side Auth Admin API for identity changes' using errcode = '42501';
  end if;
  if new_role_in is not null then perform public.grant_role(user_id_in, new_role_in); end if;
  if new_username_in is not null then update public.profiles set username = new_username_in where id = user_id_in; end if;
end;
$$;
create or replace function public.delete_user(user_id_in uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Use the server-side Auth Admin API after resolving organization memberships' using errcode = '42501';
end;
$$;
alter function public.get_all_auth_users() set search_path = '';
revoke all on function public.handle_new_user(), public.delete_user(uuid), public.authorize(public.app_permission),
  public.grant_role(uuid, public.app_role), public.get_all_auth_users(),
  public.update_user(uuid, text, text, public.app_role, text) from public, anon, authenticated;
grant execute on function public.authorize(public.app_permission), public.grant_role(uuid, public.app_role),
  public.get_all_auth_users(), public.update_user(uuid, text, text, public.app_role, text) to authenticated;
revoke all on public.user_roles, public.role_permissions from public, anon, authenticated, supabase_auth_admin;
grant select on public.user_roles to supabase_auth_admin;
alter table public.role_permissions enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update(username) on public.profiles to authenticated;
create function public.current_platform_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.user_roles where user_id = (select auth.uid());
$$;
revoke all on function public.current_platform_role() from public, anon, authenticated;
grant execute on function public.current_platform_role() to authenticated;
-- Install permission data on upgrades as well as fresh resets (seed is optional).
insert into public.role_permissions(role, permission) values
  ('admin', 'users.view'), ('admin', 'users.update'), ('admin', 'users.delete')
  on conflict do nothing;
commit;

-- SupabaseAuthKit 0.2.0. Authoritative portable migration; requires Supabase Auth.
-- Apply to a fresh Supabase schema or AFTER the legacy hardening migration.
begin;
create schema authkit_private;
revoke all on schema authkit_private from public, anon, authenticated;
grant usage on schema authkit_private to authenticated;

create type public.organization_role as enum ('owner', 'admin', 'member');
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  membership_version bigint not null default 0
);
create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_memberships_user_idx on public.organization_memberships(user_id, organization_id);

-- Example tenant data and a same-tenant parent/child relationship.
create table public.organization_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  unique (organization_id, id)
);
create table public.organization_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 200),
  foreign key (organization_id, project_id)
    references public.organization_projects(organization_id, id) on delete cascade
);
create index organization_tasks_project_idx on public.organization_tasks(organization_id, project_id);

create function authkit_private.organization_role(p_organization_id uuid)
returns public.organization_role language sql stable security definer set search_path = '' as $$
  select role from public.organization_memberships
  where organization_id = p_organization_id and user_id = (select auth.uid());
$$;

-- Every membership mutation writes the same parent row. Under READ COMMITTED,
-- waiting callers recheck live membership; stricter isolation gets a serialization
-- failure instead of a stale owner count. Also protects privileged direct SQL.
create function authkit_private.guard_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.organization_id, new.user_id) is distinct from (old.organization_id, old.user_id) then
    raise exception 'Membership identity is immutable' using errcode = '23514';
  end if;
  update public.organizations set membership_version = membership_version + 1
    where id = case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner' then
    if tg_op = 'DELETE' or new.role <> 'owner' then
      if not exists (select 1 from public.organization_memberships
        where organization_id = old.organization_id and role = 'owner' and user_id <> old.user_id) then
        raise exception 'Cannot remove or demote the last owner' using errcode = '23514';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
create trigger guard_membership before insert or update or delete on public.organization_memberships
  for each row execute function authkit_private.guard_membership();

create function public.create_organization(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  insert into public.organizations(name) values (btrim(p_name)) returning id into v_id;
  insert into public.organization_memberships(organization_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end;
$$;

create function public.add_organization_member(p_organization_id uuid, p_user_id uuid, p_role public.organization_role default 'member')
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor public.organization_role;
begin
  update public.organizations set membership_version = membership_version + 1 where id = p_organization_id;
  v_actor := authkit_private.organization_role(p_organization_id);
  if v_actor = 'owner' or (v_actor = 'admin' and p_role = 'member') then
    insert into public.organization_memberships(organization_id, user_id, role) values (p_organization_id, p_user_id, p_role);
  else
    raise exception 'Permission denied' using errcode = '42501';
  end if;
end;
$$;

create function public.set_organization_member_role(p_organization_id uuid, p_user_id uuid, p_role public.organization_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.organizations set membership_version = membership_version + 1 where id = p_organization_id;
  if authkit_private.organization_role(p_organization_id) is distinct from 'owner'::public.organization_role then
    raise exception 'Only owners can assign roles' using errcode = '42501';
  end if;
  update public.organization_memberships set role = p_role where organization_id = p_organization_id and user_id = p_user_id;
  if not found then raise exception 'Membership not found' using errcode = 'P0002'; end if;
end;
$$;

create function public.remove_organization_member(p_organization_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor public.organization_role; v_target public.organization_role;
begin
  update public.organizations set membership_version = membership_version + 1 where id = p_organization_id;
  v_actor := authkit_private.organization_role(p_organization_id);
  select role into v_target from public.organization_memberships where organization_id = p_organization_id and user_id = p_user_id;
  if v_actor is not null and (p_user_id = auth.uid() or v_actor = 'owner' or (v_actor = 'admin' and v_target = 'member')) then
    delete from public.organization_memberships where organization_id = p_organization_id and user_id = p_user_id;
    if not found then raise exception 'Membership not found' using errcode = 'P0002'; end if;
  else
    raise exception 'Permission denied' using errcode = '42501';
  end if;
end;
$$;

create function public.transfer_organization_ownership(p_organization_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.organizations set membership_version = membership_version + 1 where id = p_organization_id;
  if authkit_private.organization_role(p_organization_id) is distinct from 'owner'::public.organization_role then
    raise exception 'Only owners can transfer ownership' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then raise exception 'Choose a different member' using errcode = '23514'; end if;
  update public.organization_memberships set role = 'owner' where organization_id = p_organization_id and user_id = p_user_id;
  if not found then raise exception 'Membership not found' using errcode = 'P0002'; end if;
  update public.organization_memberships set role = 'admin' where organization_id = p_organization_id and user_id = auth.uid();
end;
$$;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_projects enable row level security;
alter table public.organization_tasks enable row level security;
create policy organizations_read on public.organizations for select to authenticated
  using (authkit_private.organization_role(id) is not null);
create policy memberships_read on public.organization_memberships for select to authenticated
  using (authkit_private.organization_role(organization_id) is not null);
create policy projects_read on public.organization_projects for select to authenticated
  using (authkit_private.organization_role(organization_id) is not null);
create policy projects_insert on public.organization_projects for insert to authenticated
  with check (authkit_private.organization_role(organization_id) in ('owner', 'admin'));
create policy projects_update on public.organization_projects for update to authenticated
  using (authkit_private.organization_role(organization_id) in ('owner', 'admin'))
  with check (authkit_private.organization_role(organization_id) in ('owner', 'admin'));
create policy projects_delete on public.organization_projects for delete to authenticated
  using (authkit_private.organization_role(organization_id) in ('owner', 'admin'));
create policy tasks_read on public.organization_tasks for select to authenticated
  using (authkit_private.organization_role(organization_id) is not null);
create policy tasks_insert on public.organization_tasks for insert to authenticated
  with check (authkit_private.organization_role(organization_id) in ('owner', 'admin'));
create policy tasks_update on public.organization_tasks for update to authenticated
  using (authkit_private.organization_role(organization_id) in ('owner', 'admin'))
  with check (authkit_private.organization_role(organization_id) in ('owner', 'admin'));
create policy tasks_delete on public.organization_tasks for delete to authenticated
  using (authkit_private.organization_role(organization_id) in ('owner', 'admin'));

revoke all on public.organizations, public.organization_memberships, public.organization_projects, public.organization_tasks from public, anon, authenticated;
grant select on public.organizations, public.organization_memberships to authenticated;
grant select, insert, delete on public.organization_projects, public.organization_tasks to authenticated;
-- A record cannot be moved, even by a user administering both tenants.
grant update (name) on public.organization_projects to authenticated;
grant update (title, project_id) on public.organization_tasks to authenticated;
revoke all on all functions in schema authkit_private from public, anon, authenticated;
grant execute on function authkit_private.organization_role(uuid) to authenticated;
revoke all on function public.create_organization(text),
  public.add_organization_member(uuid, uuid, public.organization_role),
  public.set_organization_member_role(uuid, uuid, public.organization_role),
  public.remove_organization_member(uuid, uuid), public.transfer_organization_ownership(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.create_organization(text),
  public.add_organization_member(uuid, uuid, public.organization_role),
  public.set_organization_member_role(uuid, uuid, public.organization_role),
  public.remove_organization_member(uuid, uuid), public.transfer_organization_ownership(uuid, uuid)
  to authenticated;
commit;

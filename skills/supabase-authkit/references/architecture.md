# Architecture and migration decisions

Kit version: **0.2.0**. The SQL files and authorization suite in this installed directory are authoritative. Copy migrations into the target's migration history with ordered timestamps after existing migrations. Keep a checksum or exact copy for review; never maintain separate handwritten variants without recording the difference.

## Identity, membership, permission

`auth.users` supplies identity. `organizations` supplies tenant identity. A membership has a composite primary key `(organization_id, user_id)` and one role: owner, admin or member. Users can hold different roles in different organizations. No organization authorization is read from signup metadata, a profile, global user role or a JWT role claim.

`create_organization` inserts the organization and creator's owner membership in one transaction. An account must already exist before an owner/admin can add it by UUID. The UI displays the current user's UUID; sharing it is the initial onboarding path. UUID entry does not verify consent; invitations and acceptance are deferred. Organization members can see fellow member UUIDs and roles, not a global email directory.

The two example tenant entities are projects and tasks. Each has `organization_id`. Tasks reference `(organization_id, project_id)` with a composite foreign key. Client update grants exclude tenant and identity columns. RLS checks live membership on reads and owner/admin role on writes. Parent deletion cascades to its same-tenant tasks. Indexes support membership and foreign-key lookups. This example is deliberately small; adapt names/content fields and extend tests for actual domain entities.

The private role lookup is a fixed-search-path, narrowly granted security-definer function to avoid recursive membership RLS. Keep `authkit_private` out of the exposed API schemas. It derives the caller from `auth.uid()` and never accepts a caller identity. Public mutation RPCs are granted only to `authenticated`, authorize internally, use qualified names and have empty search paths. Clients cannot directly mutate organizations or memberships. Supabase service credentials bypass RLS and belong only in trusted administration/fixtures, never in browser bundles or normal tenant request paths.

## Concurrency and revocation

Membership RPCs first update the parent's `membership_version`, then recheck the caller's current role. The membership trigger uses the same parent-row write to serialize direct privileged membership changes and rejects removal/demotion of the last owner. A write, rather than only an advisory lock, forces serialization failure under repeatable-read snapshots. Transactions spanning several organizations should acquire locks in organization-ID order and retry serialization/deadlock failures as appropriate. The shipped single-organization RPCs need no caller-supplied bypass flags.

Ownership transfer promotes an existing member, then demotes the caller to admin atomically; other owners remain. Organization deletion is not exposed. Auth-user deletion is restricted while any membership exists, including for service administrators. Resolve memberships/ownership before using the server-side Auth Admin API. Privileged database operators can bypass invariants and must use controlled maintenance procedures.

Revocation applies on the next database statement that sees the committed change; ordinary requests need no token refresh. Already-returned data cannot be recalled, and transactions/requests already in flight may finish under their earlier snapshot. Long transactions, cached pages, external storage, realtime subscriptions and background jobs need their own revocation review. JWT expiry/signout controls authentication lifetime; it does not replace membership checks. Re-fetch UI on navigation/mutation; never cache tenant data globally. Organization selection is untrusted application context.

## Installation paths

**Fresh integration (including existing Supabase Auth apps without this kit's old schema):** install only `assets/migrations/20260925090000_organizations.sql`. It depends on Supabase's `auth.users`, `auth.uid()`, `auth.jwt()`, `anon` and `authenticated`, not on profiles, legacy global roles, seed data, or a custom access-token hook. Preserve existing auth clients and auth triggers. Inspect object names/grants before applying.

**Upgrade from the original SupabaseAuthKit starter:** apply `20260925080000_legacy_hardening.sql`, then `20260925090000_organizations.sql`. Preserve the 2025 migrations as history. The hardening migration drops the three-argument `grant_role` entirely; there is no `skip_auth_check` overload. Signup always receives platform role `user`. Platform authorization reads `user_roles` at request time, not stale JWT claims. Auth-hook execution remains restricted to `supabase_auth_admin`, whose table grant is reduced to SELECT. No global roles are converted to memberships and no organizations are fabricated.

Existing `admin` rows are retained as **platform** administrators. Audit those rows before production upgrade: earlier signup metadata could have created untrusted admins. The migration cannot infer legitimate admins, so it does not delete or silently downgrade existing data. Assign the first legitimate platform admin with trusted SQL/Admin tooling, never signup metadata. Record that decision.

Platform listing and role/profile editing are retained. Browser RPC identity creation, email/password changes and account deletion are retired: the prior implementation trusted signup metadata or directly wrote internal Auth tables. Use the supported Auth Admin API from separately reviewed server administration when needed. The reference UI removes these unsafe controls. The optional legacy custom-token hook can remain for compatibility, but no authorization depends on its claim. Existing roles/profiles are not dropped.

Back up populated databases. Apply forward migrations, compare row counts, audit grants, run assertions in a disposable clone, and deploy the matching app changes. Do not replay the vulnerable historical state as a deployable intermediate version. This package supplies no automatic data backfill or destructive rollback.

## Supported customization

Customize route names, visual styles, labels, non-key content columns, and namespaced SQL identifiers when there is a collision. Rename identifiers consistently in SQL, UI queries, tests and the integration record. Existing business records require an explicit ownership mapping and backfill before adding NOT NULL tenant keys/RLS. Do not weaken role semantics, grants, ownership locking, foreign keys or revocation behavior as a cosmetic customization. Broader permission changes require a revised matrix and new adversarial tests.

## Release identity

A kit release uses a git tag `vMAJOR.MINOR.PATCH` matching `SKILL.md` metadata. Record the tag, immutable commit, asset hashes, applied migration filenames, customizations and verification results in a project-owned `authkit-installation.md`. Tags/releases are published separately; version 0.2.0 here identifies the implementation, not a claim that a remote release already exists. Consume upgrades as reviewed forward migrations; never overwrite applied migration history.

## Official references

- [Agent Skills specification](https://agentskills.io/specification)
- [Supabase RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database functions and execution privileges](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)

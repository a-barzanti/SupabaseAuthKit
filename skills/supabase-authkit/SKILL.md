---
name: supabase-authkit
description: Add Supabase email/password authentication, organization memberships, and database-enforced role permissions to Next.js App Router TypeScript applications, including integration assets and executable isolation tests.
metadata:
  version: "0.2.0"
---

# SupabaseAuthKit

Build one verified organization workflow: sign in, create organizations, switch between memberships, manage members, and authorize tenant data. This package targets Supabase + Next.js App Router + TypeScript. Portability across assistants does not imply support for other application frameworks.

## Workflow

1. Inspect the target's instructions, dependency lockfile, routes, authentication clients, schema, migration history, policies, function grants and tests. Identify naming conflicts with `organizations`, `organization_memberships`, `organization_projects`, `organization_tasks`, `organization_role` and `authkit_private`. Check existing signup/session behavior and whether any helper trusts user metadata or JWT roles. Do not apply migrations over conflicting objects.
2. Read [architecture](references/architecture.md) and the [permission matrix](references/permission-matrix.md). Record the installed kit version/commit, target versions, existing identity flow, migration path, naming adaptations and data backfill decisions in the consuming project. Ask only when scope or existing data ownership is ambiguous; never guess owners for existing records.
3. Select **fresh integration** or **legacy SupabaseAuthKit upgrade** as described in the architecture reference. Use the supplied SQL assets; keep migration history immutable. Review and test on an isolated local Supabase stack before applying to a populated database. Never reset a populated target as an installation step.
4. Follow [Next.js integration](references/nextjs-integration.md). Preserve existing working authentication. Adapt the supplied workspace and client/session examples. Keep administrative keys in trusted server/test environments. Use an ordinary user's client for application queries and RPCs.
5. Implement all operations in the permission matrix. Require live membership for each tenant operation. The active organization from URL, cookie or state is only context. Preserve atomic owner creation/transfer, the last-owner concurrency guard, immutable tenant IDs and same-tenant foreign keys. UI styles, route names and labels are customizable; these authorization properties are required.
6. Run [verification](references/verification.md): static package checks, direct API authorization assertions, concurrent ownership checks, target type/lint/build checks and the browser workflow. Extend the supplied tests for any customized tenant entities or permissions. Record actual results and environmental blockers; do not label skipped checks as passing.
7. Report changes, architecture decisions, exact checks/results, kit version and unresolved limitations. For evaluating integration quality, use [agent evaluations](references/agent-evaluations.md). Do not claim other assistants were validated without running them.

## Assets and boundaries

- [Organization migration](assets/migrations/20260925090000_organizations.sql): the standalone schema and RPCs.
- [Legacy hardening migration](assets/migrations/20260925080000_legacy_hardening.sql): only for the original global-role SupabaseAuthKit schema.
- [Workspace component](assets/ui/organization-workspace.tsx): reusable UI, independent of repository imports.
- [Authorization suite](assets/tests/authorization.mjs) and [runner](scripts/verify.mjs): dependency-free Bun scripts.

Local tooling is sufficient; an official Supabase MCP connection is an optional transport for inspecting or applying reviewed SQL, not a requirement. Invitations, billing, SSO, custom roles, other frontend frameworks, custom MCP servers, standalone installers and marketplace publishing are outside this slice.

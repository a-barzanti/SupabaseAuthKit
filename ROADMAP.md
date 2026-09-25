# SupabaseAuthKit roadmap

## v0.2.0 — portable skill and organization slice

- [x] Self-contained, discoverable `supabase-authkit` Agent Skill with reusable SQL, UI and tests.
- [x] Preserve the root Next.js reference app and email/password authentication.
- [x] Separate organizations, multiple memberships and owner/admin/member roles.
- [x] Organization creation/switching and minimal add-by-UUID member management.
- [x] Atomic ownership transfer and concurrency-safe last-owner protection.
- [x] Database-enforced tenant isolation, immutable tenant keys and same-tenant relationships.
- [x] Remove `grant_role` bypass and signup-metadata escalation; narrow privileged helper grants.
- [x] Separate retained platform roles from organization roles, with live database authorization.
- [x] Direct API allow/deny tests, unchanged-write checks and concurrent ownership tests.
- [x] Authoritative skill assets with migration synchronization/parity checks.
- [x] Fresh integration versus legacy upgrade guidance; version/commit recording convention.
- [x] Fresh/existing-auth agent evaluation specification.

## Validation and release follow-ups

- [ ] Run independent end-to-end integration evaluations in Codex, Claude Code, Cursor and GitHub Copilot.
- [ ] Automate disposable database and browser smoke checks in CI.
- [ ] Publish a reviewed v0.2.0 release/tag and validate remote Skills CLI installation.
- [ ] Broaden framework/version coverage only after executable validation.

## Explicitly deferred

- Invitations/acceptance, billing/Stripe, SSO and additional OAuth flows.
- Custom roles and configurable permission builders.
- Other frontend frameworks and Next.js 16 integration.
- Organization rename/delete lifecycle, richer tasks UI and audit logs.
- New platform identity administration UI (use trusted Auth Admin tooling).
- Custom MCP server, standalone installer and marketplace publishing.
- Storage/realtime/background-job authorization examples and production deployment templates.

The original v0.1 starter's global RBAC and authentication history remain in migrations. They are not the fresh-install path for the portable skill.

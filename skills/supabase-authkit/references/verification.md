# Verification

## Prerequisites

Use Bun 1.3.13+, Docker with the Supabase CLI, and an isolated **loopback** local Supabase stack with Auth and PostgREST. Apply the selected migrations first. Legacy-mode tests require no pre-existing platform admins, so the fixture can exercise last-admin protection; use a disposable clone dedicated to this suite. Run database suites sequentially, without concurrent fixture writers. The tests never apply migrations or reset databases automatically. Use `psql` with a privileged local test connection, or `docker exec` into that stack's database container. `AUTHKIT_TEST_DISPOSABLE=1` explicitly marks the stack as disposable; this is not a production test runner.

From the installed skill directory:

```sh
bun scripts/verify.mjs --static
```

For runtime checks, set environment variables from the isolated stack's local `supabase status -o env` output (do not commit or print secrets in reports):

```sh
export AUTHKIT_SUPABASE_URL=http://127.0.0.1:54321
export AUTHKIT_ANON_KEY='<local ANON_KEY>'
export AUTHKIT_SERVICE_ROLE_KEY='<local SERVICE_ROLE_KEY>'
export AUTHKIT_DB_CONTAINER='supabase_db_<local-project-id>'
# Alternative to the container: AUTHKIT_DATABASE_URL='<local DB_URL>' with psql on PATH
export AUTHKIT_TEST_DISPOSABLE=1
bun scripts/verify.mjs
```

Set `AUTHKIT_LEGACY=1` **only** when verifying the original starter upgrade, to add bypass, metadata escalation and stale-platform-claim regression checks. Fresh installations omit it. All scripts resolve assets relative to their own location and work outside this repository.

Exit 0 means all requested assertions passed. Nonzero means missing prerequisites, an assertion failure, transport failure or cleanup failure. Static-only success is not runtime verification. Save the command, version, fixture mode and final count in the integration report.

## What runs

The dependency-free Bun suite creates unique temporary Auth identities through the Admin API, signs them in via password authentication, and calls REST/RPC endpoints using each user's JWT or the anon key. Privileged credentials are used only for fixture creation, before/after snapshots and cleanup. Denied writes compare all tenant tables (and legacy roles when enabled), not merely HTTP errors. Allowed writes/read results are asserted too.

Coverage includes atomic organization creation; multiple memberships; A-admin/B-member boundaries; direct cross-tenant CRUD for both entities; immutable tenant IDs; cross-tenant foreign keys; membership direct-write denial; self-promotion and privileged assignment; owner transfer/removal; revocation with the same JWT; anonymous table/RPC access; and the legacy `grant_role` bypass when applicable.

Separate SQL processes run as `authenticated` with representative `request.jwt.claims`. A barrier holds the first transaction open until `pg_stat_activity` confirms the second is waiting on its lock, then commits the first. This proves real overlap for removal, demotion and transfer without relying on a fixed sleep. Both READ COMMITTED and REPEATABLE READ are covered. The test validates remaining owners and rejects two successful conflicting changes. SQL sessions have statement timeouts.

Fixture cleanup uses generated UUIDs only. It transaction-locally disables triggers via `session_replication_role` to delete test organizations' last owners, then deletes generated Auth users. This bypass exists only in the privileged test connection, never as an application RPC. If the process is killed, discard the isolated stack; there is no automatic production recovery mechanism.

## Application verification

Run the consuming application's typecheck, lint, unit/integration tests and production build. Browse login/signup/recovery and the protected workspace: create two organizations, add a second existing account, assign different roles, switch, edit projects, remove a member, then revisit the old URL with that member's still-valid session. Verify no cross-tenant content appears and errors remain actionable. Test logout and session refresh cookie propagation. A passing SQL/API suite alone does not validate rendering, mail delivery, middleware or assistant behavior.

Use the [agent evaluation scenarios](agent-evaluations.md) for fresh and existing applications. Record results separately from runtime assertions.

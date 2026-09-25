# Verification — 2026-09-25

All database work used an isolated, disposable local Supabase project (`authkit-pivot-verify`) in a temporary working directory. No linked/hosted database or repository-local user data was reset or migrated. Fixture users and organizations were cleaned up. The temporary stack was stopped after verification.

## Bun migration

The current package manager and JavaScript runtime are **Bun 1.3.13**. The original pivot baseline below records its earlier Node/pnpm environment; it is historical evidence, not the current setup requirement.

| Check | Result |
| --- | --- |
| Clean `bun install --frozen-lockfile` | Pass; migrated dependency versions preserved |
| Separate clean install with Node absent from `PATH` | Pass, including trusted install scripts and Supabase CLI execution |
| `bun run node -p 'process.versions.bun'` | `1.3.13`: Node-shebang executables resolve to Bun |
| `bun run typecheck`, `bun run lint`, `bun run skill:check` | Pass |
| `bun run test` | All 9 tests pass across 3 files |
| `bun run test:integration` | All 18 tests pass across 4 files; fixture cleanup leaves no test accounts |
| `AUTHKIT_LEGACY=1 bun run test:authorization` | All 86 authorization checks pass |
| `bun run build` | Pass: production compilation, type validation and page generation |
| `bun run start` + `bun run test:e2e` | Full organization workflow passes against the production app; listening process confirmed as Bun |
| `bunx --bun skills add . --list` | Exactly one discoverable skill, `supabase-authkit` |
| Copied skill outside the repository | Static checks pass with Bun; missing runtime prerequisites correctly exit 1 |

The sequential integration pool reuses a single Bun worker: without this setting, Bun 1.3.13/Vitest 3.2.4 exited after the first file and skipped fixture teardown. The browser test now waits for the logout server action's redirect before requesting a protected page, avoiding cancellation of the pending logout. Both complete suites passed after those adjustments. The standalone 71-check fresh-install and populated-upgrade scenarios below were not repeated for the runtime-only migration; their SQL is unchanged.

## Original pivot baseline

### Environment

- macOS arm64, Node.js 22.23.2, pnpm 11.5.0.
- Next.js 15.5.26, React 19.2.4, TypeScript 5.8.3.
- `@supabase/ssr` 0.6.1, `@supabase/supabase-js` 2.50.4, Supabase CLI 2.33.7.
- Supabase Postgres image `15.8.1.085`, Auth `v2.177.0`, PostgREST `v12.2.12`.
- Playwright 1.53.2 using an existing Chromium 149 executable through `AUTHKIT_CHROMIUM_PATH`.

### Results

| Check | Result |
| --- | --- |
| Skill-authoring `quick_validate.py` | Pass |
| `npx --yes skills add . --list` | Pass: exactly one discoverable skill, `supabase-authkit` |
| `pnpm skill:check` | Pass: migration parity, required assets, portable relative links |
| Copy installed skill outside the repository and run its static checks | Pass |
| Missing runtime prerequisites | Correctly fails with exit code 1 and a descriptive message |
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass |
| `pnpm test` | 9 tests pass (including middleware cookies and confirmation redirects) |
| Vitest integration configuration, environment injected from isolated local stack status | 18 tests pass |
| Portable authorization runner, `AUTHKIT_LEGACY=1` | **86 checks pass** |
| Fresh database, only organization migration, no profiles/global-role tables or auth hook; runner from the copied installed skill | **71 checks pass** |
| Legacy upgrade with existing admin/profile fixture | Pass: preserved role/profile; no invented memberships |
| Direct catalog inspection of privileged functions | Pass: fixed search paths; anonymous execute denied; hook/trigger functions unavailable to ordinary clients |
| Browser organization workflow (`tests/e2e/organizations.mjs`) | Pass |
| `pnpm build` | Pass: production compilation, lint/type validation and page generation |
| `git diff --check` | Pass |

The authorization counts include real password-authenticated user JWTs, anon API calls, unchanged-data snapshots for denied writes, direct RPCs, and separate SQL sessions impersonating representative `authenticated` identities. Ownership races hold the first transaction open until PostgreSQL confirms the second is waiting on a lock. Both READ COMMITTED and REPEATABLE READ behavior were exercised. Legacy checks include the removed bypass signature, public signup metadata escalation, live platform-role revocation, auth-hook grants and last-platform-admin protection.

The browser test covered unauthenticated redirect, login, creating two organizations, adding the same user as admin/member, switching between roles, tenant content visibility, project creation, ownership transfer, removal, rejected stale organization selection and logout. Unit tests cover refreshed-cookie propagation and allowlisted confirmation redirects. The signup escalation regression also calls the real public Auth signup endpoint.

Docker was initially stopped and was started for the isolated stack. Initial image downloads completed. One CLI reset reported a transient gateway 502 while services restarted; database state and service health were inspected before proceeding. The populated-upgrade assertions and subsequent complete suites passed. A browser selector issue was corrected, then the workflow passed. An intermediate last-admin assertion correctly failed while a separate upgrade fixture admin still existed; that fixture was inspected/removed and the final suite now checks this prerequisite explicitly. No failed check remains outstanding.

The production build emits a non-fatal warning about the existing Browserslist dataset's age. No source-generation or application build error remains.

## Not claimed

- Cross-assistant end-to-end evaluations have **not** been run. The package includes their specification; discovery alone is not behavioral validation.
- No hosted deployment, release/tag, remote installation or marketplace publication was performed.
- Real email delivery, production confirmation/recovery configuration, session expiry over time, storage, realtime subscriptions and background jobs were not end-to-end tested.
- This is the supported Next.js 15/Supabase slice; other frameworks and Next.js 16 are unverified.
- Existing production platform-admin assignments still require an operator audit: historical signup metadata could have granted them. The upgrade intentionally preserves data rather than guessing which existing admins are legitimate.

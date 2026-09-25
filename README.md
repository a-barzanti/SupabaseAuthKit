# SupabaseAuthKit

A portable **Agent Skill** that helps coding assistants add Supabase authentication, organization-based multi-tenancy and role-based permissions to a Next.js application. This repository also contains the working reference application.

The kit ships concise agent instructions, reusable SQL migrations, a workspace UI, a permission matrix, and executable API/concurrency tests. It guides an assistant through inspecting an application, integrating the model and reporting verified results. It is not an installer or an authentication service.

## Support

**Application stack:** Supabase Auth/Postgres + Next.js 15 App Router + TypeScript. Email/password signup, login, confirmation, recovery and logout are the existing supported auth flow. The reference lockfile pins Next.js **15.5.26**, React **19.2.4**, TypeScript **5.8.3**, `@supabase/ssr` **0.6.1**, `@supabase/supabase-js` **2.50.4**, and Supabase CLI **2.33.7**. Use Node.js 22+ and pnpm (verified with Node.js 22.23.2 and pnpm 11.5.0). See [verification results](docs/verification-results.md) for executed checks and limits.

**Assistant compatibility:** the package follows the [open Agent Skills specification](https://agentskills.io/specification) and targets Codex, Claude Code, Cursor and GitHub Copilot. Their discovery locations differ. Portable content is not a claim of tested integration behavior in every assistant; cross-assistant evaluations remain unrun. Other frontend frameworks and Next.js 16 are outside the validated application scope.

## Install and invoke

The discoverable skill is [skills/supabase-authkit/SKILL.md](skills/supabase-authkit/SKILL.md). Using the external [Skills CLI](https://github.com/vercel-labs/skills):

```sh
npx skills add a-barzanti/SupabaseAuthKit --skill supabase-authkit
```

That remote command becomes usable for this version after these files are published to the repository. To install the current checkout before publication, run `npx skills add . --skill supabase-authkit` from this repository, or copy the **entire** `skills/supabase-authkit` directory into your target application's discovery directory:

| Assistant | Project skill directory | Explicit invocation |
| --- | --- | --- |
| [Codex](https://learn.chatgpt.com/docs/build-skills) | `.agents/skills/supabase-authkit/` | `$supabase-authkit` followed by your task |
| [Claude Code](https://code.claude.com/docs/en/skills) | `.claude/skills/supabase-authkit/` | `/supabase-authkit` followed by your task |
| [Cursor](https://cursor.com/docs/skills) | `.cursor/skills/supabase-authkit/` | Select the skill in Agent, or explicitly ask to use it |
| [GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills) | `.github/skills/supabase-authkit/` | Explicitly ask to use the `supabase-authkit` skill in a skills-capable agent |

Example request: “Use the supabase-authkit skill to add organizations and scoped permissions to this Next.js App Router application. Preserve its existing authentication and data. Implement the supplied permission matrix, run the checks and record the kit version.” If native discovery is unavailable, ask the assistant to read the installed `SKILL.md` explicitly. No vendor-specific tool is required. Local Supabase CLI tooling is sufficient; the official Supabase MCP server is optional.

## Model

Identity lives in `auth.users`. Membership is the unique organization/user pair, with role **owner**, **admin** or **member**. Creating an organization atomically makes its creator an owner. The active organization in a URL is only UI context; PostgreSQL checks current membership on every tenant operation.

Owners manage roles and ownership. Admins manage ordinary members. All members read tenant projects/tasks; owners/admins write them. Tenant IDs cannot be moved by clients, and composite foreign keys prevent cross-tenant relationships. Membership changes serialize on the organization row, protecting the last owner even during concurrent removal/demotion. Ownership transfer promotes an existing member and demotes the caller atomically.

See the complete [permission matrix](skills/supabase-authkit/references/permission-matrix.md), [architecture and upgrade decisions](skills/supabase-authkit/references/architecture.md), and [Next.js integration guide](skills/supabase-authkit/references/nextjs-integration.md). Revocation uses current database membership without requiring JWT refresh; already-returned data and in-flight transactions are not recalled. Platform roles retained from the original starter are a separate authority and grant no tenant access.

## Reference application

The application stays at the repository root. `/protected` demonstrates organization creation, switching, adding existing users by UUID, role assignment, membership removal, ownership transfer and project CRUD. `/admin/users` retains platform role/profile editing for existing platform administrators. No service credential is required by the application.

```sh
pnpm install --frozen-lockfile
pnpm supabase:start
cp .env.example .env.local
# Populate the URL and public anon key from: pnpm exec supabase status
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Sign up with two accounts (use separate browser profiles), create an organization, and add the second user's UUID shown in their workspace. Add that user to another organization with a different role to exercise switching. Local email confirmation is disabled in the supplied Supabase configuration; configure redirects and email templates before enabling confirmation in production. The app uses the cookie refresh middleware and verifies identity server-side.

The first startup applies all migrations. For an existing **local** database use `pnpm exec supabase migration up --local` after reviewing/backing up its data. `pnpm supabase:dbreset` destroys local data and is only for disposable development stacks. Never run a reset to upgrade a populated database.

## Assets and verification

`skills/supabase-authkit/assets/migrations` is authoritative. The reference application's new migrations are exact copies; the historical 2025 migrations are unchanged. Tests and reusable workspace UI are consumed directly from the skill, avoiding duplicate sources.

```sh
pnpm skill:sync          # copy authoritative migrations to the reference app
pnpm skill:check         # assert parity, skill structure and portable links
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

For real authorization tests, start a disposable local Supabase stack and follow [verification prerequisites and environment variables](skills/supabase-authkit/references/verification.md), then run:

```sh
AUTHKIT_LEGACY=1 pnpm test:authorization   # original starter upgrade
# Fresh integrations omit AUTHKIT_LEGACY and install only the organization migration.
```

The suite uses real ordinary-user JWTs and anonymous REST/RPC calls, verifies denied writes leave data unchanged, tests stale claims/revocation, and coordinates concurrent SQL sessions for ownership checks. Service credentials are used only for fixture setup/inspection. It exits nonzero on failures or missing prerequisites. For existing integration tests, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `AUTHKIT_TEST_DISPOSABLE=1` in a gitignored `.env.test`, then run `pnpm test:integration`. The fixture setup refuses non-loopback endpoints, never resets a database, and removes only users it created.

The reference browser smoke test is `pnpm test:e2e` against a running reference app and the same disposable-stack `AUTHKIT_*` environment. Install its browser with `pnpm exec playwright install chromium`; set `AUTHKIT_APP_URL` if the app is not at `http://127.0.0.1:3000`. It requires `AUTHKIT_DB_CONTAINER` for fixture cleanup. An existing Chromium executable can be selected with `AUTHKIT_CHROMIUM_PATH`.

The [agent evaluation specification](skills/supabase-authkit/references/agent-evaluations.md) defines separate fresh-application and existing-auth scenarios. Run each assistant independently before advertising cross-assistant validation.

## Upgrade and release considerations

Fresh consuming apps install only the organization migration. Original starter upgrades also install the preceding legacy hardening migration. The latter removes the `skip_auth_check` signature, stops signup metadata assigning `admin`, narrows privileged helper grants and reads platform permissions from current database roles. Existing global roles remain unchanged; audit existing admins because the historical signup behavior was unsafe. No implicit conversion to organizations or guessed data ownership occurs.

Unsafe browser-based identity administration is retired: use self-registration for new users, and trusted server-side Supabase Auth Admin APIs for administrative email/password/account changes. Account deletion is blocked while organization memberships remain. Platform role/profile editing is retained. The legacy JWT hook is optional for authorization; the reference configuration retains it for compatibility/regression testing.

Kit version **0.2.0** is recorded in skill metadata. Releases will use matching `vMAJOR.MINOR.PATCH` git tags; consuming projects record the immutable commit, asset hashes, migration names, customizations and results in `authkit-installation.md`. This change does not publish a release or marketplace entry. Review future upgrades as forward migrations.

Invitations, billing, SSO, custom roles, other frameworks, organization deletion/renaming, a custom MCP server and a standalone installer are deferred. The minimal add-by-UUID workflow assumes existing accounts; it does not implement invitations or acceptance. Storage, realtime and background-worker authorization need separate integration review.

[Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md) · [MIT license](LICENSE)

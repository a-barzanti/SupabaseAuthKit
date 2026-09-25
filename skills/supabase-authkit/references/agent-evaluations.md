# Agent evaluation specification

These are runnable evaluation scenarios, not claims of completed cross-assistant validation. Run each assistant separately in a fresh checkout/workspace with only this installed skill and the scenario's application. Record assistant/version, kit commit, application versions, elapsed work, transcript/artifact paths, test commands and actual outcomes.

## A: fresh Next.js application

Create a TypeScript Next.js 15 App Router app and a new local Supabase project; supply loopback credentials and authorization to modify only this disposable project. Install this directory in that assistant's skill discovery location.

Prompt: “Use the supabase-authkit skill to add email/password authentication and organizations to this fresh Next.js App Router app. Implement the supplied permission model, organization switching and member management. Verify direct database access and record the kit version and decisions.”

Expected: the assistant inspects versions, installs only the organization migration, adds cookie-aware auth clients/middleware and auth pages, builds the workspace, uses no service keys in browser code, and runs the portable suite without legacy mode. No dependency on global-role tables or this repository's other files. Two users can complete the browser organization workflow. The output names unrun checks accurately.

## B: existing Supabase Auth application

Prepare a disposable Next.js App Router app with email/password login, confirmation callback, a custom profile table, existing users, and unrelated saved data. Capture schema/row-count snapshots and a passing login smoke test. Include one tenant-like table without organization keys so the assistant must ask for ownership mapping or explicitly leave it outside the slice instead of guessing. Do not provide permission to erase existing data.

Prompt: “Use the supabase-authkit skill to add organizations and scoped permissions to this existing application. Preserve its working authentication and saved data. Use the supplied example tenant entities first; do not assign existing business records to guessed owners. Run authorization tests and document the upgrade path.”

Expected: additive organization integration, preservation of existing auth/profile behavior and rows, no legacy migration unless the exact starter schema exists, no database reset, explicit conflict/customization decisions, successful suite and browser workflow. Repeat with a deliberate `organizations` naming collision: expect inspection and consistent namespacing or a scoped clarification, never blindly overwriting objects.

## Evaluator procedure and pass criteria

1. Give the agent the scenario and installed skill, not the repository implementation or an intended solution.
2. Inspect resulting migrations, policies, grants, credentials, membership logic and installation record against the matrix.
3. Run `bun <installed-skill>/scripts/verify.mjs` against the resulting isolated stack. Adapt identifiers in the copied suite only for documented renames. All assertions must pass; unchanged denied-write targets and concurrent-owner checks are mandatory.
4. Run the target's type/lint/test/build checks, then the browser workflow from the verification reference. Compare pre/post data snapshots for scenario B.
5. Report each scenario as pass/fail/blocked with evidence. Any bypass, lost data, missing required operation, missing packaged dependency or false test claim is a failure. Unavailable environment prerequisites mean blocked, never pass.

Run Codex, Claude Code, Cursor and GitHub Copilot independently before advertising tested assistant compatibility. Native discovery success alone is not integration validation.

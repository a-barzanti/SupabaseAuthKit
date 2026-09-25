# Contributing

The portable package lives in `skills/supabase-authkit`; the root app demonstrates it. Make authorization changes in the skill's SQL/tests first, update its matrix and integration guidance, then run `pnpm skill:sync` and `pnpm skill:check`. Do not edit deployed migration history; release upgrades need new forward migrations. The initial unreleased 0.2.0 assets are mirrored into `supabase/migrations` for the reference app.

Run typecheck, lint, unit tests, a build and the authorization suite against a disposable local Supabase stack. Follow the packaged verification reference for credentials, concurrency checks and cleanup. Existing integration tests also require an explicitly disposable local stack. Record actual output and blockers; do not call static-only checks authorization validation.

Keep the skill directory self-contained and independent of assistant-specific tool APIs. Document application support separately from assistant discovery. Extend the permission matrix and adversarial tests whenever an operation changes. Preserve identity/membership/permission separation and record data migration decisions instead of inferring owners.

Before releases, run the fresh/existing-application evaluation scenarios with the supported assistants, check asset parity, tag a version matching skill metadata, and publish immutable asset hashes. Never add test credentials, production data or service keys to commits.

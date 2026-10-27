# Verification contract

For each generated project, distinguish:

1. Static checks: config validation, file existence, secret scan and `git diff --check`.
2. Build check: `npm ci` and `npm run build`.
3. Browser checks: open the running app at phone width, perform the requested operations, refresh, and inspect persistence and errors.
4. Real-service checks: only after the user's own credentials and project exist. Verify Auth, RLS, Supabase writes, AI provider and deployment separately.

Never mark a path PASS merely because a route built or a button exists. Record what was actually tested. A local guest record is not cloud sync. A generic PWA offline shell is not a usable offline personal Today screen. Real iPhone Safari, standalone launch and reconnect replay need device acceptance; local browser simulation is not equivalent.

The independent Skill-invocation acceptance run and its caveats are recorded in [acceptance-2026-10-26.md](acceptance-2026-10-26.md). It is evidence for a four-module local Chinese project, not for every possible generated trip or optional real-service path.

The subsequent second-destination template backport test is recorded in [reuse-acceptance-2026-10-26.md](reuse-acceptance-2026-10-26.md). It verifies copied template files and local browser CRUD/backup behavior; it is not a second independent Codex Skill invocation.

Known original-project lessons to preserve: Magic Link/Gmail/Safari PKCE handoff was unreliable, so Email + Password plus SSR cookies was chosen; Journal local IDs are not database UUIDs; PostgreSQL GRANT and RLS are separate; the service worker must not cache personal HTML; AI freeform questions must outrank stale category intent. Do not silently reverse these boundaries when adapting the app.

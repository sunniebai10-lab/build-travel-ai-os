# Production-derived architecture

The asset is an adapted copy of the actual AI World Citizen OS Next.js 15/React 19 app, not a new minimal static demo. Key layers:

- `app/` routes: Today (`/`), Route (`/route`), full AI Guide (`/ai/companion`), Journal (`/journal`), Wallet (`/wallet`), activity detail and trip memory.
- `components/mobile-travel-os.tsx` owns the mobile Today/Route surface and Add Journey UI. `components/activity-ai-companion.tsx` is the full Guide; keep Home preview distinct from the full Guide.
- `lib/supabase/effective-itinerary.ts` merges public baseline and personal items. Public planned IDs remain stable; spontaneous entries use UUIDs. `lib/supabase/user-itinerary.ts` owns cloud writes, per-user offline queue and local snapshot. In the copied template only, absent Supabase uses a local guest record for itinerary creation.
- `lib/supabase/journal.ts` and `expenses.ts` keep their local fallback. `lib/user-input-store.ts` scopes local Journal/Wallet data to the trip.
- Browser/server Supabase clients use `@supabase/ssr`. Authenticated AI routes accept bearer or SSR cookie; do not bypass RLS or share keys.
- `public/sw.js` caches only generic shell assets. Failed navigations get `public/offline.html`; no authenticated HTML/API/Supabase response belongs in shared SW cache.

The copied assets intentionally exclude the original user's itinerary, credentials, orders and destination-specific photos. Generic fallback imagery is not evidence about the travel destination. The included SQL is a starting point requiring human review, not a managed migration tool.

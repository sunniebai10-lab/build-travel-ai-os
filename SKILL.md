---
name: build-travel-ai-os
description: Build a personalized travel OS from the AI World Citizen OS application. Use when a user asks Codex to create or adapt their own travel companion with Today, Route, AI Guide, Journal, Wallet, PWA, or offline travel workflows. Not for booking travel, giving unverified destination facts, or merely writing an itinerary.
---

# Build Travel AI OS

Use the production-derived Next.js app in `assets/ai-world-citizen-os/`. Do not replace it with a toy/static demo or edit the original AI World Citizen OS repository.

1. Ask for destination/cities, travel dates, preferred language and currency, desired modules, and whether local-only use is acceptable. Default to the five original modules and local-only use. Ask for accounts or paid services only when the requested capability requires them.
2. Check Node/npm and the destination directory. Write a trip JSON matching `references/trip-config.md`; do not invent specific bookings, attraction hours, prices, coordinates, or transport facts. An empty itinerary is valid. If coordinates are unknown, use 0/0 only as an explicit unset placeholder and do not present a map pin as verified.
3. Run `node <skill-root>/scripts/create-project.mjs --config <absolute-trip-json> <new-absolute-project-path>`. The target must not exist. Never generate inside the original app. The script copies the real app, makes a unique trip UUID and a SQL seed file; it does not provision cloud services.
4. Adapt module visibility, navigation and visible UI copy in the generated copy to the user's module and language choices. The bundled app includes all modules and mixed Chinese/English UI by default; changing the trip JSON alone does **not** remove modules or translate the interface. Verify every selected page and remove/hide unselected navigation entries consistently. Do not claim selection or localization is complete until checked in the running app.
5. Run `npm ci`, `npm run build`, then `npm run dev` in the generated project. Give the actual URL. Exercise the requested workflows in a browser at mobile width: itinerary create/reload, journal create/reload, expense create/reload, and any extra modules. Build success is not end-to-end success.
6. Clearly report the data mode. Without Supabase credentials, the bundled app uses local browser storage for personal entries; it does not sync across devices. Cloud use requires the user's own Supabase project and SQL review. AI without a provider key is explicitly unconfigured, not a factual guide. Map search is not a default capability.
7. For cloud or AI requests, follow `references/services.md`. Configure secrets only in ignored `.env.local`, never in source or `NEXT_PUBLIC_*` unless they are intended public browser values. Verify authentication, RLS, data persistence, and AI responses separately before saying they work.

Read `references/architecture.md` when changing data/auth/offline behavior and `references/verification.md` before reporting completion. Preserve the production-derived UUID, cookie auth, per-user queues, and service-worker privacy boundaries. Use the original app as a reference, not as the output destination.

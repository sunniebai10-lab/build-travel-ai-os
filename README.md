# Build Travel AI OS

A Codex Skill built from the AI World Citizen OS travel app, with a configurable copy of its real Next.js codebase. It is **not** a booking service or a source of verified destination facts.

## Requirements

- Codex with local project access
- Node.js 20 or newer and npm
- No paid API or cloud account for the local version
- Optional: your own Supabase project and AI provider credentials for cloud/AI features

## Install

Install the repository into the user-level skills directory:

```bash
mkdir -p ~/.agents/skills
git clone https://github.com/sunniebai10-lab/build-travel-ai-os.git ~/.agents/skills/build-travel-ai-os
```

Alternatively, place it at a project's `.agents/skills/build-travel-ai-os`; Codex also supports a symlink to a cloned folder. Open a new task and invoke `$build-travel-ai-os`; if it does not appear, restart Codex. This follows the [official Codex local skill locations](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills). A plain shell copy does not by itself prove that Codex loaded the Skill.

Example invocation:

> Use $build-travel-ai-os to make my own travel OS for a 5-day trip. I want Today, Route, Journal and Wallet, Chinese UI, JPY, local-only to start. I will provide dates and city names. Create it in a new folder, run it, and verify add/save/reload before reporting.

## Direct project creation

Codex normally collects requirements and runs the script. You can also start from `tests/fixtures/fictional-trip.json` as a schema example, edit a copy, then run:

```bash
node scripts/create-project.mjs --config /absolute/path/trip.json /absolute/path/new-travel-os
cd /absolute/path/new-travel-os
npm ci
npm run dev
```

The script rejects an existing target. It does not deploy, authenticate a user, install packages, or alter the source travel OS. `npm run build` checks the generated project. The generated `travel.config.json` and `supabase/seed-trip.sql` hold your trip configuration.

## Actual capability boundary

The [2026-10-26 acceptance record](references/acceptance-2026-10-26.md) documents one independent Skill invocation, subsequent browser checks, repairs, and limits. This is a tested local-use workflow, not proof that every user request, cloud integration, or device works automatically.

- The copied app includes Today, Route, AI Guide, Journal, Wallet, activity detail, Trip Memory, and PWA/offline infrastructure. The generator sets trip dates, cities, budget, currency, HTML language and initial itinerary. Module removal and translation of visible copy are Codex code-adaptation steps, not automatic config switches.
- Without Supabase, itinerary additions and journal/expense entries use local browser storage. Data stays on that browser and is not a cloud backup. Clearing site data or using another device loses it unless you first download a backup. Journal and Wallet expose local export/import for the current trip; the JSON file must be stored privately. It does not include cloud data or offline sync queues.
- The bundled Today UI creates spontaneous itinerary items but does not yet expose edit/delete controls. When those are requested, Codex must implement and verify them in the generated project; the Skill does not claim they are already built in.
- AI responses without a configured provider are marked unconfigured. Live destination facts require a provider and independent checking. The app does not verify opening hours, bookings, transport or prices.
- The PWA has a generic offline launch shell. That shell is not a cached personal itinerary. The original signed-in offline queues require a configured Supabase account.
- Real cloud mode needs your own Supabase project, schema/migrations and RLS review, Auth configuration, and `.env.local`; see `references/services.md`. Do not use the included SQL without reviewing it against your project.
- Map UI may show a nontechnical fallback when a map token is absent; the package does not include a map token or place search service.

## Update and uninstall

To update, pull the Skill repository and restart Codex. Generated projects are independent copies and are **not** updated automatically. To uninstall, remove only the installed Skill folder; do not delete generated travel projects unless you have backed up their browser data.

## Licensing and assets

The reusable code and Skill instructions are MIT-licensed with owner authorization. The generic fallback photograph is AI-generated for this package. No original personal itinerary, private keys, orders, accounts or private photos are included. For actual destinations, replace the generic image only with media you have permission to use. Third-party package licenses remain their own.

## Limitations and feedback

See `references/verification.md` for tested and untested paths. Report reproducible issues in this repository's GitHub Issues, including environment and steps, but never post passwords, tokens, cookies, or personal travel records.

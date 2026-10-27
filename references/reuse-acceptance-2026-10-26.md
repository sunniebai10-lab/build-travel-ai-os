# Reusable template backport and second-destination acceptance

## Source and scope

After the Kyoto Skill-invocation test in [acceptance-2026-10-26.md](acceptance-2026-10-26.md), the reusable fixes were applied to `assets/ai-world-citizen-os/`, not to the original AI World Citizen OS project. The Kyoto-specific `local-travel-os.tsx`, trip configuration, copy and test fixtures were **not** copied into the template.

| Finding from Kyoto | Reusable template status |
| --- | --- |
| Guest personal itinerary could be created but not edited or deleted | Added guest edit and removal paths to `lib/supabase/user-itinerary.ts`; Today has edit/delete actions for spontaneous entries. Cloud removal uses existing cancel/replay path. |
| Native delete confirmation obstructed browser acceptance | Today now uses an in-page confirmation. |
| Backup import confirmation needed a visible, testable state | Already migrated to reusable `LocalDataBackup`; preserved. |
| Hidden file input caused 17 px overflow after generated CSS | Already fixed in reusable backup component with `display: none`; preserved. |
| Local backup could be unreachable if Journal/Wallet were omitted | Added backup entry to mobile Today. |
| A destination-specific add-form example could leak into another trip | Replaced its placeholder with destination-neutral copy. |
| Time input displayed `未定` even when browser submitted `10:15` | Submit now reads the actual named form field; the edit sheet still preloads stored time. |

Still per-request: selected module routing/navigation, full UI language translation, traveler branding, permitted images, destination-specific content, actual initial itinerary, and optional AI/map/Supabase setup. This round did not claim those are automatic generator switches. Public planned entries are not editable through the new personal-entry controls; desktop Studio editing and real cloud removal were not tested here.

## Independent destination run

`scripts/create-project.mjs` generated a new local-only Norway test trip in a clean `/tmp/aiwc-skill-reuse-oslo-20261026/oslo-os-final` directory: Oslo/Bergen, 2027-06-12 to 2027-06-15, NOK, empty initial itinerary and coordinates explicitly unset (`0/0`). This was a **direct template regeneration test**, not a new full Codex Skill invocation. The copied `mobile-travel-os.tsx`, `user-itinerary.ts` and `local-data-backup.tsx` matched the updated template byte-for-byte; no Norway project code edits were used to make the flow pass.

The first dependency install attempt failed with `ENOSPC`. Only agent-created Kyoto test dependencies and build caches were removed; the second offline npm install passed. The generated project then passed `npm run build`. Localhost listening was performed through an approved execution path on port 4191; a restricted sandbox would need that approval and must not claim startup before it succeeds.

At a 390 x 844 CSS-pixel browser viewport:

1. Today initially showed no itinerary and exposed the backup controls.
2. Added a user-defined Oslo item at 10:15; Today displayed `10:15` and the item.
3. Edited the title and time to 14:30; both changes appeared.
4. Reloaded the page; the edited item and time remained.
5. Downloaded a real JSON backup; it contained one itinerary entry with the edited title/time.
6. Clicked Delete; a page-level confirmation appeared. Confirmed, reloaded and saw the empty state.
7. Imported the downloaded file, confirmed replacement in-page, and saw the 14:30 item again after reload.
8. Checked horizontal overflow: `innerWidth = scrollWidth = 390`.

Result for the focused template CRUD, refresh and backup-recovery path: **PASS**. This is a local desktop browser at phone width, not real iPhone Safari. The generated project also emitted a React duplicate-key warning for repeated country-code flags (`NO` for both cities) in the separate desktop overview; it did not block the tested mobile flow and remains unresolved. AI, cloud, public-plan editing, destination content correctness and full module/language adaptation were not exercised by this regeneration test.

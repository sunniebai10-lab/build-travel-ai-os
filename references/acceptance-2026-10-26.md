# Independent Skill acceptance, 2026-10-26

## Scenario and invocation

A fresh Codex CLI task ran in a clean `/tmp/aiwc-skill-acceptance-20261025` directory. The installed Skill was linked at `.agents/skills/build-travel-ai-os`; the task read its `SKILL.md` and references. The only task input requested a fictional 2027-04-10 through 2027-04-13 Kyoto/Osaka trip, Chinese UI, JPY, local-only storage, and only Today, Route, Journal, and Wallet. It requested an initially empty itinerary, add/edit/delete, journal and expense entry, backup, startup, and browser checks. This was a Skill invocation, not a direct generator-script-only test.

The task created `kyoto-os` from the production-derived asset, adapted the four visible modules and Chinese copy, installed dependencies, and passed `npm run build`. Unselected routes redirect; they were not removed from the Next.js build output. The task's first trip JSON used `countryCode`/`latitude`/`longitude`; generator validation rejected it. Codex corrected the names to `code`/`lat`/`lng` without human code edits. A disk-full build interruption was resolved by removing only old temporary verification outputs, then the build passed.

The independent task could not listen on localhost (`EPERM`) or open its browser in its restricted sandbox. It correctly reported startup and browser acceptance as **not verified**, rather than claiming success. A later orchestration pass started the generated project at `http://127.0.0.1:4188` with approved execution and performed the browser checks below. No human edited generated code. Two post-task repairs were made by Codex during acceptance: the hidden backup file input had to override generated input CSS to remove 17 px mobile overflow, and the generated Route delete used a native `confirm()` that blocked browser automation, so it was changed to an in-page confirmation. The backup importer in the reusable asset was likewise changed to an in-page confirmation. These are real repairs, not steps the first task had already completed.

## Verified results

| Path | Evidence | Result |
| --- | --- | --- |
| Skill recognition and project creation | New task read installed Skill and generated `kyoto-os` | PASS |
| Module selection and Chinese UI | Browser navigation showed only 今日, 行程, 日记, 钱包; title, forms and currency were Chinese/JPY | PASS for this request |
| Project build and startup | Independent build passed; orchestration started server and browser loaded the actual app | PASS, with sandbox boundary noted above |
| Itinerary create/edit/reload | Browser created a Kyoto itinerary, reloaded, edited its title, and saw the edit | PASS |
| Itinerary delete | After in-page-confirmation repair, Chrome browser deleted a test item and showed an empty list | PASS after repair |
| Journal and expense persistence | Chrome browser saved one journal and one 850 JPY expense; each remained after reload | PASS |
| Export/import recovery | Browser exported a real JSON file with one journal and one expense; a separate browser session imported it, confirmed replacement, reloaded, and displayed one journal and one expense | PASS after repair |
| Two-trip isolation | In-memory store test added a second fictional trip to shared itinerary storage and trip-scoped journal/expense keys. Restoring the first trip left all second-trip data unchanged | PASS at data-layer level; not tested through two browser UIs |
| Bad backup and storage failure | Data-layer tests rejected wrong-trip/malformed backup without mutation and rolled back simulated partial storage failure | PASS |
| Mobile layout | At 390 x 844 CSS pixels, Today, Route, Journal and Wallet each reported `scrollWidth === innerWidth === 390` after file-input repair | PASS for overflow; real iPhone touch not tested |
| Optional AI, maps, cloud sync | Not configured in this local-only request | NOT TESTED |

Generator tests: `node --test tests/create-project.test.mjs` passed 2/2. The production-derived asset and generated Kyoto project each passed `npm run build` after the repairs. The generated project's `node tests/local-flow.cjs` passed create/edit/delete, reload, backup restore, two-trip isolation, malformed input, and rollback tests.

The optional `skill-creator` quick validator could not run: its Python environment lacks `PyYAML`, and the sandbox could not resolve PyPI to install that package. This is a validator-tool dependency gap, not a claimed PASS. The Skill was nevertheless recognized and followed by the independent task, and its generator and builds passed.

## Boundaries and follow-up

- The generator alone does not perform module pruning, localization, or expose itinerary edit/delete in the bundled UI; Codex adapted the generated copy for this one request. No user code editing was required, but this is not a deterministic one-command app generator.
- The independent task did **not** independently complete server startup and browser acceptance; an approved orchestration pass did. A fresh, unrestricted independent task should repeat the whole flow in one run before claiming fully autonomous delivery.
- Chrome extension file upload required a browser permission that was not changed. The app's import was instead verified in the Codex in-app browser with a real downloaded JSON file.
- The local backup contains only the current trip's browser-local data, not cloud data or pending offline synchronization queues. Keep downloaded JSON private; clearing browser storage before exporting loses local records.
- Browser tests were local desktop browser tests with a phone-sized viewport. Real iPhone Safari, PWA standalone, cloud Auth/RLS, paid AI, destination facts, and deployment of a generated project remain unverified.

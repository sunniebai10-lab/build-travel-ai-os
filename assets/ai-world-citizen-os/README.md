# Your Travel OS

This is an independent project generated from the AI World Citizen OS Codex Skill. Edit `travel.config.json` for your trip, then run `npm ci` and `npm run dev`. Run `npm run build` before deployment.

Without a Supabase project, personal itinerary additions, Journal and Wallet entries are local to this browser. They do not sync across devices and can be lost if site data is cleared. The generic offline shell is not a full offline itinerary. No real AI or map service is enabled without separate configuration; do not treat generic placeholders as destination facts.

For cloud mode, review the SQL under `supabase/`, create your own Supabase project, enable Email + Password Auth, and fill only the public URL/anon key in ignored `.env.local`. Keep provider API keys server-only. Verify RLS, writes, login and AI responses separately. Do not run SQL or expose credentials without understanding the permissions.

Replace the generic fallback travel image with destination-specific media only if you have rights to use it. The code is MIT-licensed; package dependencies and any replacement media retain their own licenses.

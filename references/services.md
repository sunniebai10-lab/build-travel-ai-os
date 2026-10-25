# Optional services

## Supabase cloud sync

Create your own Supabase project. Review the generated `supabase/schema.sql`, foundation SQL and migration against your desired permissions and current Supabase version. Apply them in your own project only after review, then run the generated `supabase/seed-trip.sql`. Configure Email + Password Auth for your users. Put the public project URL and anon/publishable key in ignored `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do **not** place a service-role key in browser variables or this repository. Confirm table grants, RLS, login persistence, itinerary insert, Journal insert and Expense insert with a real account; a successful build does not prove these.

## AI

The app has DeepSeek provider code. Add `DEEPSEEK_API_KEY` to ignored `.env.local`, not `NEXT_PUBLIC_*`. Confirm provider/model compatibility and pricing with the provider before use. Test a real request, response, and failure state. Without a key, the UI must remain explicitly unconfigured/mock; do not claim an AI answer is real or fact-checked.

## Maps and images

Mapbox is optional and no token ships here. Do not confuse a rendered fallback with a live map or local discovery. Replace the AI-generated generic image with destination imagery only when licensed and relevant. Any third-party service may have separate pricing, terms and regional availability.

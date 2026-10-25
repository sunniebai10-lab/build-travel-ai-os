# Trip configuration

Provide a JSON object with `name`, `travelerName`, `startDate`, `endDate`, `currency`, `language`, `budget`, `cities`, and `itinerary`. Optional `appName` changes the app label. See `tests/fixtures/fictional-trip.json` for a fully synthetic example.

Dates are ISO `YYYY-MM-DD`; itinerary times are 24-hour `HH:mm`. Currency is a three-letter code. Each city needs a name, country, two-letter country code or empty code, and latitude/longitude. Coordinates are not looked up by the script. Do not invent them: if unknown, use 0/0 as explicitly unset and omit map claims. Each itinerary item needs a date within the trip, time, configured city, title, location string and one of `History`, `Culture`, `Food`, `Nature`, `Experience`, `Transport`, `Planning`. An empty itinerary is valid; add real details later.

The generator creates a unique `tripId` and a SQL seed, so two generated trips do not share a database UUID. Journal and expense local keys are scoped to this UUID in the copied app. A new generated app has its own origin when run on a separate port/domain, but browser storage is not a substitute for backups.

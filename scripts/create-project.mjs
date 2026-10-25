#!/usr/bin/env node
import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const template = resolve(skillRoot, "assets/ai-world-citizen-os");
const usage = "Usage: node scripts/create-project.mjs --config /path/to/trip.json /path/to/new-project";
const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}
if (args.length !== 3 || args[0] !== "--config") {
  process.stderr.write(`${usage}\n`);
  process.exit(2);
}

const inputPath = resolve(args[1]);
const target = resolve(args[2]);
const data = JSON.parse(await readFile(inputPath, "utf8"));
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const error = (message) => { throw new Error(`Invalid trip configuration: ${message}`); };

if (!nonempty(data.name)) error("name is required");
if (data.appName !== undefined && !nonempty(data.appName)) error("appName must be nonempty when provided");
if (!nonempty(data.travelerName)) error("travelerName is required");
if (!validDate(data.startDate) || !validDate(data.endDate) || data.endDate < data.startDate) error("startDate/endDate must be valid and ordered");
if (!/^[A-Z]{3}$/.test(data.currency ?? "")) error("currency must be an ISO-style three-letter code");
if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(data.language ?? "")) error("language must be a language tag such as zh-CN or en-US");
if (!Number.isFinite(data.budget) || data.budget < 0) error("budget must be a nonnegative number");
if (!Array.isArray(data.cities) || data.cities.length === 0) error("at least one city is required");
for (const [index, city] of data.cities.entries()) {
  if (!nonempty(city.name) || !nonempty(city.country)) error(`cities[${index}] requires name and country`);
  if (typeof city.code !== "string" || (city.code && !/^[A-Z]{2}$/.test(city.code))) error(`cities[${index}].code must be a two-letter country code or empty`);
  if (!Number.isFinite(city.lat) || city.lat < -90 || city.lat > 90 || !Number.isFinite(city.lng) || city.lng < -180 || city.lng > 180) error(`cities[${index}] requires valid coordinates`);
}
if (!Array.isArray(data.itinerary)) error("itinerary must be an array");
const allowedCategories = new Set(["History", "Culture", "Food", "Nature", "Experience", "Transport", "Planning"]);
for (const [index, item] of data.itinerary.entries()) {
  if (!validDate(item.date) || item.date < data.startDate || item.date > data.endDate) error(`itinerary[${index}].date is outside trip dates`);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time ?? "")) error(`itinerary[${index}].time must be HH:mm`);
  if (!nonempty(item.city) || !nonempty(item.title)) error(`itinerary[${index}] requires city and title`);
  if (!data.cities.some((city) => city.name === item.city)) error(`itinerary[${index}].city is not configured`);
  if (typeof item.location !== "string") error(`itinerary[${index}].location must be a string`);
  if (!allowedCategories.has(item.category)) error(`itinerary[${index}].category is invalid`);
}

try {
  await stat(target);
  throw new Error(`Target already exists: ${target}`);
} catch (cause) {
  if (cause.code !== "ENOENT") throw cause;
}

const config = {
  name: data.name.trim(),
  appName: data.appName?.trim() || `${data.name.trim()} OS`,
  tripId: randomUUID(),
  travelerName: data.travelerName.trim(),
  startDate: data.startDate,
  endDate: data.endDate,
  currency: data.currency,
  budget: data.budget,
  language: data.language,
  cities: data.cities.map((city) => ({ name: city.name.trim(), country: city.country.trim(), code: city.code, lat: city.lat, lng: city.lng })),
  itinerary: data.itinerary.map((item) => ({ date: item.date, time: item.time, city: item.city, title: item.title.trim(), location: item.location.trim(), category: item.category })),
};

await cp(template, target, {
  recursive: true,
  filter: (path) => !path.split(/[\\/]/).some((part) => part === ".next" || part === "node_modules" || part === ".git" || part === "tsconfig.tsbuildinfo"),
});
await writeFile(resolve(target, "travel.config.json"), `${JSON.stringify(config, null, 2)}\n`);
const offlinePath = resolve(target, "public/offline.html");
const escapedName = config.appName.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
await writeFile(offlinePath, (await readFile(offlinePath, "utf8")).replaceAll("Travel OS", escapedName));
await mkdir(resolve(target, "supabase"), { recursive: true });
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const seed = `-- Review before running in your own Supabase SQL editor. No secrets are required.\ninsert into public.trips (id, name, start_date, end_date, budget, currency)\nvalues (${quote(config.tripId)}, ${quote(config.name)}, ${quote(config.startDate)}, ${quote(config.endDate)}, ${config.budget}, ${quote(config.currency)})\non conflict (id) do update set name = excluded.name, start_date = excluded.start_date, end_date = excluded.end_date, budget = excluded.budget, currency = excluded.currency;\n`;
await writeFile(resolve(target, "supabase/seed-trip.sql"), seed);
process.stdout.write(`Created ${target}\nNext: npm ci && npm run dev\nCloud writes require your own Supabase setup; see the skill README.\n`);

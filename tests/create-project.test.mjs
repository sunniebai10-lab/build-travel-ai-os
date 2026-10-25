import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts/create-project.mjs");
const fixture = JSON.parse(await readFile(join(root, "tests/fixtures/fictional-trip.json"), "utf8"));

test("creates a production-derived project with isolated trip identity", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "travel-skill-test-"));
  try {
    const configPath = join(temporary, "trip.json");
    const target = join(temporary, "new app");
    await writeFile(configPath, JSON.stringify(fixture));
    const result = spawnSync(process.execPath, [script, "--config", configPath, target], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(await readFile(join(target, "travel.config.json"), "utf8"));
    assert.equal(output.name, fixture.name);
    assert.match(output.tripId, /^[0-9a-f-]{36}$/);
    assert.match(await readFile(join(target, "supabase/seed-trip.sql"), "utf8"), new RegExp(output.tripId));
    assert.match(await readFile(join(target, "public/offline.html"), "utf8"), /Example Travel OS/);
    await readFile(join(target, "lib/supabase/effective-itinerary.ts"), "utf8");
    await readFile(join(target, "LICENSE"), "utf8");

    const repeat = spawnSync(process.execPath, [script, "--config", configPath, target], { encoding: "utf8" });
    assert.notEqual(repeat.status, 0);
    assert.match(repeat.stderr, /Target already exists/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("rejects invalid dates and wrong CLI arguments without writing a project", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "travel-skill-invalid-"));
  try {
    const invalid = { ...fixture, startDate: "2027-02-31" };
    const configPath = join(temporary, "trip.json");
    const target = join(temporary, "output");
    await writeFile(configPath, JSON.stringify(invalid));
    const result = spawnSync(process.execPath, [script, "--config", configPath, target], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /startDate\/endDate/);
    const wrongArgs = spawnSync(process.execPath, [script, target, configPath], { encoding: "utf8" });
    assert.equal(wrongArgs.status, 2);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

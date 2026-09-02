// Runnable self-check: node --experimental-strip-types lib/dates.check.ts
// Guards the timezone trap these helpers exist to hide, and the off-by-one in
// the inclusive presets. Both fail silently in the UI — a photo simply doesn't
// show up — so they are worth asserting rather than eyeballing.
import assert from "node:assert";
import { PRESETS, localEnd, localStart, matchingPreset, toKey, todayKey } from "./dates.ts";

// A bare date string is parsed as UTC, so in any timezone west of it the
// calendar day shifts backwards. The helpers must keep the day the user typed.
for (const key of ["2026-03-12", "2026-01-01", "2026-12-31"]) {
  const [y, m, d] = key.split("-").map(Number);
  const start = localStart(key);
  assert.equal(start.getFullYear(), y);
  assert.equal(start.getMonth() + 1, m);
  assert.equal(start.getDate(), d, `${key}: localStart drifted to another day`);
  assert.equal(start.getHours(), 0);

  const end = localEnd(key);
  assert.equal(end.getDate(), d, `${key}: localEnd drifted to another day`);
  assert.equal(end.getHours(), 23);
  assert.ok(end > start);
}

// Round-trips: a Date -> key -> Date keeps the same calendar day.
const now = new Date();
assert.equal(localStart(toKey(now)).getDate(), now.getDate());
assert.equal(toKey(now), todayKey());

// "Today" is a single day, not an empty or open range.
const today = PRESETS.find((p) => p.id === "today")!.range();
assert.equal(today.from, today.to);
assert.equal(today.from, todayKey());

// Inclusive windows: "last 7 days" must span 7 calendar days, not 8.
const DAY = 86_400_000;
const spanDays = (r: { from: string; to: string }) =>
  Math.round((localStart(r.to).getTime() - localStart(r.from).getTime()) / DAY) + 1;
assert.equal(spanDays(PRESETS.find((p) => p.id === "7d")!.range()), 7);
assert.equal(spanDays(PRESETS.find((p) => p.id === "30d")!.range()), 30);

// Every preset ends today and starts no later than it.
for (const p of PRESETS) {
  const r = p.range();
  assert.equal(r.to, todayKey(), `${p.id} should end today`);
  assert.ok(r.from <= r.to, `${p.id} has an inverted range`);
  // The UI marks a preset active by matching its own output back.
  assert.equal(matchingPreset(r.from, r.to)?.id, p.id, `${p.id} is not self-identifying`);
}

// An arbitrary range is custom, not a preset — that is what reopens the inputs.
assert.equal(matchingPreset("2020-01-01", "2020-01-02"), undefined);
assert.equal(matchingPreset("", ""), undefined);

console.log("dates.check: ok");

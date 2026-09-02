// Runnable self-check: node --experimental-strip-types lib/people.check.ts
// The "raw id" badge is only useful if it stays quiet for real names. It used to
// fire on every person, because enrolling as "Manjunath" makes name == externalId.
import assert from "node:assert";
import { needsHumanName, looksOpaque } from "./people.ts";

// Real identities from the collection: name == externalId is normal, not a problem.
for (const id of ["Manjunath", "sid", "aditya", "Chandresh", "hem", "srinath", "Anne-Marie", "Li Wei"]) {
  assert.equal(needsHumanName(id, id), false, `${id} should not be flagged`);
  assert.equal(looksOpaque(id), false, `${id} is a readable name`);
}

// Ids nobody wants to read in a search box.
for (const id of [
  "550e8400-e29b-41d4-a716-446655440000",
  "9f86d081884c7d659a2feaa0c55ad015",
  "1234567890",
  "",
  "   ",
]) {
  assert.equal(looksOpaque(id), true, `${id || "(blank)"} is opaque`);
  assert.equal(needsHumanName(id, id), true, `${id || "(blank)"} should be flagged`);
}

// A renamed person is never flagged, whatever the id looks like.
assert.equal(needsHumanName("Manjunath", "550e8400-e29b-41d4-a716-446655440000"), false);

console.log("people.check: ok");

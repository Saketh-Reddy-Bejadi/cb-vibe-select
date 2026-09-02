// Runnable self-check: node --experimental-strip-types lib/settings.check.ts
// Guards the cache around a visibility-gating setting: repeat reads must not
// re-query, and a write must be visible immediately rather than after the TTL.
import assert from "node:assert";
import * as nodeModule from "node:module";

// settings.ts imports "./prisma" without an extension — fine for Next's
// resolver, unresolvable for Node's. Bridge it here rather than reshaping app
// code to suit a check.
// registerHooks landed in Node 22.15; @types/node@20 doesn't declare it yet.
type Next = (specifier: string, context: unknown) => unknown;
const { registerHooks } = nodeModule as unknown as {
  registerHooks: (hooks: {
    resolve: (specifier: string, context: unknown, next: Next) => unknown;
  }) => void;
};

registerHooks({
  resolve: (specifier, context, next) =>
    next(specifier === "./prisma" ? "./prisma.ts" : specifier, context),
});

let queries = 0;
let stored = "OPEN";

// lib/prisma.ts reuses globalThis.prisma when it is already set, so seeding a
// stub here keeps the real client — and the database — out of this check.
(globalThis as unknown as { prisma: unknown }).prisma = {
  systemSetting: {
    findUnique: async () => {
      queries += 1;
      return { value: stored };
    },
    upsert: async ({ update }: { update: { value: string } }) => {
      stored = update.value;
      return {};
    },
  },
};

const { getPermissionMode, setPermissionMode } = await import("./settings.ts");

// First read loads from the database; repeats inside the TTL must not.
stored = "STRICT";
assert.equal(await getPermissionMode(), "STRICT");
assert.equal(queries, 1);
await getPermissionMode();
await getPermissionMode();
assert.equal(queries, 1, "cached reads must not re-query");

// A tightened (or loosened) mode must take effect in the writing process at
// once — never after a delay, since this decides who can see which photos.
await setPermissionMode("OPEN");
assert.equal(await getPermissionMode(), "OPEN");
assert.equal(queries, 1, "a write refreshes the cache without another read");
assert.equal(stored, "OPEN", "the write reached the database");

console.log("settings.check: ok");

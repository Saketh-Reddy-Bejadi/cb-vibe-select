import { prisma } from "./prisma";

export type PermissionMode = "OPEN" | "STRICT";
const KEY = "permissionMode";

/**
 * Read on every permission check — including once per thumbnail request, where
 * a gallery screen turned it into 25+ identical queries. Cached in-process with
 * a short TTL.
 *
 * This gates visibility, so staleness is bounded deliberately: `setPermissionMode`
 * is the only writer and refreshes the entry inline, meaning the process that
 * makes the change is correct immediately. The TTL only matters if the app is
 * ever scaled past one instance, where a sibling could serve the old mode until
 * it expires. Keep it short for that reason.
 */
const TTL_MS = 30_000;
let cached: { value: PermissionMode; expiresAt: number } | null = null;

// Default OPEN until an owner flips it.
export async function getPermissionMode(): Promise<PermissionMode> {
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const s = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  const value: PermissionMode = s?.value === "STRICT" ? "STRICT" : "OPEN";
  cached = { value, expiresAt: Date.now() + TTL_MS };
  return value;
}

export async function setPermissionMode(mode: PermissionMode): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: mode },
    create: { key: KEY, value: mode },
  });
  // Only refresh after the write lands, so a failed upsert can't leave the
  // cache asserting a mode the database never took.
  cached = { value: mode, expiresAt: Date.now() + TTL_MS };
}

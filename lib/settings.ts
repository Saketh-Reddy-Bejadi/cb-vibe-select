import { prisma } from "./prisma";

export type PermissionMode = "OPEN" | "STRICT";
const KEY = "permissionMode";

// Default OPEN until an owner flips it.
export async function getPermissionMode(): Promise<PermissionMode> {
  const s = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  return s?.value === "STRICT" ? "STRICT" : "OPEN";
}

export async function setPermissionMode(mode: PermissionMode): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: mode },
    create: { key: KEY, value: mode },
  });
}

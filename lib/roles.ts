import type { Role } from "@prisma/client";

// OWNER(2) > ADMIN(1) > USER(0). No visibility/privilege leaks upward.
export const RANK: Record<Role, number> = { USER: 0, ADMIN: 1, OWNER: 2 };
const ALL_ROLES: Role[] = ["USER", "ADMIN", "OWNER"];

// Roles a manager may assign — their own rank and below.
export function assignableRoles(viewer: Role): Role[] {
  return ALL_ROLES.filter((r) => RANK[r] <= RANK[viewer]);
}

// A manager may see users at their rank or below (admins never see owners).
export function visibleRoles(viewer: Role): Role[] {
  return assignableRoles(viewer);
}

// A manager may change the role of users strictly below them only.
export function canEdit(viewer: Role, targetRole: Role): boolean {
  return RANK[targetRole] < RANK[viewer];
}

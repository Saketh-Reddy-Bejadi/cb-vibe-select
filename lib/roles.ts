import type { Role } from "@prisma/client";

// OWNER(2) > ADMIN(1) > USER(0). No visibility/privilege leaks upward.
export const RANK: Record<Role, number> = { USER: 0, ADMIN: 1, OWNER: 2 };
const ALL_ROLES: Role[] = ["USER", "ADMIN", "OWNER"];

// Roles a manager may assign — their own rank and below.
export function assignableRoles(viewer: Role): Role[] {
  return ALL_ROLES.filter((r) => RANK[r] <= RANK[viewer]);
}

// Everyone is listed; ranks above the viewer are masked by `displayRole` below.
// Hiding higher-ranked accounts entirely made them look like missing users, so
// they are shown but never revealed as such.
export function visibleRoles(): Role[] {
  return ALL_ROLES;
}

// The role a viewer is permitted to *see* on a target. Anything above the
// viewer's own rank is capped to that rank — an ADMIN sees an OWNER as "Admin"
// and never learns a higher tier exists. Display only; `canEdit` still refuses
// the write, so masking grants no privilege.
export function displayRole(viewer: Role, target: Role): Role {
  return RANK[target] > RANK[viewer] ? viewer : target;
}

// A manager may change the role of users strictly below them only.
export function canEdit(viewer: Role, targetRole: Role): boolean {
  return RANK[targetRole] < RANK[viewer];
}

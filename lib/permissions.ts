import type { Prisma, Role } from "@prisma/client";
import { getPermissionMode } from "./settings";

// Which images a user may see. Only fully-processed (DONE) images are searchable.
// - Admins/Owner: everything (they manage the system).
// - OPEN mode: everyone sees all indexed images.
// - STRICT mode: users see only public-override folders + folders they added.
//   (True per-user Graph ACL needs delegated Graph; app-only can't do it — documented limitation.)
// ponytail: single source of truth for visibility — every read path funnels through here.
export async function visibleImageWhere(user: {
  id: string;
  role: Role;
}): Promise<Prisma.ImageWhereInput> {
  const base: Prisma.ImageWhereInput = { status: "DONE" };
  if (user.role === "OWNER" || user.role === "ADMIN") return base;

  const mode = await getPermissionMode();
  if (mode === "OPEN") return base;

  return {
    ...base,
    folder: { OR: [{ isPublicOverride: true }, { createdById: user.id }] },
  };
}

import type { Prisma } from "@prisma/client";

// Which images a user may see. Only fully-processed (DONE) images are searchable.
// OPEN mode (default): everyone sees all indexed images.
// Strict mode + per-folder override + createdBy scoping lands in Phase 3 Slice 3.
// ponytail: single source of truth for visibility — every read path funnels through here.
export async function visibleImageWhere(_userId: string): Promise<Prisma.ImageWhereInput> {
  return { status: "DONE" };
}

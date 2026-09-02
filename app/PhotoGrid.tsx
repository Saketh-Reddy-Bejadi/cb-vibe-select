import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { visibleImageWhere } from "@/lib/permissions";
import Gallery, { type GalleryImage } from "./Gallery";

export type Filters = {
  peopleIds: string[];
  folderId?: string;
  from?: string;
  to?: string;
};

/**
 * The only part of the page that waits on the photo query. Everything around it
 * — header, title, filter bar — renders immediately, so changing a filter no
 * longer blanks the control you just used.
 */
export default async function PhotoGrid({
  userId,
  role,
  filters,
}: {
  userId: string;
  role: Role;
  filters: Filters;
}) {
  const { peopleIds, folderId, from, to } = filters;

  // Build the query: base visibility + active filters.
  const base = await visibleImageWhere({ id: userId, role });
  const and: Prisma.ImageWhereInput[] = [base];
  if (folderId) and.push({ folderId });
  if (from || to) {
    and.push({
      capturedAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
      },
    });
  }
  // Every selected person must appear in the image (AND) — "photos with both Alice and Bob".
  for (const pid of peopleIds) and.push({ faces: { some: { personId: pid } } });

  const rows = await prisma.image.findMany({
    where: { AND: and },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    include: {
      folder: { select: { name: true } },
      faces: { include: { person: { select: { name: true } } } },
    },
    take: 200,
  });

  const images: GalleryImage[] = rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    webUrl: r.webUrl,
    width: r.width,
    height: r.height,
    capturedAt: r.capturedAt ? r.capturedAt.toISOString() : null,
    latitude: r.latitude,
    longitude: r.longitude,
    folderName: r.folder.name,
    faces: r.faces.map((f) => ({
      boxX: f.boxX,
      boxY: f.boxY,
      boxWidth: f.boxWidth,
      boxHeight: f.boxHeight,
      name: f.person?.name ?? null,
      confidence: f.confidence,
    })),
  }));

  const hasFilters = peopleIds.length > 0 || !!folderId || !!from || !!to;

  return (
    <>
      {/* Result count is announced so filtering is perceivable without sight. */}
      <p aria-live="polite" className="t-small mb-4 mt-5 text-cb-text-muted">
        {images.length === 200 ? "First 200" : images.length} photo
        {images.length === 1 ? "" : "s"}
        {hasFilters && " matching your filters"}
      </p>

      <Gallery images={images} />
    </>
  );
}

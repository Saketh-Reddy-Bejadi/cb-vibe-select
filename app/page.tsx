import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { visibleImageWhere } from "@/lib/permissions";
import SiteHeader from "@/components/site-header";
import Gallery, { type GalleryImage } from "./Gallery";
import FilterBar from "./FilterBar";

type SP = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;

  const sp = await searchParams;
  const peopleIds = (first(sp.people) ?? "").split(",").filter(Boolean);
  const folderId = first(sp.folder) || undefined;
  const from = first(sp.from) || undefined;
  const to = first(sp.to) || undefined;

  // Build the query: base visibility + active filters.
  const base = await visibleImageWhere({ id: session.user.id, role });
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

  const [rows, persons, folders] = await Promise.all([
    prisma.image.findMany({
      where: { AND: and },
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
      include: {
        folder: { select: { name: true } },
        faces: { include: { person: { select: { name: true } } } },
      },
      take: 200,
    }),
    prisma.person.findMany({
      where: { faces: { some: { image: base } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.folder.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

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
      <SiteHeader />
      <main id="main" className="page max-w-6xl flex-1">
        <div className="mb-6 sm:mb-8">
          <h1 className="t-h1 text-cb-text">Discover</h1>
          <p className="t-body mt-1 text-cb-text-muted">
            Search your Microsoft 365 photo libraries by person, folder and date.
          </p>
        </div>

        <FilterBar
          persons={persons}
          folders={folders}
          selected={{ people: peopleIds, folder: folderId ?? "", from: from ?? "", to: to ?? "" }}
        />

        {/* Result count is announced so filtering is perceivable without sight. */}
        <p aria-live="polite" className="t-small mb-4 mt-5 text-cb-text-muted">
          {images.length === 200 ? "First 200" : images.length} photo
          {images.length === 1 ? "" : "s"}
          {hasFilters && " matching your filters"}
        </p>

        <Gallery images={images} />
      </main>
    </>
  );
}

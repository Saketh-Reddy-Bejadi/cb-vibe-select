import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { visibleImageWhere } from "@/lib/permissions";
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
  const isAdmin = role === "OWNER" || role === "ADMIN";

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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-cb-blue">PicScope</span>
          <h1 className="mt-1 text-3xl font-semibold text-cb-text">Discover</h1>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex h-11 items-center rounded-2xl border border-cb-border px-4 text-sm font-bold text-cb-text transition-colors duration-150 ease-out hover:border-cb-border-hover"
            >
              Admin
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="flex h-11 items-center rounded-2xl border border-cb-blue px-4 text-sm font-bold text-cb-blue transition-colors duration-150 ease-out hover:bg-cb-blue-subtle">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <FilterBar
        persons={persons}
        folders={folders}
        selected={{ people: peopleIds, folder: folderId ?? "", from: from ?? "", to: to ?? "" }}
      />

      <p className="mb-4 mt-4 text-sm text-cb-text-muted">
        {images.length} photo{images.length === 1 ? "" : "s"}
      </p>

      <Gallery images={images} />
    </main>
  );
}

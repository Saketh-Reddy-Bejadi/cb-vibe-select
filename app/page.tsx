import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { visibleImageWhere } from "@/lib/permissions";
import Gallery, { type GalleryImage } from "./Gallery";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;
  const isAdmin = role === "OWNER" || role === "ADMIN";

  const where = await visibleImageWhere(session.user.id);
  const rows = await prisma.image.findMany({
    where,
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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-cb-blue">PicScope</span>
          <h1 className="mt-1 text-3xl font-semibold text-cb-text">Discover</h1>
          <p className="mt-1 text-sm text-cb-text-muted">
            {images.length} photo{images.length === 1 ? "" : "s"} indexed
          </p>
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

      <Gallery images={images} />
    </main>
  );
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchThumbnail } from "@/lib/graph";
import { visibleImageWhere } from "@/lib/permissions";

// Proxy a Graph thumbnail so the app-only token stays server-side. Bytes are never persisted.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const where = await visibleImageWhere({ id: session.user.id, role: session.user.role });
  const image = await prisma.image.findFirst({ where: { ...where, id }, include: { folder: true } });
  if (!image) return new Response("Not found", { status: 404 });

  // Allowlisted widths only — `w` reaches Graph, so it can't be open-ended.
  // These are the widths the gallery's srcSet offers, plus the lightbox sizes.
  const ALLOWED = [200, 400, 800, 1200, 1600, 2400];
  const sp = new URL(req.url).searchParams;
  const requested = Number(sp.get("w"));
  const width = ALLOWED.includes(requested) ? requested : 800;
  // Square bounding box: Graph scales to fit inside it, so the aspect ratio is
  // preserved and `width` caps the longest edge.
  const size = `${width}x${width}`;

  const thumb = await fetchThumbnail(image.folder.graphDriveId, image.graphItemId, size);
  if (!thumb) return new Response("No thumbnail", { status: 404 });

  return new Response(thumb.body, {
    headers: {
      "Content-Type": thumb.contentType,
      // Renditions are stable for a given item; a day of private caching keeps
      // scrolling back through the gallery off the Graph API entirely.
      "Cache-Control": "private, max-age=86400",
    },
  });
}

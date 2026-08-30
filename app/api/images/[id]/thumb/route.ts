import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchThumbnail } from "@/lib/graph";
import { visibleImageWhere } from "@/lib/permissions";

// Proxy a Graph thumbnail so the app-only token stays server-side. Bytes are never persisted.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const where = await visibleImageWhere(session.user.id);
  const image = await prisma.image.findFirst({ where: { ...where, id }, include: { folder: true } });
  if (!image) return new Response("Not found", { status: 404 });

  const raw = new URL(req.url).searchParams.get("size");
  const size = raw === "small" || raw === "medium" ? raw : "large";
  const thumb = await fetchThumbnail(image.folder.graphDriveId, image.graphItemId, size);
  if (!thumb) return new Response("No thumbnail", { status: 404 });

  return new Response(thumb.body, {
    headers: { "Content-Type": thumb.contentType, "Cache-Control": "private, max-age=3600" },
  });
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchImageBytes } from "@/lib/graph";
import { visibleImageWhere } from "@/lib/permissions";

// Stream the full-resolution image as a download. Bytes pass through, never stored.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const where = await visibleImageWhere(session.user.id);
  const image = await prisma.image.findFirst({ where: { ...where, id }, include: { folder: true } });
  if (!image) return new Response("Not found", { status: 404 });

  const bytes = await fetchImageBytes(image.folder.graphDriveId, image.graphItemId);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Disposition": `attachment; filename="${image.fileName.replace(/"/g, "")}"`,
    },
  });
}

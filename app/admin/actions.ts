"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveFolder, listImages } from "@/lib/graph";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "OWNER" && role !== "ADMIN")) return null;
  return session.user;
}

export type FolderFormState = { error?: string; ok?: string };

export async function addFolder(
  _prev: FolderFormState,
  formData: FormData,
): Promise<FolderFormState> {
  const user = await requireAdmin();
  if (!user) return { error: "Not authorized." };

  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: "Paste a SharePoint or OneDrive folder link." };
  try {
    new URL(url);
  } catch {
    return { error: "That doesn't look like a valid URL." };
  }

  const isPublicOverride = formData.get("isPublicOverride") === "on";

  try {
    const item = await resolveFolder(url);
    const driveId = item.parentReference?.driveId;
    if (!driveId) return { error: "Could not determine the drive for that folder." };

    await prisma.folder.upsert({
      where: { graphDriveId_graphItemId: { graphDriveId: driveId, graphItemId: item.id } },
      update: { webUrl: item.webUrl, name: item.name, isPublicOverride },
      create: {
        graphDriveId: driveId,
        graphItemId: item.id,
        webUrl: item.webUrl,
        name: item.name,
        isPublicOverride,
        createdById: user.id,
      },
    });

    revalidatePath("/admin");
    return { ok: `Resolved "${item.name}" (${item.folder?.childCount ?? 0} items).` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to resolve folder." };
  }
}

export type WorkerState = { error?: string; ok?: string };

// Re-queue FAILED (and stuck PROCESSING) images so the worker retries them — e.g. after a Space error
// is fixed, or an SSE run was interrupted mid-image leaving a claim stranded in PROCESSING.
// ponytail: no concurrent worker here, so treating any PROCESSING as stuck is safe.
export async function retryFailed(_prev: WorkerState, _formData: FormData): Promise<WorkerState> {
  const user = await requireAdmin();
  if (!user) return { error: "Not authorized." };

  const { count } = await prisma.image.updateMany({
    where: { status: { in: ["FAILED", "PROCESSING"] } },
    data: { status: "PENDING", error: null },
  });
  revalidatePath("/admin");
  return count === 0
    ? { ok: "No failed images to retry." }
    : { ok: `Re-queued ${count} failed image(s) — click Process queue to run them.` };
}

export type ScanState = { error?: string; ok?: string };

// Discover images under a registered folder and enqueue them (PENDING). Processing is Slice 4.
// ponytail: traversal runs inline in this action — fine on a long-running host; move to a job if folders get huge.
export async function scanFolder(_prev: ScanState, formData: FormData): Promise<ScanState> {
  const user = await requireAdmin();
  if (!user) return { error: "Not authorized." };

  const folderId = String(formData.get("folderId") ?? "");
  const recursive = formData.get("recursive") === "on";
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) return { error: "Folder not found." };

  const job = await prisma.job.create({ data: { folderId: folder.id, status: "PROCESSING" } });

  try {
    const images = await listImages(folder.graphDriveId, folder.graphItemId, recursive);

    if (images.length) {
      await prisma.image.createMany({
        data: images.map((img) => ({
          graphItemId: img.graphItemId,
          folderId: folder.id,
          fileName: img.fileName,
          mimeType: img.mimeType,
          sizeBytes: img.sizeBytes,
          webUrl: img.webUrl,
          width: img.width,
          height: img.height,
        })),
        skipDuplicates: true, // dedup across re-scans via graphItemId unique
      });
    }

    // Outstanding queue depth for this folder = work the worker will pick up.
    const pending = await prisma.image.count({
      where: { folderId: folder.id, status: "PENDING" },
    });

    await prisma.job.update({
      where: { id: job.id },
      data: { totalItems: pending, status: pending === 0 ? "COMPLETED" : "PENDING" },
    });
    await prisma.folder.update({
      where: { id: folder.id },
      data: { lastSyncedAt: new Date() },
    });

    revalidatePath("/admin");
    return {
      ok: `Found ${images.length} image(s); ${pending} queued for processing.`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scan failed.";
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "FAILED", errorLog: message },
    });
    revalidatePath("/admin");
    return { error: message };
  }
}

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveFolder, listImages } from "@/lib/graph";
import { setPermissionMode } from "@/lib/settings";
import { assignableRoles, canEdit } from "@/lib/roles";
import type { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Change a user's role, enforcing the hierarchy server-side (OWNER>ADMIN>USER):
// you may only edit users strictly below you and assign roles at your rank or below.
export async function setUserRole(formData: FormData) {
  const me = await requireAdmin();
  if (!me) return;

  const userId = String(formData.get("userId") ?? "");
  const newRole = String(formData.get("role") ?? "") as Role;
  if (userId === me.id) return; // no self-change (prevents self-lockout)

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;
  if (target.email.toLowerCase() === process.env.OWNER_EMAIL?.toLowerCase()) return; // protect bootstrap owner
  if (!canEdit(me.role, target.role)) return; // can't touch peers or higher
  if (!assignableRoles(me.role).includes(newRole)) return; // can't grant above yourself

  await prisma.user.update({ where: { id: userId }, data: { role: newRole } });
  revalidatePath("/admin/users");
}

// Owner-only: flip the global Strict/Open permission mode.
export async function updatePermissionMode(formData: FormData) {
  const user = await requireAdmin();
  if (user?.role !== "OWNER") return;
  await setPermissionMode(formData.get("mode") === "STRICT" ? "STRICT" : "OPEN");
  revalidatePath("/admin");
}

// Toggle a folder's company-wide public override (visible in Strict mode).
export async function toggleFolderPublic(formData: FormData) {
  const user = await requireAdmin();
  if (!user) return;
  const id = String(formData.get("folderId") ?? "");
  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder) return;
  await prisma.folder.update({
    where: { id },
    data: { isPublicOverride: !folder.isPublicOverride },
  });
  revalidatePath("/admin");
}

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

// Re-scan only adds new files (createMany + skipDuplicates), so images already
// indexed are never reprocessed by it. This is the per-folder counterpart to the
// global re-index: it puts a folder's finished images back on the queue, which
// is what you want after enrolling faces that appear in one shoot.
export async function requeueFolder(_prev: ScanState, formData: FormData): Promise<ScanState> {
  const user = await requireAdmin();
  if (!user) return { error: "Not authorized." };

  const folderId = String(formData.get("folderId") ?? "");
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { name: true },
  });
  if (!folder) return { error: "Folder not found." };

  const { count } = await prisma.image.updateMany({
    where: { folderId, status: "DONE" },
    data: { status: "PENDING", error: null },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/people");
  return count === 0
    ? { ok: "Nothing to re-index in this folder." }
    : { ok: `${count} image(s) queued. Run "Process queue" above to start.` };
}

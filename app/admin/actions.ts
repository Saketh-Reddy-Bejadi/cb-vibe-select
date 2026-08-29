"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveFolder } from "@/lib/graph";
import { revalidatePath } from "next/cache";

export type FolderFormState = { error?: string; ok?: string };

export async function addFolder(
  _prev: FolderFormState,
  formData: FormData,
): Promise<FolderFormState> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "OWNER" && role !== "ADMIN")) {
    return { error: "Not authorized." };
  }

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
        createdById: session.user.id,
      },
    });

    revalidatePath("/admin");
    return { ok: `Resolved "${item.name}" (${item.folder?.childCount ?? 0} items).` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to resolve folder." };
  }
}

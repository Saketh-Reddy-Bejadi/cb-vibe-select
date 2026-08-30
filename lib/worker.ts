import { prisma } from "./prisma";
import { fetchImageBytes } from "./graph";
import { parseExif } from "./exif";
import { detectFaces } from "./faces";

// Claim one PENDING image atomically so concurrent workers never grab the same row.
async function claimNext(): Promise<{ id: string; fileName: string } | null> {
  const rows = await prisma.$queryRaw<{ id: string; fileName: string }[]>`
    UPDATE "Image" SET status = 'PROCESSING'
    WHERE id = (
      SELECT id FROM "Image"
      WHERE status = 'PENDING'
      ORDER BY "createdAt"
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "fileName"`;
  return rows[0] ?? null;
}

// Keep the folder's latest job in sync so the admin sees live counts.
async function bumpJob(folderId: string, failed: boolean) {
  const job = await prisma.job.findFirst({ where: { folderId }, orderBy: { createdAt: "desc" } });
  if (!job) return;
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "PROCESSING",
      processedItems: failed ? undefined : { increment: 1 },
      failedItems: failed ? { increment: 1 } : undefined,
    },
  });
  const remaining = await prisma.image.count({
    where: { folderId, status: { in: ["PENDING", "PROCESSING"] } },
  });
  if (remaining === 0) {
    await prisma.job.update({ where: { id: job.id }, data: { status: "COMPLETED" } });
  }
}

async function processImage(imageId: string): Promise<boolean> {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { folder: true },
  });
  if (!image) return false;

  try {
    // Fetch bytes into memory, run EXIF + face pipeline, then discard the bytes.
    const bytes = await fetchImageBytes(image.folder.graphDriveId, image.graphItemId);
    const [exif, faces] = await Promise.all([
      parseExif(bytes),
      detectFaces(bytes, image.fileName, image.mimeType),
    ]);

    // Upsert a Person per identified external_id (trust backend: any non-empty match = identified).
    const personIdByExternal = new Map<string, string>();
    for (const f of faces) {
      const top = f.matches[0];
      if (top && !personIdByExternal.has(top.external_id)) {
        const person = await prisma.person.upsert({
          where: { externalId: top.external_id },
          update: {},
          create: { externalId: top.external_id, name: top.external_id },
        });
        personIdByExternal.set(top.external_id, person.id);
      }
    }

    await prisma.$transaction([
      // Idempotent: clear prior faces so re-processing never duplicates.
      prisma.faceDetection.deleteMany({ where: { imageId: image.id } }),
      prisma.faceDetection.createMany({
        data: faces.map((f) => {
          const top = f.matches[0];
          return {
            imageId: image.id,
            personId: top ? personIdByExternal.get(top.external_id)! : null,
            boxX: Math.round(f.bbox.x),
            boxY: Math.round(f.bbox.y),
            boxWidth: Math.round(f.bbox.width),
            boxHeight: Math.round(f.bbox.height),
            confidence: top ? top.similarity : null,
          };
        }),
      }),
      prisma.image.update({
        where: { id: image.id },
        data: {
          status: "DONE",
          processedAt: new Date(),
          error: null,
          capturedAt: exif.capturedAt,
          latitude: exif.latitude,
          longitude: exif.longitude,
        },
      }),
    ]);

    await bumpJob(image.folderId, false);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : "processing failed";
    await prisma.image.update({
      where: { id: image.id },
      data: { status: "FAILED", error: message, processedAt: new Date() },
    });
    await bumpJob(image.folderId, true);
    return false;
  }
}

export type ProgressEvent = {
  type: "start" | "progress" | "done";
  total: number;
  processed: number;
  failed: number;
  currentFile?: string;
};

// Drain the queue sequentially, emitting progress for SSE. ponytail: one image at a time — simplest,
// and it won't hammer the Space; add bounded concurrency here if throughput ever matters.
export async function processQueue(opts?: {
  onProgress?: (e: ProgressEvent) => void;
  signal?: AbortSignal;
}): Promise<{ processed: number; failed: number }> {
  const emit = opts?.onProgress;
  const total = await prisma.image.count({ where: { status: "PENDING" } });
  let processed = 0;
  let failed = 0;
  emit?.({ type: "start", total, processed, failed });

  // total+ buffer as a runaway backstop; the real stop is claimNext returning null.
  for (let i = 0; i < total + 1000; i++) {
    if (opts?.signal?.aborted) break;
    const claimed = await claimNext();
    if (!claimed) break;
    emit?.({ type: "progress", total, processed, failed, currentFile: claimed.fileName });
    if (await processImage(claimed.id)) processed++;
    else failed++;
    emit?.({ type: "progress", total, processed, failed, currentFile: claimed.fileName });
  }

  emit?.({ type: "done", total, processed, failed });
  return { processed, failed };
}

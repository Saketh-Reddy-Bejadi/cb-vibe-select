"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteEnrolledFace, enrollFace, listEnrolledFaces } from "@/lib/faces";
import { iou } from "@/lib/boxes";
import { matchAgainstCollection, syncCollection } from "@/lib/vectors";

/** Same threshold the worker passes to the Space, so both paths agree. */
const THRESHOLD = Number(process.env.HF_THRESHOLD ?? "0.35");

export type PeopleState = { ok?: string; error?: string };

/** /admin is already gated to OWNER/ADMIN by proxy.ts; re-check at the action. */
async function requireAdmin() {
  const user = (await auth())?.user;
  if (user?.role !== "OWNER" && user?.role !== "ADMIN") return null;
  return user;
}

/**
 * Rename a person. Display only — it never touches the Space, and it survives
 * reprocessing because the worker upserts people with `update: {}`, so an
 * existing row's name is deliberately left alone.
 */
export async function renamePerson(_prev: PeopleState, formData: FormData): Promise<PeopleState> {
  if (!(await requireAdmin())) return { error: "Not allowed." };

  const id = String(formData.get("personId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) return { error: "Missing person." };
  if (!name) return { error: "Name can't be empty." };
  if (name.length > 120) return { error: "Name is too long." };

  await prisma.person.update({ where: { id }, data: { name } });
  revalidatePath("/admin/people");
  revalidatePath("/");
  return { ok: `Renamed to ${name}.` };
}

/** Hide or show a person across search and face labels. */
export async function togglePersonHidden(formData: FormData) {
  if (!(await requireAdmin())) return;

  const id = String(formData.get("personId") ?? "");
  if (!id) return;
  const person = await prisma.person.findUnique({ where: { id }, select: { hidden: true } });
  if (!person) return;

  await prisma.person.update({ where: { id }, data: { hidden: !person.hidden } });
  revalidatePath("/admin/people");
  revalidatePath("/");
}

/**
 * Enrol a named reference face into the Space's collection, so future scans
 * recognise this person.
 *
 * `image` is a single-face crop produced in the browser — the Space enrols every
 * face it finds under the same id, so a wider frame would mislabel bystanders.
 * If more than one face comes back we caught a neighbour, so the enrolment is
 * rolled back rather than left to poison the collection.
 */
export async function enrollPerson(_prev: PeopleState, formData: FormData): Promise<PeopleState> {
  if (!(await requireAdmin())) return { error: "Not allowed." };

  const name = String(formData.get("name") ?? "").trim();
  const image = formData.get("image");
  if (!name) return { error: "Give this person a name first." };
  if (name.length > 120) return { error: "Name is too long." };
  if (!(image instanceof File) || image.size === 0) return { error: "No face image was sent." };

  const bytes = Buffer.from(await image.arrayBuffer());

  let result;
  try {
    result = await enrollFace(name, bytes, `${name}.jpg`, image.type || "image/jpeg");
  } catch (e) {
    // Never claim success we didn't get — the Space is the source of truth.
    return { error: `Enrolment failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (result.error) return { error: result.error };
  if (result.indexed.length === 0) return { error: "No face was detected in that crop." };

  // People stand close together, so the padding regularly pulls a neighbour
  // into frame and the Space enrols them too. Keep whichever indexed face
  // overlaps the detection the admin actually clicked, and drop the others —
  // rejecting outright would make those faces impossible to ever enrol.
  if (result.indexed.length > 1) {
    const target = {
      x: Number(formData.get("targetX")),
      y: Number(formData.get("targetY")),
      w: Number(formData.get("targetW")),
      h: Number(formData.get("targetH")),
    };
    const usable = Number.isFinite(target.x) && target.w > 0 && target.h > 0;

    const scored = result.indexed.map((face) => ({
      face,
      score:
        usable && face.bbox
          ? iou({ x: target.x, y: target.y, width: target.w, height: target.h }, face.bbox)
          : 0,
    }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // No convincing overlap means we cannot tell which face is theirs; enrolling
    // a guess would quietly poison the collection.
    if (!best || best.score < 0.3) {
      for (const { face } of scored) await deleteEnrolledFace(face.face_id).catch(() => {});
      return {
        error: `That crop held ${result.indexed.length} faces and none clearly matched the one you picked, so nothing was enrolled.`,
      };
    }

    for (const { face } of scored.slice(1)) {
      await deleteEnrolledFace(face.face_id).catch(() => {});
    }
    revalidatePath("/admin/people");
    return {
      ok: `Enrolled ${name}, ignoring ${scored.length - 1} other face(s) in the crop. Re-match photos to apply it.`,
    };
  }

  revalidatePath("/admin/people");
  return {
    ok: `Enrolled ${name}. Re-match photos to apply it to images already indexed.`,
  };
}

/**
 * Archive a detected face region so it drops out of the unidentified queue and
 * stops being drawn on photos.
 *
 * Stored as a region rather than a row reference: the detection it points at is
 * deleted and recreated on the next reprocess, so the archive has to be matched
 * back by overlap. Reversible by design — nothing about the face is destroyed.
 */
export async function archiveFace(_prev: PeopleState, formData: FormData): Promise<PeopleState> {
  if (!(await requireAdmin())) return { error: "Not allowed." };

  const faceId = String(formData.get("faceId") ?? "");
  if (!faceId) return { error: "Missing face." };

  const face = await prisma.faceDetection.findUnique({
    where: { id: faceId },
    select: { imageId: true, boxX: true, boxY: true, boxWidth: true, boxHeight: true },
  });
  if (!face) return { error: "That face no longer exists." };

  await prisma.archivedFace.create({ data: face });
  revalidatePath("/admin/people");
  revalidatePath("/");
  return { ok: "Archived." };
}

/** Undo an archive — the detection returns to the queue and to photos. */
export async function restoreFace(_prev: PeopleState, formData: FormData): Promise<PeopleState> {
  if (!(await requireAdmin())) return { error: "Not allowed." };

  const id = String(formData.get("archivedId") ?? "");
  if (!id) return { error: "Missing entry." };

  await prisma.archivedFace.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/people");
  revalidatePath("/");
  return { ok: "Restored." };
}

/** Remove one reference face from the collection. */
export async function removeEnrolledFace(
  _prev: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  if (!(await requireAdmin())) return { error: "Not allowed." };

  const faceId = String(formData.get("faceId") ?? "");
  if (!faceId) return { error: "Missing face id." };

  try {
    const res = await deleteEnrolledFace(faceId);
    if (!res.ok) return { error: res.error ?? "Face not found." };
  } catch (e) {
    return { error: `Delete failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  revalidatePath("/admin/people");
  return { ok: "Reference removed. Re-match photos to drop it from existing images." };
}

/**
 * Delete every reference sharing an external id — recognition only stops once
 * they are all gone, since each /enroll adds a row.
 */
export async function removeIdentity(
  _prev: PeopleState,
  formData: FormData,
): Promise<PeopleState> {
  if (!(await requireAdmin())) return { error: "Not allowed." };

  const externalId = String(formData.get("externalId") ?? "");
  if (!externalId) return { error: "Missing identity." };

  try {
    const all = await listEnrolledFaces();
    const mine = all.filter((f) => f.external_id === externalId);
    if (mine.length === 0) return { error: "No enrolled references for that identity." };

    let removed = 0;
    for (const face of mine) {
      const res = await deleteEnrolledFace(face.face_id);
      if (res.ok) removed += 1;
    }
    revalidatePath("/admin/people");
    return {
      ok: `Removed ${removed} of ${mine.length} reference(s). Re-match photos to apply.`,
    };
  } catch (e) {
    return { error: `Delete failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Pull the Space's enrolled collection into ReferenceFace, then re-match every
 * stored face vector against it.
 *
 * This is the fast path, and the one to reach for after enrolling avatars: no
 * Graph downloads, no detection, no queue — just cosine similarity in Postgres
 * over vectors we already hold. Faces indexed before embeddings were stored have
 * no vector and are reported rather than silently skipped.
 */
export async function syncAndMatch(): Promise<PeopleState> {
  if (!(await requireAdmin())) return { error: "Not allowed." };

  let sync;
  try {
    sync = await syncCollection();
  } catch (e) {
    return { error: `Couldn't reach the recognition backend: ${e instanceof Error ? e.message : e}` };
  }

  if (sync.synced === 0) {
    const why =
      sync.skipped > 0
        ? "the backend returned references without vectors — deploy the Space build that returns embeddings"
        : "the collection is empty";
    return { error: `Nothing to match against: ${why}.` };
  }

  const { matched, cleared, unvectored } = await matchAgainstCollection(THRESHOLD);

  revalidatePath("/admin/people");
  revalidatePath("/");

  const parts = [`${sync.synced} reference(s) synced`];
  if (sync.removed) parts.push(`${sync.removed} removed upstream`);
  parts.push(`${matched} face(s) labelled`);
  if (cleared) parts.push(`${cleared} unlabelled`);
  if (unvectored) {
    parts.push(`${unvectored} face(s) have no stored vector yet — re-index to include them`);
  }
  return { ok: `${parts.join(", ")}.` };
}

/**
 * Requeue processed images through the worker. The slow path: a full download
 * and re-detect per image. Needed only to backfill vectors for images indexed
 * before embeddings were stored, or after changing the detector settings.
 */
export async function rematchAll(): Promise<PeopleState> {
  if (!(await requireAdmin())) return { error: "Not allowed." };

  const { count } = await prisma.image.updateMany({
    where: { status: "DONE" },
    data: { status: "PENDING", error: null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/people");
  // Queueing alone does nothing visible — the worker runs from the admin page.
  return {
    ok: `${count} image(s) queued. They are not processed yet: open Admin and run "Process queue".`,
  };
}

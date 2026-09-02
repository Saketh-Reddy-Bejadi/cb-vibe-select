import { Client, handle_file } from "@gradio/client";

// The Space's /search endpoint identifies faces against an enrolled collection.
// Args (positional): [collection, image, threshold]. Output: { faces: [ {bbox, matches:[{external_id, similarity}]} ] }.
export type FaceMatch = { external_id: string; similarity: number };
export type DetectedFace = {
  bbox: { x: number; y: number; width: number; height: number };
  matches: FaceMatch[];
  /** ArcFace 512-d, L2-normalised. Absent on Space builds predating its return. */
  embedding?: number[];
};

/** Guards against a short/garbled vector reaching a `vector(512)` column. */
export const EMBEDDING_DIM = 512;
export const isEmbedding = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === EMBEDDING_DIM && v.every((n) => typeof n === "number");

const HF_SPACE = process.env.HF_SPACE ?? "sakethbejadi/face-recognition";
const HF_TOKEN = process.env.HF_TOKEN;
const HF_COLLECTION = process.env.HF_COLLECTION; // enrolled collection to identify against
const HF_THRESHOLD = Number(process.env.HF_THRESHOLD ?? "0.35");

// Reuse one connected client across images (connecting is expensive).
let clientPromise: ReturnType<typeof Client.connect> | null = null;
function getClient() {
  if (!HF_TOKEN) throw new Error("HF_TOKEN is not set — cannot call the face Space.");
  if (!HF_COLLECTION) throw new Error("HF_COLLECTION is not set — cannot identify faces.");
  if (!clientPromise) {
    clientPromise = Client.connect(HF_SPACE, { token: HF_TOKEN as `hf_${string}` });
  }
  return clientPromise;
}

// Stream in-memory bytes through the private face Space's /search. Bytes are never persisted.
export async function detectFaces(
  bytes: Buffer,
  fileName: string,
  mimeType: string,
): Promise<DetectedFace[]> {
  const client = await getClient();
  const blob = new Blob([new Uint8Array(bytes)], { type: mimeType || "image/jpeg" });
  const file = new File([blob], fileName, { type: mimeType || "image/jpeg" });

  const result = await client.predict("/search", [HF_COLLECTION, handle_file(file), HF_THRESHOLD]);

  const payload = Array.isArray(result.data) ? result.data[0] : result.data;
  // Output shape is { faces: [...] }; fall back to a bare array just in case.
  const faces = (payload as { faces?: DetectedFace[] })?.faces ?? payload;
  return Array.isArray(faces) ? (faces as DetectedFace[]) : [];
}

/* -------------------------------------------------------------------------- */
/* Collection curation                                                        */
/*                                                                            */
/* The enrolled collection is the Space's reference set — the only durable     */
/* place to change what gets recognised. FaceDetection rows are deleted and    */
/* recreated on every reprocess, so curating those would not survive a scan.   */
/* -------------------------------------------------------------------------- */

function unwrap<T>(data: unknown): T {
  return (Array.isArray(data) ? data[0] : data) as T;
}

export type EnrolledFace = {
  face_id: string;
  external_id: string | null;
  confidence: number | null;
  bbox?: { x: number; y: number; width: number; height: number };
  embedding?: number[];
};

/**
 * Enrol a reference face under `externalId`.
 *
 * The Space enrols EVERY face it finds in the submitted image under the same
 * id, so callers must pass a single-face crop — handing it a group photo would
 * label everyone in it. The returned list is one entry per indexed face, so a
 * length above 1 means the crop caught a bystander and should be rolled back.
 */
export async function enrollFace(
  externalId: string,
  bytes: Buffer,
  fileName: string,
  mimeType = "image/jpeg",
): Promise<{ indexed: EnrolledFace[]; error?: string }> {
  const client = await getClient();
  const file = new File([new Blob([new Uint8Array(bytes)], { type: mimeType })], fileName, {
    type: mimeType,
  });
  const result = await client.predict("/enroll", [HF_COLLECTION, externalId, handle_file(file)]);
  const payload = unwrap<{ indexed?: EnrolledFace[]; error?: string }>(result.data);
  if (payload?.error) return { indexed: [], error: payload.error };
  return { indexed: payload?.indexed ?? [] };
}

/**
 * Every reference face in the collection. No image bytes — ids and boxes only,
 * plus the 512-d vectors when `withEmbeddings` is set.
 *
 * Pulling rather than only capturing what we enrol matters: avatars are often
 * enrolled on the Space's own UI, and those vectors would otherwise be invisible
 * to us.
 */
export async function listEnrolledFaces(withEmbeddings = false): Promise<EnrolledFace[]> {
  const client = await getClient();
  const result = await client.predict("/faces", [HF_COLLECTION, withEmbeddings]);
  const payload = unwrap<EnrolledFace[] | { faces?: EnrolledFace[] }>(result.data);
  const faces = Array.isArray(payload) ? payload : (payload?.faces ?? []);
  return Array.isArray(faces) ? faces : [];
}

/**
 * Remove one reference face. A person may have several references enrolled, and
 * recognition only stops once they are all gone — the caller decides how many
 * to delete.
 */
export async function deleteEnrolledFace(faceId: string): Promise<{ ok: boolean; error?: string }> {
  const client = await getClient();
  const result = await client.predict("/delete_face", [HF_COLLECTION, faceId]);
  const payload = unwrap<{ deleted?: string; error?: string }>(result.data);
  if (payload?.error) return { ok: false, error: payload.error };
  return { ok: !!payload?.deleted };
}

import { Client, handle_file } from "@gradio/client";

// The Space's /search endpoint identifies faces against an enrolled collection.
// Args (positional): [collection, image, threshold]. Output: { faces: [ {bbox, matches:[{external_id, similarity}]} ] }.
export type FaceMatch = { external_id: string; similarity: number };
export type DetectedFace = {
  bbox: { x: number; y: number; width: number; height: number };
  matches: FaceMatch[];
};

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

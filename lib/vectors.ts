import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { EMBEDDING_DIM, isEmbedding, listEnrolledFaces } from "./faces";

// Everything touching a `vector(512)` column lives here, because Prisma has no
// vector type: `Unsupported` fields are excluded from the generated client
// entirely, so they can only be read and written through raw SQL.
//
// Recognition is nothing but cosine similarity over L2-normalised ArcFace
// vectors, so doing it here is not an approximation of what the Space does —
// it is the same arithmetic on the same numbers, without shipping an image.

/** pgvector accepts its literal as a JSON-looking array string. */
const asVector = (embedding: number[]) => JSON.stringify(embedding);

export type FaceRow = {
  imageId: string;
  personId: string | null;
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  confidence: number | null;
  embedding?: number[];
};

/**
 * Replace an image's detections, vectors included.
 *
 * Raw because of `embedding`; ids come from `gen_random_uuid()` so nothing has
 * to be generated in JS. Returned as commands for the caller's transaction, so
 * the delete/insert pair stays atomic exactly as it was with createMany.
 */
export function replaceFacesSql(imageId: string, faces: FaceRow[]) {
  const commands = [
    // Idempotent: clear prior faces so re-processing never duplicates.
    prisma.$executeRaw`DELETE FROM "FaceDetection" WHERE "imageId" = ${imageId}`,
  ];
  if (faces.length === 0) return commands;

  const values = faces.map(
    (f) =>
      Prisma.sql`(gen_random_uuid()::text, ${f.imageId}, ${f.personId}, ${f.boxX}, ${f.boxY},
        ${f.boxWidth}, ${f.boxHeight}, ${f.confidence},
        ${f.embedding && isEmbedding(f.embedding) ? asVector(f.embedding) : null}::vector, NOW())`
  );

  commands.push(
    prisma.$executeRaw`
      INSERT INTO "FaceDetection"
        (id, "imageId", "personId", "boxX", "boxY", "boxWidth", "boxHeight", confidence, embedding, "createdAt")
      VALUES ${Prisma.join(values)}`
  );
  return commands;
}

/**
 * Mirror the Space's enrolled collection locally.
 *
 * References removed upstream are deleted here too, so a "stop recognising" done
 * on the Space's own UI still takes effect in PicScope.
 */
export async function syncCollection(): Promise<{ synced: number; removed: number; skipped: number }> {
  const faces = await listEnrolledFaces(true);

  let synced = 0;
  let skipped = 0;
  for (const face of faces) {
    // A reference with no usable vector cannot be matched against; recording it
    // would silently produce a row that never matches anything.
    if (!face.external_id || !isEmbedding(face.embedding)) {
      skipped += 1;
      continue;
    }
    await prisma.$executeRaw`
      INSERT INTO "ReferenceFace" (id, "externalId", confidence, embedding, "syncedAt")
      VALUES (${face.face_id}, ${face.external_id}, ${face.confidence},
              ${asVector(face.embedding)}::vector, NOW())
      ON CONFLICT (id) DO UPDATE
        SET "externalId" = EXCLUDED."externalId",
            confidence   = EXCLUDED.confidence,
            embedding    = EXCLUDED.embedding,
            "syncedAt"   = NOW()`;
    synced += 1;
  }

  // Matching links a face to a Person by externalId, so an identity enrolled on
  // the Space with no Person row here could never be labelled — it would just
  // silently never match. Create the row; `update: {}` protects any rename.
  for (const externalId of new Set(
    faces.filter((f) => f.external_id && isEmbedding(f.embedding)).map((f) => f.external_id!)
  )) {
    await prisma.person.upsert({
      where: { externalId },
      update: {},
      create: { externalId, name: externalId },
    });
  }

  const keep = faces.map((f) => f.face_id);
  const { count: removed } = await prisma.referenceFace.deleteMany({
    where: keep.length ? { id: { notIn: keep } } : {},
  });

  return { synced, removed, skipped };
}

/**
 * Re-match stored face vectors against the mirrored collection.
 *
 * This is the whole point of persisting embeddings: it replaces a full
 * re-download and re-detection of every image with one query. Faces with no
 * vector — indexed before embeddings were stored — are left untouched rather
 * than cleared, so a partial backfill never destroys existing labels.
 */
export async function matchAgainstCollection(
  threshold: number
): Promise<{ matched: number; cleared: number; unvectored: number }> {
  const [{ count: unvectored }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count FROM "FaceDetection" WHERE embedding IS NULL`;

  // Nearest reference per face, then link only if it clears the threshold.
  const matched = await prisma.$executeRaw`
    WITH best AS (
      SELECT fd.id AS face_id, ref."externalId", ref.sim
      FROM "FaceDetection" fd
      CROSS JOIN LATERAL (
        SELECT rf."externalId", 1 - (rf.embedding <=> fd.embedding) AS sim
        FROM "ReferenceFace" rf
        ORDER BY rf.embedding <=> fd.embedding
        LIMIT 1
      ) ref
      WHERE fd.embedding IS NOT NULL
    )
    UPDATE "FaceDetection" fd
    SET "personId" = p.id, confidence = best.sim
    FROM best
    JOIN "Person" p ON p."externalId" = best."externalId"
    WHERE fd.id = best.face_id
      AND best.sim >= ${threshold}
      AND (fd."personId" IS DISTINCT FROM p.id)`;

  // A face that no longer clears the threshold — because its reference was
  // deleted — must lose its label, or the UI keeps asserting an identity the
  // collection no longer supports.
  const cleared = await prisma.$executeRaw`
    UPDATE "FaceDetection" fd
    SET "personId" = NULL
    WHERE fd."personId" IS NOT NULL
      AND fd.embedding IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "ReferenceFace" rf
        WHERE 1 - (rf.embedding <=> fd.embedding) >= ${threshold}
      )`;

  return { matched, cleared, unvectored: Number(unvectored) };
}

/** How much of the library can be matched locally versus still needing a pass. */
export async function embeddingCoverage(): Promise<{ total: number; withVector: number }> {
  const [row] = await prisma.$queryRaw<[{ total: bigint; with_vector: bigint }]>`
    SELECT COUNT(*)::bigint AS total,
           COUNT(embedding)::bigint AS with_vector
    FROM "FaceDetection"`;
  return { total: Number(row.total), withVector: Number(row.with_vector) };
}

export { EMBEDDING_DIM };

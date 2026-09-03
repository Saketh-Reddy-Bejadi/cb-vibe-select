-- Face vectors, so re-matching against a changed collection is a query rather
-- than a full re-download + re-detect of every image.
CREATE EXTENSION IF NOT EXISTS vector;

-- Nullable: rows indexed before this migration have no vector until backfilled.
ALTER TABLE "FaceDetection" ADD COLUMN "embedding" vector(512);

-- Local mirror of the Space's enrolled collection. "id" is the Space's face_id,
-- so re-syncing is an upsert and upstream deletions are detectable.
CREATE TABLE "ReferenceFace" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "embedding" vector(512) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferenceFace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReferenceFace_externalId_idx" ON "ReferenceFace"("externalId");

-- HNSW under cosine ops: <=> is the only operator these columns are queried by,
-- matching how the Space indexes the same vectors.
CREATE INDEX "FaceDetection_embedding_idx" ON "FaceDetection" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "ReferenceFace_embedding_idx" ON "ReferenceFace" USING hnsw ("embedding" vector_cosine_ops);

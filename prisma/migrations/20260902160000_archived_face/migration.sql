-- Dismissed face regions. Separate table because FaceDetection rows are deleted
-- and recreated on every reprocess, so an archive flag there would not survive.
CREATE TABLE "ArchivedFace" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "boxX" INTEGER NOT NULL,
    "boxY" INTEGER NOT NULL,
    "boxWidth" INTEGER NOT NULL,
    "boxHeight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArchivedFace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArchivedFace_imageId_idx" ON "ArchivedFace"("imageId");

ALTER TABLE "ArchivedFace" ADD CONSTRAINT "ArchivedFace_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

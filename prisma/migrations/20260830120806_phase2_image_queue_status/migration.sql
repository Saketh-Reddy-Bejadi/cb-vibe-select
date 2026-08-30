-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "error" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ImageStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Image_status_idx" ON "Image"("status");

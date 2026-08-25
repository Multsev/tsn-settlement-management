-- CreateEnum
CREATE TYPE "MapFeatureType" AS ENUM ('INFRASTRUCTURE', 'ROAD', 'GATE', 'CAMERA', 'LIGHTING', 'PLAYGROUND', 'UTILITY', 'OTHER');

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "hasHouse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "occupied" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Street" ADD COLUMN     "mapPath" JSONB;

-- CreateTable
CREATE TABLE "MapFeature" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "type" "MapFeatureType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapFeature_communityId_type_idx" ON "MapFeature"("communityId", "type");

-- AddForeignKey
ALTER TABLE "MapFeature" ADD CONSTRAINT "MapFeature_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

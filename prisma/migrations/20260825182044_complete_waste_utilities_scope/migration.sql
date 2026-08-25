-- CreateEnum
CREATE TYPE "WasteCategory" AS ENUM ('HOUSEHOLD', 'GREEN', 'CONSTRUCTION', 'BULKY');

-- CreateEnum
CREATE TYPE "WasteScheduleStatus" AS ENUM ('SCHEDULED', 'DELAYED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PickupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "WasteRule" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "category" "WasteCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WasteRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteSite" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "capacity" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WasteSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteSchedule" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "siteId" TEXT,
    "category" "WasteCategory" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "WasteScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "contractor" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WasteSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtraPickupRequest" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "category" "WasteCategory" NOT NULL,
    "address" TEXT NOT NULL,
    "note" TEXT,
    "preferredAt" TIMESTAMP(3),
    "status" "PickupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtraPickupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WasteRule_communityId_category_key" ON "WasteRule"("communityId", "category");

-- CreateIndex
CREATE INDEX "WasteSchedule_communityId_scheduledAt_idx" ON "WasteSchedule"("communityId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ExtraPickupRequest_communityId_status_idx" ON "ExtraPickupRequest"("communityId", "status");

-- AddForeignKey
ALTER TABLE "WasteRule" ADD CONSTRAINT "WasteRule_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteSite" ADD CONSTRAINT "WasteSite_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteSchedule" ADD CONSTRAINT "WasteSchedule_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteSchedule" ADD CONSTRAINT "WasteSchedule_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WasteSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraPickupRequest" ADD CONSTRAINT "ExtraPickupRequest_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraPickupRequest" ADD CONSTRAINT "ExtraPickupRequest_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

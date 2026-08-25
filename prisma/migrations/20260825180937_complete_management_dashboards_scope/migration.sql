-- CreateTable
CREATE TABLE "ManagementReport" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagementReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagementReport_communityId_createdAt_idx" ON "ManagementReport"("communityId", "createdAt");

-- AddForeignKey
ALTER TABLE "ManagementReport" ADD CONSTRAINT "ManagementReport_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementReport" ADD CONSTRAINT "ManagementReport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

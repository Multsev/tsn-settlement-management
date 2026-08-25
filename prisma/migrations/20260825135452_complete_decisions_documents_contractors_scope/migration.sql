-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('BOARD', 'GENERAL_MEETING', 'CHAIRMAN', 'POLL', 'OTHER');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('ADOPTED', 'IN_PROGRESS', 'EXECUTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CommunityDocumentType" ADD VALUE 'PROTOCOL';
ALTER TYPE "CommunityDocumentType" ADD VALUE 'ESTIMATE';
ALTER TYPE "CommunityDocumentType" ADD VALUE 'INVOICE';
ALTER TYPE "CommunityDocumentType" ADD VALUE 'ACT';
ALTER TYPE "CommunityDocumentType" ADD VALUE 'LETTER';
ALTER TYPE "CommunityDocumentType" ADD VALUE 'RESPONSE';

-- AlterTable
ALTER TABLE "CommunityDocument" ADD COLUMN     "contractorId" TEXT,
ADD COLUMN     "decisionId" TEXT,
ADD COLUMN     "documentDate" TIMESTAMP(3),
ADD COLUMN     "expenseId" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "uploadedById" TEXT;

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "pollId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "basis" TEXT,
    "type" "DecisionType" NOT NULL,
    "status" "DecisionStatus" NOT NULL DEFAULT 'ADOPTED',
    "adoptedBy" TEXT NOT NULL,
    "supportPercent" INTEGER,
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "executionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "services" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContractor" (
    "projectId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "role" TEXT,
    "contractNumber" TEXT,
    "contractAmount" INTEGER,
    "warrantyUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectContractor_pkey" PRIMARY KEY ("projectId","contractorId")
);

-- CreateTable
CREATE TABLE "_DecisionToProject" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DecisionToProject_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Decision_pollId_key" ON "Decision"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_communityId_name_key" ON "Contractor"("communityId", "name");

-- CreateIndex
CREATE INDEX "_DecisionToProject_B_index" ON "_DecisionToProject"("B");

-- AddForeignKey
ALTER TABLE "CommunityDocument" ADD CONSTRAINT "CommunityDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDocument" ADD CONSTRAINT "CommunityDocument_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDocument" ADD CONSTRAINT "CommunityDocument_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDocument" ADD CONSTRAINT "CommunityDocument_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contractor" ADD CONSTRAINT "Contractor_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContractor" ADD CONSTRAINT "ProjectContractor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContractor" ADD CONSTRAINT "ProjectContractor_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DecisionToProject" ADD CONSTRAINT "_DecisionToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DecisionToProject" ADD CONSTRAINT "_DecisionToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

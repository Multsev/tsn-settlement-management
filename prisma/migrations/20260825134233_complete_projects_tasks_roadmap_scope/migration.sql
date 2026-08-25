-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProjectTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "afterPhotoUrl" TEXT,
ADD COLUMN     "beforePhotoUrl" TEXT,
ADD COLUMN     "expectedResult" TEXT,
ADD COLUMN     "fundingSource" TEXT,
ADD COLUMN     "priority" "ProjectPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "problem" TEXT,
ADD COLUMN     "responsible" TEXT,
ADD COLUMN     "resultNote" TEXT,
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "streetId" TEXT;

-- AlterTable
ALTER TABLE "ProjectUpdate" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "progress" INTEGER;

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsible" TEXT,
    "status" "ProjectTaskStatus" NOT NULL DEFAULT 'TODO',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" "ProjectStatus",
    "toStatus" "ProjectStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHistory" ADD CONSTRAINT "ProjectHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

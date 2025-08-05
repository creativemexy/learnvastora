/*
  Warnings:

  - The values [STREAK,ENGAGEMENT,SKILL,COMMUNITY,SOCIAL] on the enum `BadgeCategory` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `awardedAt` on the `UserBadge` table. All the data in the column will be lost.
  - You are about to drop the column `isPublic` on the `UserBadge` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `UserBadge` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('LESSON_PLAN', 'WORKSHEET', 'VIDEO', 'PRESENTATION', 'QUIZ', 'GAME', 'TEMPLATE', 'GUIDE', 'AUDIO', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('KIDS', 'TEENS', 'ADULTS', 'ALL');

-- AlterEnum
BEGIN;
CREATE TYPE "BadgeCategory_new" AS ENUM ('ACHIEVEMENT', 'MILESTONE', 'SPECIAL', 'SEASONAL');
ALTER TABLE "Badge" ALTER COLUMN "category" TYPE "BadgeCategory_new" USING ("category"::text::"BadgeCategory_new");
ALTER TYPE "BadgeCategory" RENAME TO "BadgeCategory_old";
ALTER TYPE "BadgeCategory_new" RENAME TO "BadgeCategory";
DROP TYPE "BadgeCategory_old";
COMMIT;

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "UserBadge" DROP COLUMN "awardedAt",
DROP COLUMN "isPublic",
DROP COLUMN "progress",
ADD COLUMN     "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "TeachingResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "duration" INTEGER NOT NULL,
    "thumbnail" TEXT,
    "url" TEXT,
    "language" TEXT NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TeachingResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceDownload" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceFavorite" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "favoritedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceRating" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceDownload_tutorId_resourceId_key" ON "ResourceDownload"("tutorId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceFavorite_tutorId_resourceId_key" ON "ResourceFavorite"("tutorId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceRating_tutorId_resourceId_key" ON "ResourceRating"("tutorId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_reference_key" ON "Payout"("reference");

-- AddForeignKey
ALTER TABLE "ResourceDownload" ADD CONSTRAINT "ResourceDownload_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceDownload" ADD CONSTRAINT "ResourceDownload_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "TeachingResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceFavorite" ADD CONSTRAINT "ResourceFavorite_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceFavorite" ADD CONSTRAINT "ResourceFavorite_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "TeachingResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceRating" ADD CONSTRAINT "ResourceRating_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceRating" ADD CONSTRAINT "ResourceRating_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "TeachingResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "ConnectedBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "TutorProfile" ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "subjects" TEXT[],
ADD COLUMN     "totalSessions" INTEGER;

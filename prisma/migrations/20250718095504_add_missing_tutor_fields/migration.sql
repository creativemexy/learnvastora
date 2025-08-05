-- AlterTable
ALTER TABLE "TutorProfile" ADD COLUMN     "accent" TEXT,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "experience" INTEGER,
ADD COLUMN     "hourlyRate" DOUBLE PRECISION,
ADD COLUMN     "isPro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSupertutor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languages" TEXT[];

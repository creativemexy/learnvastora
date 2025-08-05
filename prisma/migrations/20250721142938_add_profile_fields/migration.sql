-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "courseInterests" TEXT[],
ADD COLUMN     "language" TEXT,
ADD COLUMN     "languageLevel" TEXT,
ADD COLUMN     "learningGoals" JSONB,
ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "tutorPreferences" JSONB;

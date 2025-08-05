-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SESSION_RESCHEDULED';

-- AlterTable
ALTER TABLE "TutorProfile" ADD COLUMN     "payoutSettings" JSONB;

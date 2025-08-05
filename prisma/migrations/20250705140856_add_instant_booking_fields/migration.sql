-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'INSTANT_BOOKING_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'INSTANT_BOOKING_ACCEPTED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "isInstant" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TutorProfile" ADD COLUMN     "instantBookingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instantBookingPrice" DOUBLE PRECISION,
ADD COLUMN     "responseTime" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

/*
  Warnings:

  - You are about to drop the column `sessionId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `reviewId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `tutorId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the `AuthSession` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[bookingId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bookingId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sessionToken]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookingId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionToken` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "AuthSession" DROP CONSTRAINT "AuthSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_tutorId_fkey";

-- DropIndex
DROP INDEX "Payment_sessionId_key";

-- DropIndex
DROP INDEX "Review_sessionId_key";

-- DropIndex
DROP INDEX "Session_reviewId_key";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "sessionId",
ADD COLUMN     "bookingId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "sessionId",
ADD COLUMN     "bookingId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "sessionId",
ADD COLUMN     "bookingId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "createdAt",
DROP COLUMN "reviewId",
DROP COLUMN "scheduledAt",
DROP COLUMN "status",
DROP COLUMN "studentId",
DROP COLUMN "tutorId",
ADD COLUMN     "expires" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "sessionToken" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "AuthSession";

-- DropEnum
DROP TYPE "SessionStatus";

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "reviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reviewId_key" ON "Booking"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

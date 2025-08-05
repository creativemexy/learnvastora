-- CreateTable
CREATE TABLE "SessionRecording" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionRecording_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SessionRecording" ADD CONSTRAINT "SessionRecording_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRecording" ADD CONSTRAINT "SessionRecording_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

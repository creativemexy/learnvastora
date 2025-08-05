-- CreateTable
CREATE TABLE "ConnectedBank" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "routingNumber" TEXT,
    "bankLogo" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedBank_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConnectedBank" ADD CONSTRAINT "ConnectedBank_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

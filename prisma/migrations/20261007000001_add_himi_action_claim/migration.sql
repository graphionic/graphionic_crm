-- CreateTable
CREATE TABLE "HimiActionClaim" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HimiActionClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HimiActionClaim_actionId_key" ON "HimiActionClaim"("actionId");

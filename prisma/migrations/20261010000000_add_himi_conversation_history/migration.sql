-- CreateTable
CREATE TABLE "HimiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HimiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HimiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HimiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HimiConversation_userId_updatedAt_idx" ON "HimiConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "HimiMessage_conversationId_createdAt_idx" ON "HimiMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "HimiConversation" ADD CONSTRAINT "HimiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HimiMessage" ADD CONSTRAINT "HimiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "HimiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

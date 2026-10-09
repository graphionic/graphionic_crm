-- CreateTable
CREATE TABLE "HimiMemory" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'USER',
    "userId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'PREFERENCE',
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HimiMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HimiMemory_scope_active_idx" ON "HimiMemory"("scope", "active");

-- CreateIndex
CREATE INDEX "HimiMemory_userId_active_idx" ON "HimiMemory"("userId", "active");

-- CreateIndex
CREATE INDEX "HimiMemory_key_idx" ON "HimiMemory"("key");

-- CreateIndex
CREATE INDEX "HimiMemory_expiresAt_idx" ON "HimiMemory"("expiresAt");

-- AddForeignKey
ALTER TABLE "HimiMemory" ADD CONSTRAINT "HimiMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

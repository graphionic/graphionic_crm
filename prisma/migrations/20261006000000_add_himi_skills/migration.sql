-- CreateTable
CREATE TABLE "HimiSkill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT NOT NULL,
    "usageGuidance" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HimiSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HimiSkill_slug_key" ON "HimiSkill"("slug");

-- CreateIndex
CREATE INDEX "HimiSkill_enabled_priority_idx" ON "HimiSkill"("enabled", "priority");

-- CreateIndex
CREATE INDEX "HimiSkill_category_idx" ON "HimiSkill"("category");

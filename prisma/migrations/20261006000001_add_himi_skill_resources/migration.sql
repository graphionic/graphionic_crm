-- CreateTable
CREATE TABLE "HimiSkillResource" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HimiSkillResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HimiSkillResource_skillId_enabled_priority_idx" ON "HimiSkillResource"("skillId", "enabled", "priority");

-- AddForeignKey
ALTER TABLE "HimiSkillResource" ADD CONSTRAINT "HimiSkillResource_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "HimiSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

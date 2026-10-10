-- AlterTable
ALTER TABLE "Activity" ALTER COLUMN "leadId" DROP NOT NULL;
ALTER TABLE "Activity" ADD COLUMN "phone" TEXT;
ALTER TABLE "Activity" ADD COLUMN "contactName" TEXT;

-- CreateIndex
CREATE INDEX "Activity_phone_idx" ON "Activity"("phone");

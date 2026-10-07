-- CreateTable
CREATE TABLE "HimiBusinessProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "businessName" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "headquarters" TEXT,
    "targetMarkets" TEXT,
    "valueProposition" TEXT,
    "positioning" TEXT,
    "pricingPolicy" TEXT,
    "salesGuidance" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HimiBusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HimiService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "deliverables" TEXT,
    "technologies" TEXT,
    "idealCustomer" TEXT,
    "pricingGuidance" TEXT,
    "timelineGuidance" TEXT,
    "salesNotes" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HimiService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HimiPortfolioItem" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "clientName" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "servicesProvided" TEXT,
    "technologies" TEXT,
    "resultOutcome" TEXT,
    "projectUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HimiPortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HimiService_enabled_priority_idx" ON "HimiService"("enabled", "priority");

-- CreateIndex
CREATE INDEX "HimiPortfolioItem_enabled_priority_idx" ON "HimiPortfolioItem"("enabled", "priority");

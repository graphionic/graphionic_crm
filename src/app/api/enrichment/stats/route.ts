import { NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/session';
import { getEnrichmentStats, getEnrichmentConfig } from '@/lib/enrichment';
import { getBudgetStatus, getProvidersForUI } from '@/lib/enrichment-providers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireActiveUser();
    const [stats, config, budget, providers] = await Promise.all([
      getEnrichmentStats(),
      getEnrichmentConfig(),
      getBudgetStatus(),
      getProvidersForUI(),
    ]);
    const providerCount = await prisma.providerCredential.count({ where: { provider: { in: ['hunter', 'dropcontact', 'apollo', 'snov', 'enrichment'] } } });
    
    return NextResponse.json({
      ...stats,
      config: {
        enabled: config.enabled,
        dailyCandidateLimit: config.dailyCandidateLimit,
        batchSize: config.batchSize,
        maxAttemptsPerCandidate: config.maxAttemptsPerCandidate,
        retryCooldownMinutes: config.retryCooldownMinutes,
        jobLockDurationMinutes: config.jobLockDurationMinutes,
        providerDailyCreditLimit: config.providerDailyCreditLimit,
        providerMonthlyCreditLimit: config.providerMonthlyCreditLimit,
      },
      providerCount,
      budgetStatus: budget.status,
      budgetUsage: budget.usage,
      providers,
    });
  } catch (e: any) {
    if (e.message?.includes('Unauthorized') || e.message?.includes('not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

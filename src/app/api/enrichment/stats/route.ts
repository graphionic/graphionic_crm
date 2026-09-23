import { NextResponse } from 'next/server';
import { getEnrichmentStats, getEnrichmentConfig } from '@/lib/enrichment';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const stats = await getEnrichmentStats();
    const config = await getEnrichmentConfig();
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
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

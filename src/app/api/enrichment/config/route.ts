import { NextResponse } from 'next/server';
import { getEnrichmentConfig } from '@/lib/enrichment';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const config = await getEnrichmentConfig();
    // Never expose secrets, only safe config
    return NextResponse.json({
      id: config.id,
      key: config.key,
      enabled: config.enabled,
      dailyCandidateLimit: config.dailyCandidateLimit,
      batchSize: config.batchSize,
      maxAttemptsPerCandidate: config.maxAttemptsPerCandidate,
      retryCooldownMinutes: config.retryCooldownMinutes,
      jobLockDurationMinutes: config.jobLockDurationMinutes,
      providerDailyCreditLimit: config.providerDailyCreditLimit,
      providerMonthlyCreditLimit: config.providerMonthlyCreditLimit,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

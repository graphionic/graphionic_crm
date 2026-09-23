import { NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/session';
import { getEnrichmentConfig } from '@/lib/enrichment';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireActiveUser();
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
    if (e.message?.includes('Unauthorized') || e.message?.includes('not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

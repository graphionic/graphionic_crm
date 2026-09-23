import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'All') where.status = status;

    const [total, jobs] = await Promise.all([
      prisma.enrichmentJob.count({ where }),
      prisma.enrichmentJob.findMany({
        where,
        include: {
          candidate: { select: { companyName: true, city: true, businessCategory: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      jobs,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

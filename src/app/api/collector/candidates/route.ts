import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { getLeadCandidatesPaginated } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireActiveUser();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "25");
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const city = searchParams.get("city") || undefined;
    const sourceId = searchParams.get("sourceId") || undefined;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as 'asc' | 'desc';

    const data = await getLeadCandidatesPaginated({
      page,
      pageSize,
      search,
      status,
      category,
      city,
      sourceId,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

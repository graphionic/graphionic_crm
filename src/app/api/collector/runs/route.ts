import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { getCollectorRuns } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireActiveUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const data = await getCollectorRuns({ status, limit });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

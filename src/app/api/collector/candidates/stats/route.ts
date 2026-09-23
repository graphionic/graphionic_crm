import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { getLeadCandidateStats } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireActiveUser();
    const data = await getLeadCandidateStats();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

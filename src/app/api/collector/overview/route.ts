import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { getCollectorOverview } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireActiveUser();
    const data = await getCollectorOverview();
    return NextResponse.json(data);
  } catch (e: any) {
    if (e.message?.includes("Unauthorized")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

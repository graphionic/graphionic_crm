import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { getCollectorConfig, updateCollectorConfig } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireActiveUser();
    const config = await getCollectorConfig();
    return NextResponse.json(config);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireActiveUser();
    const body = await req.json();
    const updated = await updateCollectorConfig(body);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

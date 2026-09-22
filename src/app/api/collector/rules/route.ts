import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { getCollectionRules, createRule } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireActiveUser();
    const data = await getCollectionRules();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireActiveUser();
    const body = await req.json();
    const created = await createRule(body);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

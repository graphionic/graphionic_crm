import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { getCategories, createCategory } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireActiveUser();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const enabled = searchParams.get("enabled");
    const data = await getCategories({
      search,
      enabled: enabled ? enabled === "true" : undefined,
    });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireActiveUser();
    const body = await req.json();
    const created = await createCategory(body);
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

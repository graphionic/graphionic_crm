import { getSessionUser } from "@/lib/session";
import { runHimiNativeTurn } from "@/lib/himi/agent";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (!body?.message) {
      return NextResponse.json({ ok: false, error: "Message is required." }, { status: 400 });
    }

    const result = await runHimiNativeTurn({
      message: String(body.message),
      history: Array.isArray(body.history) ? body.history : undefined,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[HIMI API Route Error]:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, error: "HIMI couldn't complete that request. Please try again." },
      { status: 500 }
    );
  }
}

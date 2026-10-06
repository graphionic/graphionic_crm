import { getSessionUser } from "@/lib/session";
import { himiConfig } from "@/lib/settings";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await himiConfig();
    return NextResponse.json({
      ok: true,
      agent: "HIMI",
      configured: config.hasKey,
      model: config.model,
    });
  } catch {
    return NextResponse.json(
      { ok: false, configured: false, error: "Health check failed." },
      { status: 500 }
    );
  }
}

import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const himiUrl = process.env.HIMI_AGENT_URL || "http://127.0.0.1:8787";

  try {
    const res = await fetch(`${himiUrl.replace(/\/$/, "")}/health`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ ok: true, connected: true, data });
    }
    return NextResponse.json({ ok: false, connected: false });
  } catch {
    return NextResponse.json({ ok: false, connected: false });
  }
}

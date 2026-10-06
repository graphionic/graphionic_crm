import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const himiUrl = process.env.HIMI_AGENT_URL || "http://127.0.0.1:8787";

  try {
    const body = await req.json();
    const res = await fetch(`${himiUrl.replace(/\/$/, "")}/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "HIMI service is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}

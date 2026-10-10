import { requireActiveUser } from "@/lib/session";
import { sendWhatsappReply } from "@/lib/actions/whatsapp-reply";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireActiveUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const leadId = typeof body?.leadId === "string" ? body.leadId.trim() : undefined;

    if (!phone) {
      return NextResponse.json({ ok: false, error: "Phone number is required." }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ ok: false, error: "Message text cannot be empty." }, { status: 400 });
    }

    const result = await sendWhatsappReply({ phone, text, leadId });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error || "Failed to send message." }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[WhatsApp Send Route Error]:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to send WhatsApp reply." },
      { status: 500 }
    );
  }
}

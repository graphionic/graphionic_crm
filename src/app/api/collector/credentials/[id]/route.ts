import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { deleteCredential, toggleCredential, testCredential } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireActiveUser();
    const { id } = await params;
    const body = await req.json();
    if (body.action === "toggle") {
      const toggled = await toggleCredential(id);
      return NextResponse.json({
        id: toggled.id,
        provider: toggled.provider,
        enabled: toggled.enabled,
        status: toggled.status,
      });
    }
    if (body.action === "test") {
      const tested = await testCredential(id);
      return NextResponse.json({
        id: tested.id,
        provider: tested.provider,
        status: tested.status,
        lastTestedAt: tested.lastTestedAt,
      });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireActiveUser();
    const { id } = await params;
    await deleteCredential(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

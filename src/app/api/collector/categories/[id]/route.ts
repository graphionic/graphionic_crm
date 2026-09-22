import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { updateCategory, deleteCategory, toggleCategory } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireActiveUser();
    const { id } = await params;
    const body = await req.json();
    if (body.action === "toggle") {
      const toggled = await toggleCategory(id);
      return NextResponse.json(toggled);
    }
    const updated = await updateCategory(id, body);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireActiveUser();
    const { id } = await params;
    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

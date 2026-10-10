import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Invalid conversation ID." }, { status: 400 });
  }

  try {
    const conversation = await prisma.himiConversation.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ ok: false, error: "Conversation not found." }, { status: 404 });
    }

    const messages = await prisma.himiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      conversation,
      messages,
    });
  } catch (error) {
    console.error("[HIMI Conversation Get Error]:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load conversation." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Invalid conversation ID." }, { status: 400 });
  }

  try {
    const conversation = await prisma.himiConversation.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json({ ok: false, error: "Conversation not found." }, { status: 404 });
    }

    await prisma.himiConversation.delete({
      where: { id: conversation.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[HIMI Conversation Delete Error]:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete conversation." },
      { status: 500 }
    );
  }
}

import { getSessionUser } from "@/lib/session";
import { runHimiNativeTurn } from "@/lib/himi/agent";
import { executeConfirmedHimiAction } from "@/lib/himi/tools";
import { deriveConversationTitle } from "@/lib/himi/title";
import { prisma } from "@/lib/prisma";
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
    const conversationIdParam = typeof body?.conversationId === "string" ? body.conversationId.trim() : undefined;

    // Handle cancellation request
    if (body?.cancelPendingAction) {
      if (conversationIdParam) {
        const conv = await prisma.himiConversation.findFirst({
          where: { id: conversationIdParam, userId: user.id },
        });
        if (conv) {
          await prisma.himiMessage.create({
            data: { conversationId: conv.id, role: "USER", content: "Cancel" },
          });
          await prisma.himiMessage.create({
            data: { conversationId: conv.id, role: "ASSISTANT", content: "Action cancelled. No changes were made." },
          });
          await prisma.himiConversation.update({
            where: { id: conv.id },
            data: { updatedAt: new Date() },
          });
        }
      }

      return NextResponse.json({
        ok: true,
        response: "Action cancelled. No changes were made.",
      });
    }

    // Handle user confirmation of a pending controlled action
    if (body?.confirmedPendingAction) {
      const execResult = await executeConfirmedHimiAction(
        body.confirmedPendingAction,
        user.email
      );

      if (!execResult.ok) {
        return NextResponse.json(
          { ok: false, error: execResult.error || "Failed to execute action." },
          { status: 400 }
        );
      }

      if (conversationIdParam) {
        const conv = await prisma.himiConversation.findFirst({
          where: { id: conversationIdParam, userId: user.id },
        });
        if (conv) {
          await prisma.himiMessage.create({
            data: { conversationId: conv.id, role: "USER", content: "Confirm" },
          });
          await prisma.himiMessage.create({
            data: { conversationId: conv.id, role: "ASSISTANT", content: execResult.response || "Action executed successfully." },
          });
          await prisma.himiConversation.update({
            where: { id: conv.id },
            data: { updatedAt: new Date() },
          });
        }
      }

      return NextResponse.json({
        ok: true,
        agent: "HIMI",
        response: execResult.response,
        executedAction: execResult.executedAction,
      });
    }

    // Normal message validation
    const userPrompt = typeof body?.message === "string" ? body.message.trim() : "";
    if (!userPrompt) {
      return NextResponse.json({ ok: false, error: "Message is required." }, { status: 400 });
    }

    // Resolve or create conversation
    let conversation: { id: string; title: string } | null = null;
    if (conversationIdParam) {
      conversation = await prisma.himiConversation.findFirst({
        where: { id: conversationIdParam, userId: user.id },
        select: { id: true, title: true },
      });
    }

    if (!conversation) {
      const title = deriveConversationTitle(userPrompt);
      conversation = await prisma.himiConversation.create({
        data: {
          userId: user.id,
          title,
        },
        select: { id: true, title: true },
      });
    }

    // Persist USER message
    await prisma.himiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: userPrompt,
      },
    });

    // Load bounded recent history (latest 10 prior messages)
    const recentDbMessages = await prisma.himiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 11, // latest user message + up to 10 preceding
      select: { role: true, content: true },
    });

    const chronological = recentDbMessages.reverse();
    const previousMessages = chronological.slice(0, -1);
    const historyPayload = previousMessages.map((m) => ({
      sender: m.role.toLowerCase() === "user" ? "user" : "assistant",
      text: m.content,
    }));

    // Execute agent turn
    const result = await runHimiNativeTurn({
      message: userPrompt,
      history: historyPayload.length > 0 ? historyPayload : undefined,
      userId: user.id,
      userEmail: user.email,
      timezone: user.timezone,
    });

    // Persist ASSISTANT message if successful
    if (result.ok && result.response) {
      await prisma.himiMessage.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: result.response,
        },
      });
      await prisma.himiConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json(
      {
        ...result,
        conversationId: conversation.id,
        title: conversation.title,
      },
      { status: result.ok ? 200 : 400 }
    );
  } catch (error) {
    console.error("[HIMI API Route Error]:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, error: "HIMI couldn't complete that request. Please try again." },
      { status: 500 }
    );
  }
}

import { getSessionUser } from "@/lib/session";
import { runHimiNativeTurn } from "@/lib/himi/agent";
import { executeConfirmedHimiAction } from "@/lib/himi/tools";
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

    // Handle cancellation request
    if (body?.cancelPendingAction) {
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

      return NextResponse.json({
        ok: true,
        agent: "HIMI",
        response: execResult.response,
        executedAction: execResult.executedAction,
      });
    }

    // Normal message validation
    if (!body?.message) {
      return NextResponse.json({ ok: false, error: "Message is required." }, { status: 400 });
    }

    const result = await runHimiNativeTurn({
      message: String(body.message),
      history: Array.isArray(body.history) ? body.history : undefined,
      userId: user.id,
      userEmail: user.email,
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


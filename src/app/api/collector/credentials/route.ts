import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/session";
import { getProviderCredentials, createOrUpdateCredential } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireActiveUser();
    const data = await getProviderCredentials();
    // Never return encryptedValue
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireActiveUser();
    const body = await req.json();
    // Validate apiKey present
    if (!body.apiKey || typeof body.apiKey !== "string" || body.apiKey.length < 8) {
      return NextResponse.json({ error: "API Key must be at least 8 characters" }, { status: 400 });
    }
    const created = await createOrUpdateCredential(body);
    // Return masked version only
    return NextResponse.json({
      id: created.id,
      provider: created.provider,
      label: created.label,
      keyHint: created.keyHint,
      maskedKey: `••••••••••••••••${created.keyHint}`,
      enabled: created.enabled,
      status: created.status,
      lastTestedAt: created.lastTestedAt,
      updatedAt: created.updatedAt,
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

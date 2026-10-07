import Link from "next/link";
import { requireActiveUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { HimiSettingsForm } from "./form";

export const dynamic = "force-dynamic";

export default async function HimiSettingsPage() {
  await requireActiveUser();
  const s = await getSettings();

  const apiKey = s.openai_api_key || process.env.OPENAI_API_KEY || "";
  const model = s.openai_model || process.env.OPENAI_MODEL || "gpt-5-mini";

  return (
    <>
      <div className="page-head">
        <div>
          <h2>HIMI / OpenAI Settings</h2>
          <p>Configure the OpenAI credentials and model used by HIMI, your conversational CRM agent.</p>
        </div>
      </div>

      <div className="hstack" style={{ gap: 12, marginBottom: 20, borderBottom: "1px solid var(--border-color, #e5e7eb)", paddingBottom: 10 }}>
        <Link href="/settings/himi" className="btn sm primary">
          OpenAI Configuration
        </Link>
        <Link href="/settings/himi/skills" className="btn sm">
          Dynamic Skills
        </Link>
        <Link href="/settings/himi/knowledge" className="btn sm">
          Business Knowledge
        </Link>
      </div>

      <HimiSettingsForm
        initial={{
          hasOpenAiKey: Boolean(apiKey),
          openaiModel: model,
        }}
      />

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h3>Security &amp; Privacy</h3>
        </div>
        <div className="card-body">
          <p className="small muted">
            Your OpenAI API key is encrypted at rest using AES-256-GCM before being stored in the database.
            It is never sent to the browser or logged in console output.
          </p>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHimiSettings } from "@/lib/actions/settings";

type InitialProps = {
  hasOpenAiKey: boolean;
  openaiModel: string;
};

export function HimiSettingsForm({ initial }: { initial: InitialProps }) {
  const router = useRouter();
  const [model, setModel] = useState(initial.openaiModel);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await saveHimiSettings(fd);
          setMsg({ ok: r.ok, text: r.message });
          router.refresh();
        })
      }
    >
      {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}

      <div className="card">
        <div className="card-head">
          <h3>HIMI / OpenAI Configuration</h3>
        </div>
        <div className="card-body">
          <div className="grid c2">
            <label className="f">
              <span>OpenAI API Key</span>
              <input
                name="openai_api_key"
                type="password"
                placeholder={
                  initial.hasOpenAiKey
                    ? "sk-proj-•••••••• (saved — leave blank to keep)"
                    : "sk-proj-xxxxxxxxxxxx"
                }
              />
              <span className="hint">Used securely by HIMI for AI requests.</span>
            </label>

            <label className="f">
              <span>OpenAI Model</span>
              <input
                name="openai_model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-5-mini"
              />
              <span className="hint">Model used by HIMI for CRM conversations.</span>
            </label>
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn primary" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save HIMI settings"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

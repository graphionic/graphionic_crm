"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSuppression, removeSuppression, saveWebhookSecret } from "@/lib/actions/settings";

export function SuppressionForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="row"
      action={(fd) =>
        start(async () => {
          const r = await addSuppression(fd);
          setMsg({ ok: r.ok, text: r.message });
          router.refresh();
        })
      }
    >
      {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`} style={{ flexBasis: "100%" }}>{msg.text}</div> : null}
      <label className="f" style={{ flex: "2 1 260px" }}>
        <span>Email or phone</span>
        <input name="value" placeholder="someone@example.co.uk or +447700900000" required />
      </label>
      <label className="f" style={{ flex: "1 1 180px" }}>
        <span>Reason</span>
        <input name="reason" placeholder="Asked us to stop" />
      </label>
      <button className="btn danger" type="submit" disabled={pending} style={{ marginBottom: 13 }}>
        {pending ? "Adding…" : "Suppress"}
      </button>
    </form>
  );
}

export function SuppressionRow({
  id,
  value,
  reason,
  added,
}: {
  id: string;
  value: string;
  reason: string;
  added: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <tr>
      <td className="name">{value}</td>
      <td className="sub">{reason || "—"}</td>
      <td className="sub">{added}</td>
      <td className="right">
        <button
          className="btn sm ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await removeSuppression(id);
              router.refresh();
            })
          }
        >
          {pending ? "…" : "Remove"}
        </button>
      </td>
    </tr>
  );
}

export function WebhookSecretForm({ hasSecret }: { hasSecret: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="row"
      action={(fd: FormData) =>
        start(async () => {
          const r = await saveWebhookSecret(fd);
          setMsg({ ok: r.ok, text: r.message });
          router.refresh();
        })
      }
    >
      {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`} style={{ flexBasis: "100%" }}>{msg.text}</div> : null}
      <label className="f" style={{ flex: "2 1 300px" }}>
        <span>Secret {hasSecret ? "(already set — enter a new one to replace)" : ""}</span>
        <input name="watch_secret" type="password" placeholder="paste a long random string" />
      </label>
      <button className="btn primary" type="submit" disabled={pending} style={{ marginBottom: 13 }}>
        {pending ? "Saving…" : "Save secret"}
      </button>
    </form>
  );
}

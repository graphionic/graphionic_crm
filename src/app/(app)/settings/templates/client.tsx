"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTemplates, deleteTemplate } from "@/lib/actions/settings";
import { CopyButton } from "@/components/CopyButton";

type Starter = { name: string; channel: string; subject: string; body: string };

export function TemplateForm({ starters }: { starters: Starter[] }) {
  const router = useRouter();
  const [channel, setChannel] = useState("EMAIL");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="card">
      <div className="card-head"><h3>New template</h3></div>
      <div className="card-body">
        {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}

        <div className="row" style={{ marginBottom: 12 }}>
          {starters.map((s) => (
            <button
              key={s.name}
              className="btn sm"
              type="button"
              onClick={() => {
                setChannel(s.channel);
                setName(s.name);
                setSubject(s.subject);
                setBody(s.body);
                setMsg({ ok: true, text: `Loaded "${s.name}" — edit then save.` });
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        <form
          action={(fd: FormData) =>
            start(async () => {
              const r = await saveTemplates(fd);
              setMsg({ ok: r.ok, text: r.message });
              if (r.ok) {
                setName("");
                setSubject("");
                setBody("");
              }
              router.refresh();
            })
          }
        >
          <div className="grid c2">
            <label className="f">
              <span>Template name *</span>
              <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Audit opener (email)" required />
            </label>
            <label className="f">
              <span>Channel</span>
              <select name="channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </label>

            {channel === "EMAIL" ? (
              <label className="f" style={{ gridColumn: "1 / -1" }}>
                <span>Subject line</span>
                <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
            ) : (
              <>
                <label className="f">
                  <span>Meta template name</span>
                  <input name="waTemplateName" placeholder="website_audit_followup" />
                  <span className="hint">Must match the approved template name in WhatsApp Manager exactly.</span>
                </label>
                <label className="f">
                  <span>Language code</span>
                  <input name="waLanguage" defaultValue="en_US" />
                </label>
              </>
            )}
          </div>

          <label className="f">
            <span>Body *</span>
            <textarea
              name="body"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ fontFamily: "var(--mono)", fontSize: 13 }}
              required
            />
          </label>

          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save template"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function TemplateRow({
  id,
  name,
  channel,
  subject,
  body,
  waTemplateName,
  waLanguage,
}: {
  id: string;
  name: string;
  channel: string;
  subject: string;
  body: string;
  waTemplateName: string;
  waLanguage: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <tr>
        <td className="name">{name}</td>
        <td><span className={`badge ${channel === "WHATSAPP" ? "wa" : "blue"}`}>{channel}</span></td>
        <td className="sub">{subject || waTemplateName || "—"}</td>
        <td className="sub" style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {body.replace(/\n/g, " ")}
        </td>
        <td className="right">
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <CopyButton value={body} label="Copy" />
            <button className="btn sm ghost" onClick={() => setOpen(!open)}>{open ? "Hide" : "View"}</button>
            <button
              className="btn sm danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteTemplate(id);
                  router.refresh();
                })
              }
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={5} style={{ background: "#fafbfd", padding: 0 }}>
            <div style={{ padding: 16 }}>
              {channel === "WHATSAPP" ? (
                <p className="small muted">
                  Meta template: <b>{waTemplateName || "not set"}</b> · language <b>{waLanguage}</b>
                </p>
              ) : null}
              <pre className="pre light" style={{ fontFamily: "inherit" }}>{body}</pre>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

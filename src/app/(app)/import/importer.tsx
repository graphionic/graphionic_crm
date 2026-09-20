"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importLeadsCsv, type ImportResult } from "@/lib/actions/import";
import { CopyButton } from "@/components/CopyButton";

export function Importer({ example }: { example: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = text
    ? text.split(/\r?\n/).filter((l) => l.trim()).length - 1
    : 0;

  return (
    <>
      <div className="card">
        <div className="card-head">
          <h3>1. Paste or upload</h3>
          {preview > 0 ? <span className="hint">{preview} data rows detected</span> : null}
        </div>
        <div className="card-body">
          <div className="row" style={{ marginBottom: 12 }}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setText(await f.text());
                setResult(null);
              }}
            />
            <button className="btn ghost" type="button" onClick={() => { setText(""); setResult(null); if (fileRef.current) fileRef.current.value = ""; }}>
              Clear
            </button>
          </div>

          <label className="f">
            <span>…or paste CSV text</span>
            <textarea
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="company_name,business_category,email,phone,website,segment,score,hook_line&#10;ACME DENTAL LTD,Dental Clinic,info@acme.co.uk,+44…"
              style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}
            />
          </label>

          <div className="row">
            <button
              className="btn primary"
              disabled={pending || !text.trim()}
              onClick={() =>
                start(async () => {
                  const r = await importLeadsCsv(text);
                  setResult(r);
                  if (r.ok) {
                    router.refresh();
                    if (r.inserted || r.updated) setText("");
                  }
                })
              }
            >
              {pending ? "Importing…" : "⇪ Import leads"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => { setText(example); setResult(null); }}
            >
              Load sample row
            </button>
          </div>

          {result ? (
            <div className={`toast ${result.ok ? "ok" : "err"}`} style={{ marginTop: 14 }}>
              <b>{result.ok ? "Done." : "Import failed."}</b> {result.message}
              {result.errors?.length ? (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {result.errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Recognised column names</h3>
          <CopyButton value={example} label="Copy example CSV" />
        </div>
        <div className="card-body">
          <p className="small muted">
            You don&apos;t have to rename anything. These header names (and close variants) are
            mapped automatically:
          </p>
          <div className="grid c2">
            <div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>COMPANY</div>
              <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                <li><code>company_name</code>, <code>company</code>, <code>name</code>, <code>organization</code></li>
                <li><code>business_category</code>, <code>category</code>, <code>industry</code></li>
                <li><code>country</code>, <code>city</code>, <code>region</code>, <code>address</code>, <code>postcode</code></li>
                <li><code>company_number</code>, <code>companies_house_url</code></li>
              </ul>
            </div>
            <div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>CONTACT</div>
              <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                <li><code>contact_name</code>, <code>person_name</code>, <code>decision_maker</code>, <code>owner</code></li>
                <li><code>email</code>, <code>email_address</code>, <code>work_email</code></li>
                <li><code>phone</code>, <code>contact_no</code>, <code>telephone</code>, <code>mobile</code></li>
                <li><code>linkedin</code>, <code>whatsapp</code></li>
              </ul>
            </div>
            <div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>WEBSITE ANALYSIS</div>
              <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                <li><code>website</code>, <code>website_status</code>, <code>segment</code></li>
                <li><code>score</code>, <code>issues</code>, <code>hook_line</code></li>
              </ul>
            </div>
            <div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>PIPELINE</div>
              <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                <li><code>status</code>, <code>priority</code>, <code>source</code></li>
                <li><code>notes</code>, <code>tags</code></li>
              </ul>
            </div>
          </div>

          <div className="callout" style={{ marginTop: 16 }}>
            <b>Output of your Python scripts imports directly.</b>{" "}
            <code>uk_leads.py</code> → <code>enrich_leads.py</code> → <code>qualify_leads.py</code> produce
            exactly these column names, including <code>hook_line</code> and <code>segment</code>. So you can
            go: run the scripts → upload the CSV here → start sending, with no manual mapping.
          </div>

          <div className="callout warn">
            <b>What import sets automatically:</b> <code>Email opt-in = yes</code> for every row, because
            UK Ltd/LLP companies are corporate subscribers — cold B2B email to them is lawful without prior
            consent. <b>WhatsApp opt-in is never auto-ticked.</b> That needs the person to actually ask you
            to message them. Sending cold WhatsApp is against Meta policy and UK PECR.
          </div>
        </div>
      </div>
    </>
  );
}

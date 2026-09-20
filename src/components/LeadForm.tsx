"use client";

import { useState } from "react";
import { BUSINESS_CATEGORIES, COUNTRIES, LEAD_STATUSES, SEGMENTS } from "@/lib/constants";

export type LeadFormValues = Record<string, string | number | boolean | Date | null | undefined>;

function val(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export function LeadForm({
  action,
  initial = {},
  submitLabel = "Save lead",
}: {
  action: (fd: FormData) => Promise<{ error?: string } | void>;
  initial?: LeadFormValues;
  submitLabel?: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await action(fd);
    if (res && "error" in res && res.error) {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error ? <div className="toast err">{error}</div> : null}

      <div className="card">
        <div className="card-head"><h3>Company</h3></div>
        <div className="card-body">
          <div className="grid c2">
            <label className="f">
              <span>Company name *</span>
              <input name="companyName" required defaultValue={val(initial.companyName)} placeholder="Nichols and Fisher Dental Care Ltd" />
            </label>
            <label className="f">
              <span>Business category</span>
              <input
                name="businessCategory"
                list="bizcats"
                defaultValue={val(initial.businessCategory)}
                placeholder="Dental Clinic"
              />
              <datalist id="bizcats">
                {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
            <label className="f">
              <span>Country</span>
              <select name="country" defaultValue={val(initial.country) || "UK"}>
                {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="f">
              <span>City</span>
              <input name="city" defaultValue={val(initial.city)} placeholder="Leeds" />
            </label>
            <label className="f">
              <span>Region / county</span>
              <input name="region" defaultValue={val(initial.region)} />
            </label>
            <label className="f">
              <span>Postcode</span>
              <input name="postcode" defaultValue={val(initial.postcode)} placeholder="LS25 1AR" />
            </label>
            <label className="f" style={{ gridColumn: "1 / -1" }}>
              <span>Address</span>
              <input name="address" defaultValue={val(initial.address)} placeholder="67 Wakefield Road, Garforth, Leeds" />
            </label>
            <label className="f">
              <span>Company number</span>
              <input name="companyNumber" defaultValue={val(initial.companyNumber)} placeholder="17430882" />
            </label>
            <label className="f">
              <span>Industry / sector</span>
              <input name="industry" defaultValue={val(initial.industry)} />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Contact person</h3></div>
        <div className="card-body">
          <div className="grid c2">
            <label className="f">
              <span>Name</span>
              <input name="contactName" defaultValue={val(initial.contactName)} placeholder="Jane Smith" />
            </label>
            <label className="f">
              <span>Role</span>
              <input name="contactRole" defaultValue={val(initial.contactRole)} placeholder="Practice Manager" />
            </label>
            <label className="f">
              <span>Email</span>
              <input name="email" type="email" defaultValue={val(initial.email)} placeholder="jane@practice.co.uk" />
            </label>
            <label className="f">
              <span>Phone</span>
              <input name="phone" type="tel" defaultValue={val(initial.phone)} placeholder="+44 113 555 0100" />
            </label>
            <label className="f">
              <span>WhatsApp number</span>
              <input name="whatsapp" type="tel" defaultValue={val(initial.whatsapp)} placeholder="+44 7700 900000" />
            </label>
            <label className="f">
              <span>LinkedIn</span>
              <input name="linkedin" defaultValue={val(initial.linkedin)} placeholder="https://linkedin.com/in/…" />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Website &amp; qualification</h3></div>
        <div className="card-body">
          <div className="grid c2">
            <label className="f">
              <span>Website</span>
              <input name="website" defaultValue={val(initial.website)} placeholder="https://example.co.uk" />
            </label>
            <label className="f">
              <span>Website state</span>
              <select name="segment" defaultValue={val(initial.segment)}>
                <option value="">Not checked</option>
                {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className="f">
              <span>Score (0–100)</span>
              <input name="score" type="number" min={0} max={100} defaultValue={val(initial.score) || 0} />
            </label>
            <label className="f">
              <span>Source</span>
              <input name="source" defaultValue={val(initial.source) || "manual"} placeholder="companies_house | apollo | referral" />
            </label>
          </div>
          <label className="f">
            <span>Detected issues</span>
            <textarea name="issues" rows={2} defaultValue={val(initial.issues)} placeholder="no HTTPS; not mobile-responsive; copyright still says 2021" />
          </label>
          <label className="f">
            <span>Personalisation hook — the first line of their email</span>
            <textarea name="hookLine" rows={3} defaultValue={val(initial.hookLine)} placeholder="I checked your site on my phone this morning — it loads as a zoomed-out desktop page…" />
            <span className="hint">
              Keep it specific and true. This becomes the opening sentence of the outreach email.
            </span>
          </label>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Pipeline &amp; compliance</h3></div>
        <div className="card-body">
          <div className="grid c2">
            <label className="f">
              <span>Status</span>
              <select name="status" defaultValue={val(initial.status) || "NEW"}>
                {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className="f">
              <span>Priority</span>
              <select name="priority" defaultValue={val(initial.priority) || "MEDIUM"}>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>
            <label className="f">
              <span>Deal value</span>
              <input name="dealValue" type="number" step="0.01" defaultValue={initial.dealValueCents ? Number(initial.dealValueCents) / 100 : ""} placeholder="1950" />
            </label>
            <label className="f">
              <span>Currency</span>
              <select name="quotedCurrency" defaultValue={val(initial.quotedCurrency) || "GBP"}>
                <option value="GBP">GBP £</option>
                <option value="USD">USD $</option>
                <option value="AED">AED</option>
                <option value="EUR">EUR €</option>
                <option value="AUD">AUD A$</option>
                <option value="CAD">CAD C$</option>
                <option value="INR">INR ₹</option>
              </select>
            </label>
            <label className="f">
              <span>Next follow-up</span>
              <input name="nextFollowUpAt" type="date" defaultValue={val(initial.nextFollowUpAt)} />
            </label>
            <label className="f">
              <span>Tags</span>
              <input name="tags" defaultValue={val(initial.tags)} placeholder="dental, leeds, warm" />
            </label>
          </div>

          <div className="callout" style={{ borderColor: "var(--amber)", background: "var(--amber-soft)" }}>
            <b>Compliance — read before ticking.</b>
            <p style={{ margin: "6px 0 0" }}>
              Email opt-in: tick if this is a limited company/LLP (UK cold B2B email is lawful to them
              without prior consent under PECR Reg 22) or if they gave you their address.
              WhatsApp opt-in: tick <b>only</b> if they explicitly asked you to message them on WhatsApp.
              Cold WhatsApp is against Meta policy and UK PECR.
            </p>
          </div>

          <label className="check">
            <input type="checkbox" name="optedInEmail" defaultChecked={Boolean(initial.optedInEmail)} />
            <span>Email opt-in / lawful basis recorded</span>
          </label>
          <label className="check">
            <input type="checkbox" name="optedInWhatsapp" defaultChecked={Boolean(initial.optedInWhatsapp)} />
            <span>WhatsApp opt-in recorded (they asked me to message them)</span>
          </label>
          <label className="check">
            <input type="checkbox" name="doNotContact" defaultChecked={Boolean(initial.doNotContact)} />
            <span>Do not contact — block all outreach to this lead</span>
          </label>

          <label className="f" style={{ marginTop: 12 }}>
            <span>Notes</span>
            <textarea name="notes" rows={4} defaultValue={val(initial.notes)} />
          </label>
        </div>
      </div>

      <div className="row">
        <button className="btn primary" disabled={pending} type="submit">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

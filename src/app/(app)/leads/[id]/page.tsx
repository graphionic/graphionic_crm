import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { LEAD_STATUSES, statusTone, segmentTone, countryLabel, money } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { canSendFreeform } from "@/lib/whatsapp";
import { CopyButton } from "@/components/CopyButton";
import { Composer, WaSender, QuickActions } from "./lead-client";
import { isSuppressed } from "@/lib/actions/leads";

export const dynamic = "force-dynamic";

/** Build the email draft from the lead's own hook line — the personalisation. */
function draftEmail(lead: {
  contactName: string | null;
  companyName: string;
  hookLine: string | null;
  issues: string | null;
  businessCategory: string | null;
}, senderName: string) {
  const first = (lead.contactName || "there").split(" ")[0];
  const hook = lead.hookLine?.trim();
  const issues = (lead.issues || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const subject = hook
    ? `Quick note about ${lead.companyName.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}'s website`
    : `About ${lead.companyName}'s website`;

  const body = `${first},

${hook || `I had a look at ${lead.companyName}'s website this morning.`}
${
  issues.length
    ? `\nThree things I'd fix first:\n${issues.map((i, n) => `${n + 1}. ${i}`).join("\n")}\n`
    : ""
}
I build sites for ${lead.businessCategory?.toLowerCase() || "businesses like yours"} and recorded a
60-second walkthrough of exactly what I'd change — no charge, no pitch:

[PASTE LOOM LINK HERE]

If it's useful I'll send the fix list. If not, no follow-up from me.

${senderName}
[Your business] · [UK phone number]
[website]

--
You're receiving this because ${lead.companyName} is a registered UK company.
Reply "stop" and I won't contact you again. [privacy policy link]`;

  return { subject, body };
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireActiveUser();
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { activities: { orderBy: { createdAt: "desc" } } },
  });
  if (!lead) notFound();

  const [settings, suppressed, windowState] = await Promise.all([
    getSettings(),
    isSuppressed(lead),
    canSendFreeform(lead.lastInboundAt),
  ]);

  const waEnabled = settings.wa_enabled === "true";
  const waTemplates: Array<{ name: string; language: string }> = [];
  let waTplFetch: Array<{ name: string; language: string; status: string; category: string; body: string }> = [];
  if (waEnabled && settings.wa_access_token && settings.wa_business_account_id) {
    const { listTemplates } = await import("@/lib/whatsapp");
    const r = await listTemplates();
    if (r.ok) waTplFetch = r.templates ?? [];
    for (const t of waTplFetch) waTemplates.push({ name: t.name, language: t.language });
  }

  const { subject, body } = draftEmail(lead, user.name || "");

  const sup = await prisma.suppression.findMany({ take: 0 }); // keeps types stable
  void sup;

  const emailDisabled = Boolean(suppressed) || lead.doNotContact || !lead.optedInEmail;
  const emailDisabledReason = suppressed
    ? "This contact is on the suppression list — sending is blocked."
    : lead.doNotContact
      ? "Lead is marked do-not-contact."
      : !lead.optedInEmail
        ? "No email opt-in recorded for this contact. Tick the box below if you have a genuine basis to email them."
        : undefined;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="hstack" style={{ marginBottom: 6 }}>
            <Link className="btn sm ghost" href="/leads">← All leads</Link>
            <span className={`badge ${segmentTone(lead.segment)}`}>{lead.segment || "UNSET"}</span>
            <span className={`badge ${statusTone(lead.status)}`}>{lead.status.replace("_", " ")}</span>
            {lead.doNotContact ? <span className="badge red">DO NOT CONTACT</span> : null}
          </div>
          <h2>{lead.companyName}</h2>
          <p>
            {lead.businessCategory || "—"} · {lead.city || lead.region || "—"} ·{" "}
            {countryLabel(lead.country)} · score <b>{lead.score}</b>
          </p>
        </div>
        <div className="hstack">
          {lead.website ? (
            <a className="btn" href={lead.website} target="_blank" rel="noopener noreferrer nofollow">
              Visit site ↗
            </a>
          ) : null}
          {lead.linkedin ? (
            <a className="btn" href={lead.linkedin} target="_blank" rel="noopener noreferrer nofollow">
              LinkedIn ↗
            </a>
          ) : null}
        </div>
      </div>

      {lead.hookLine ? (
        <div className="card">
          <div className="card-head">
            <h3>Personalisation hook</h3>
            <CopyButton value={lead.hookLine} label="Copy hook" />
          </div>
          <div className="card-body">
            <div className="callout good" style={{ marginBottom: 10 }}>
              <p style={{ margin: 0 }}>{lead.hookLine}</p>
            </div>
            {lead.issues ? (
              <>
                <div className="small muted" style={{ fontWeight: 700, marginBottom: 5 }}>
                  DETECTED ISSUES
                </div>
                <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                  {lead.issues.split(";").map((i) => (
                    <li key={i}>{i.trim()}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid c2">
        <div>
          <Composer
            leadId={lead.id}
            email={lead.email}
            defaultSubject={subject}
            defaultBody={body}
            disabled={emailDisabled}
            disabledReason={emailDisabledReason}
            templates={waTplFetch}
          />
          <WaSender
            leadId={lead.id}
            number={lead.whatsapp || lead.phone}
            optedIn={lead.optedInWhatsapp}
            canFreeform={windowState.allowed}
            windowReason={windowState.reason}
            templates={waTemplates}
            waEnabled={waEnabled}
          />
        </div>

        <div>
          <QuickActions
            leadId={lead.id}
            status={lead.status}
            followUp={
              lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString().slice(0, 10) : ""
            }
          />

          <div className="card">
            <div className="card-head">
              <h3>Contact &amp; details</h3>
              <Link className="hint" href={`/leads/${lead.id}/edit`}>Edit →</Link>
            </div>
            <div className="card-body">
              <dl className="kv">
                <dt>Contact</dt>
                <dd>{lead.contactName || "—"}{lead.contactRole ? ` · ${lead.contactRole}` : ""}</dd>
                <dt>Email</dt>
                <dd>{lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : "—"}</dd>
                <dt>Phone</dt>
                <dd>{lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : "—"}</dd>
                <dt>WhatsApp</dt>
                <dd>{lead.whatsapp || "—"}</dd>
                <dt>Website</dt>
                <dd>
                  {lead.website ? (
                    <a href={lead.website} target="_blank" rel="noopener noreferrer nofollow">
                      {lead.website}
                    </a>
                  ) : <span className="muted">none found</span>}
                </dd>
                <dt>Address</dt>
                <dd>{lead.address || "—"}{lead.postcode ? `, ${lead.postcode}` : ""}</dd>
                <dt>Company no.</dt>
                <dd>{lead.companyNumber || "—"}</dd>
                <dt>Source</dt>
                <dd>{lead.source || "—"}</dd>
                <dt>Value</dt>
                <dd>{money(lead.dealValueCents, lead.quotedCurrency || "USD")}</dd>
                <dt>Email opt-in</dt>
                <dd>{lead.optedInEmail ? <span className="badge green">Yes</span> : <span className="badge red">No</span>}</dd>
                <dt>WA opt-in</dt>
                <dd>{lead.optedInWhatsapp ? <span className="badge green">Yes</span> : <span className="badge red">No</span>}</dd>
                <dt>Last email</dt>
                <dd>{lead.lastEmailAt ? lead.lastEmailAt.toLocaleString("en-GB") : "—"}</dd>
                <dt>Last WhatsApp</dt>
                <dd>{lead.lastWhatsappAt ? lead.lastWhatsappAt.toLocaleString("en-GB") : "—"}</dd>
                <dt>Last inbound</dt>
                <dd>{lead.lastInboundAt ? lead.lastInboundAt.toLocaleString("en-GB") : "never"}</dd>
                <dt>Created</dt>
                <dd>{lead.createdAt.toLocaleDateString("en-GB")}</dd>
              </dl>
              {lead.notes ? (
                <>
                  <div style={{ borderTop: "1px solid var(--line-2)", margin: "14px 0" }} />
                  <div className="small muted" style={{ fontWeight: 700, marginBottom: 4 }}>NOTES</div>
                  <p className="small" style={{ whiteSpace: "pre-wrap" }}>{lead.notes}</p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Activity timeline</h3>
          <span className="hint">{lead.activities.length} entries</span>
        </div>
        <div className="card-body">
          {lead.activities.length === 0 ? (
            <p className="muted">Nothing yet. Sends, notes, status changes and replies all appear here.</p>
          ) : (
            <ul className="timeline">
              {lead.activities.map((a) => (
                <li key={a.id} className={a.type}>
                  <div className="t-top">
                    <span className={`badge ${a.type === "WHATSAPP" ? "wa" : a.direction === "IN" ? "green" : "blue"}`}>
                      {a.direction === "IN" ? "↓ IN" : "↑ OUT"} · {a.type}
                    </span>
                    {a.status ? <span className="badge slate">{a.status}</span> : null}
                    {a.templateName ? <span className="badge slate">{a.templateName}</span> : null}
                    <span className="t-when">{a.createdAt.toLocaleString("en-GB")}</span>
                  </div>
                  {a.subject ? <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.subject}</div> : null}
                  {a.body ? <div className="t-body">{a.body}</div> : null}
                  {a.error ? <div className="small" style={{ color: "var(--red)" }}>⚠ {a.error}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Pipeline stage</h3></div>
        <div className="card-body">
          <div className="row">
            {LEAD_STATUSES.map((s) => (
              <span key={s.value} className={`badge ${lead.status === s.value ? statusTone(s.value) : "slate"}`}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import { SuppressionForm, SuppressionRow, WebhookSecretForm } from "./client";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  await requireActiveUser();

  const [suppressions, counts] = await Promise.all([
    prisma.suppression.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.lead.groupBy({ by: ["optedInEmail", "optedInWhatsapp"], _count: { _all: true } }),
  ]);

  const emailOptIn = counts
    .filter((c) => c.optedInEmail)
    .reduce((n, c) => n + c._count._all, 0);
  const waOptIn = counts
    .filter((c) => c.optedInWhatsapp)
    .reduce((n, c) => n + c._count._all, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Compliance &amp; suppression</h2>
          <p>The rules below are enforced in code — you can&apos;t accidentally bypass them from the UI.</p>
        </div>
      </div>

      <div className="grid c3">
        <div className="stat"><div className="k">Email opt-in</div><div className="v">{emailOptIn}</div><div className="d">leads you may email</div></div>
        <div className="stat"><div className="k">WhatsApp opt-in</div><div className="v">{waOptIn}</div><div className="d">leads you may WhatsApp</div></div>
        <div className="stat bad"><div className="k">Suppressed</div><div className="v">{suppressions.length}</div><div className="d">never contact again</div></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Rules the sending layer enforces</h3></div>
        <div className="card-body">
          <table className="t">
            <thead><tr><th>Rule</th><th>Behaviour</th></tr></thead>
            <tbody>
              <tr>
                <td><b>UK cold B2B email</b></td>
                <td>Allowed to Ltd / LLP / PLC companies without prior consent (PECR Reg 22 — corporate subscribers). Imported Companies House rows are auto-ticked for email opt-in.</td>
              </tr>
              <tr>
                <td><b>Sole traders &amp; individuals</b></td>
                <td>Treated as individual subscribers — need consent. Don&apos;t add them without a genuine basis.</td>
              </tr>
              <tr>
                <td><b>Email send</b></td>
                <td>Blocked if: do-not-contact is set, the address is on the suppression list, or no opt-in is recorded.</td>
              </tr>
              <tr>
                <td><b>WhatsApp send</b></td>
                <td>Blocked unless opt-in is recorded. Free-form text additionally blocked outside the 24h window — only approved templates can be sent then.</td>
              </tr>
              <tr>
                <td><b>Opt-out handling</b></td>
                <td>Any &quot;stop&quot;/&quot;unsubscribe&quot; reply must be actioned the same day. Use <b>Suppress</b> on the lead — it blocks email, phone and WhatsApp in one click.</td>
              </tr>
              <tr>
                <td><b>Every send is logged</b></td>
                <td>Success or failure, with the exact body, so you can prove what was sent and when.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Suppression list</h3>
          <span className="hint">Email addresses and phone numbers that must never be contacted</span>
        </div>
        <div className="card-body">
          <SuppressionForm />
        </div>
        <div className="card-body tight">
          {suppressions.length === 0 ? (
            <div className="empty">
              <b>Nothing suppressed</b>
              When someone asks you to stop, add them here — or click <b>Suppress</b> on their lead.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead><tr><th>Value</th><th>Reason</th><th>Added</th><th></th></tr></thead>
                <tbody>
                  {suppressions.map((s) => (
                    <SuppressionRow
                      key={s.id}
                      id={s.id}
                      value={s.value}
                      reason={s.reason || ""}
                      added={s.createdAt.toLocaleDateString("en-GB")}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Inbound webhook secret</h3></div>
        <div className="card-body">
          <p className="small muted">
            Protects the incoming-email webhook. Generate one with{" "}
            <code>openssl rand -hex 24</code> and send it as{" "}
            <code>?secret=…</code> or an <code>x-webhook-secret</code> header.
          </p>
          <WebhookSecretForm hasSecret={Boolean(await getSetting("watch_secret"))} />
        </div>
      </div>

      <div className="callout">
        <b>Retention:</b> keep consent records and import sources for as long as you hold the data.
        Every lead stores its <code>source</code> and creation date, which is your Article 14 /
        legitimate-interest audit trail. If someone asks what data you hold on them, export the lead
        row and delete it if they request erasure.
      </div>
    </>
  );
}

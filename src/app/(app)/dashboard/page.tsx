import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { LEAD_STATUSES, SEGMENTS, statusTone, segmentTone, countryLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function DashboardPage() {
  const user = await requireActiveUser();
  const now = new Date();
  const day = startOfDay();
  const week = new Date(now.getTime() - 7 * 864e5);

  const [
    total,
    byStatus,
    byCountry,
    bySegment,
    emailsToday,
    emailsWeek,
    waWeek,
    repliesWeek,
    dueFollowUps,
    recentActivity,
    hot,
  ] = await Promise.all([
    prisma.lead.count({ where: { doNotContact: false } }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["country"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["segment"], _count: { _all: true } }),
    prisma.activity.count({ where: { type: "EMAIL", direction: "OUT", createdAt: { gte: day } } }),
    prisma.activity.count({ where: { type: "EMAIL", direction: "OUT", createdAt: { gte: week } } }),
    prisma.activity.count({ where: { type: "WHATSAPP", direction: "OUT", createdAt: { gte: week } } }),
    prisma.activity.count({ where: { direction: "IN", createdAt: { gte: week } } }),
    prisma.lead.findMany({
      where: {
        nextFollowUpAt: { lte: new Date(now.getTime() + 864e5) },
        doNotContact: false,
        status: { notIn: ["WON", "LOST"] },
      },
      orderBy: { nextFollowUpAt: "asc" },
      take: 8,
    }),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { lead: { select: { id: true, companyName: true, country: true } } },
    }),
    prisma.lead.findMany({
      where: { segment: "NO_SITE", doNotContact: false, status: { notIn: ["WON", "LOST"] } },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
  const segMap = Object.fromEntries(bySegment.map((s) => [s.segment ?? "UNSET", s._count._all]));
  const countryMap = Object.fromEntries(byCountry.map((c) => [c.country, c._count._all]));
  const maxStatus = Math.max(1, ...Object.values(statusMap));
  const contacted = (statusMap.CONTACTED ?? 0) + (statusMap.REPLIED ?? 0) +
    (statusMap.CALL_BOOKED ?? 0) + (statusMap.PROPOSAL_SENT ?? 0) + (statusMap.WON ?? 0);

  const replyRate = emailsWeek > 0 ? ((repliesWeek / emailsWeek) * 100).toFixed(1) : "0.0";

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Dashboard</h2>
          <p>
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""} — here&apos;s where
            your outreach stands today.
          </p>
        </div>
        <div className="hstack">
          <Link className="btn" href="/import">⇪ Import CSV</Link>
          <Link className="btn primary" href="/leads/new">＋ New lead</Link>
        </div>
      </div>

      <div className="grid c4" style={{ marginBottom: 18 }}>
        <div className="stat accent">
          <div className="k">Total leads</div>
          <div className="v">{total.toLocaleString()}</div>
          <div className="d">{bySegment.find((s) => s.segment === "NO_SITE")?._count._all ?? 0} with no website</div>
        </div>
        <div className="stat">
          <div className="k">Contacted</div>
          <div className="v">{contacted.toLocaleString()}</div>
          <div className="d">Any outreach sent</div>
        </div>
        <div className="stat">
          <div className="k">Emails sent</div>
          <div className="v">{emailsWeek.toLocaleString()}</div>
          <div className="d">{emailsToday} today</div>
        </div>
        <div className="stat good">
          <div className="k">Replies (7d)</div>
          <div className="v">{repliesWeek}</div>
          <div className="d">{replyRate}% of emails sent</div>
        </div>
      </div>

      <div className="grid c3">
        {/* pipeline */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div className="card-head">
            <h3>Pipeline</h3>
            <Link className="hint" href="/leads">View all leads →</Link>
          </div>
          <div className="card-body">
            {LEAD_STATUSES.map((s) => {
              const n = statusMap[s.value] ?? 0;
              const pct = (n / maxStatus) * 100;
              const colors: Record<string, string> = {
                green: "var(--green)", amber: "#d97706", red: "var(--red)",
                blue: "var(--brand)", violet: "var(--violet)", cyan: "var(--cyan)",
                indigo: "var(--brand)", slate: "#94a3b8",
              };
              return (
                <div className="bar-row" key={s.value}>
                  <span className="lbl">{s.label}</span>
                  <span className="track">
                    <i style={{ width: `${pct}%`, background: colors[s.tone] ?? "var(--brand)" }} />
                  </span>
                  <span className="val">{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* segments */}
        <div className="card">
          <div className="card-head"><h3>By website state</h3></div>
          <div className="card-body">
            {SEGMENTS.map((s) => {
              const n = segMap[s.value] ?? 0;
              return (
                <div className="bar-row" key={s.value}>
                  <span className="lbl">{s.label}</span>
                  <span className="track"><i style={{ width: `${(n / Math.max(1, total)) * 100}%`, background: "var(--brand)" }} /></span>
                  <span className="val">{n}</span>
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid var(--line-2)", marginTop: 14, paddingTop: 12 }}>
              <div className="k small muted" style={{ marginBottom: 8, fontWeight: 700 }}>BY COUNTRY</div>
              {Object.entries(countryMap).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
                <div className="hstack" key={c} style={{ marginBottom: 6 }}>
                  <span className="badge">{c}</span>
                  <span className="small muted">{countryLabel(c)}</span>
                  <span className="spacer" />
                  <b>{n}</b>
                </div>
              ))}
              {Object.keys(countryMap).length === 0 ? <p className="muted small">No leads yet.</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid c2">
        {/* follow ups */}
        <div className="card">
          <div className="card-head">
            <h3>Follow-ups due</h3>
            <Link className="hint" href="/follow-ups">All →</Link>
          </div>
          <div className="card-body tight">
            {dueFollowUps.length === 0 ? (
              <div className="empty">
                <b>Nothing due</b>
                Set a follow-up date on a lead to see it here.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="t">
                  <tbody>
                    {dueFollowUps.map((l) => {
                      const overdue = l.nextFollowUpAt && l.nextFollowUpAt < now;
                      return (
                        <tr key={l.id}>
                          <td>
                            <Link className="name" href={`/leads/${l.id}`}>{l.companyName}</Link>
                            <div className="sub">{l.contactName || l.email || "—"}</div>
                          </td>
                          <td className="right">
                            <span className={`badge ${overdue ? "red" : "amber"}`}>
                              {overdue ? "OVERDUE" : "DUE"}
                            </span>
                            <div className="sub">{l.nextFollowUpAt?.toLocaleDateString("en-GB")}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* hot leads */}
        <div className="card">
          <div className="card-head">
            <h3>Hottest leads — no website</h3>
            <span className="hint">Highest score first</span>
          </div>
          <div className="card-body tight">
            {hot.length === 0 ? (
              <div className="empty"><b>No no-site leads</b>Import a list to get started.</div>
            ) : (
              <div className="table-wrap">
                <table className="t">
                  <tbody>
                    {hot.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <Link className="name" href={`/leads/${l.id}`}>{l.companyName}</Link>
                          <div className="sub">{l.city || l.region || "—"} · {l.businessCategory || "—"}</div>
                        </td>
                        <td className="right">
                          <span className={`badge ${segmentTone(l.segment)}`}>{l.segment}</span>
                          <div className="sub">score {l.score}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* activity */}
      <div className="card">
        <div className="card-head">
          <h3>Recent activity</h3>
          <Link className="hint" href="/outbox">Message log →</Link>
        </div>
        <div className="card-body tight">
          {recentActivity.length === 0 ? (
            <div className="empty">
              <b>No activity yet</b>
              Sends, notes and status changes will appear here.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th>Lead</th>
                    <th>Detail</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((a) => (
                    <tr key={a.id}>
                      <td className="nowrap sub">{a.createdAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td>
                        <span className={`badge ${a.type === "WHATSAPP" ? "wa" : a.direction === "IN" ? "green" : "blue"}`}>
                          {a.direction === "IN" ? "↓ " : "↑ "}{a.type}
                        </span>
                      </td>
                      <td>
                        <Link className="name" href={`/leads/${a.lead.id}`}>{a.lead.companyName}</Link>
                      </td>
                      <td className="sub" style={{ maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.subject || a.body || "—"}
                      </td>
                      <td>
                        {a.status ? (
                          <span className={`badge ${a.status === "sent" || a.status === "received" ? "green" : a.status === "failed" ? "red" : "slate"}`}>
                            {a.status}
                          </span>
                        ) : <span className="muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

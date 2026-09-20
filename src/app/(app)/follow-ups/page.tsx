import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { statusTone, segmentTone } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  await requireActiveUser();
  const now = new Date();

  const [overdue, today, upcoming, noFollowUp] = await Promise.all([
    prisma.lead.findMany({
      where: { nextFollowUpAt: { lt: new Date(now.toDateString()) }, doNotContact: false, status: { notIn: ["WON", "LOST"] } },
      orderBy: { nextFollowUpAt: "asc" },
    }),
    prisma.lead.findMany({
      where: {
        nextFollowUpAt: { gte: new Date(now.toDateString()), lt: new Date(new Date(now.toDateString()).getTime() + 864e5) },
        doNotContact: false,
      },
      orderBy: { nextFollowUpAt: "asc" },
    }),
    prisma.lead.findMany({
      where: {
        nextFollowUpAt: { gte: new Date(new Date(now.toDateString()).getTime() + 864e5), lte: new Date(now.getTime() + 14 * 864e5) },
        doNotContact: false,
      },
      orderBy: { nextFollowUpAt: "asc" },
      take: 40,
    }),
    prisma.lead.count({
      where: { nextFollowUpAt: null, doNotContact: false, status: { in: ["NEW", "QUALIFIED"] } },
    }),
  ]);

  const Section = ({
    title,
    hint,
    leads,
    tone,
  }: {
    title: string;
    hint: string;
    leads: Array<{ id: string; companyName: string; contactName: string | null; email: string | null; city: string | null; status: string; segment: string | null; score: number; nextFollowUpAt: Date | null }>;
    tone: string;
  }) => (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
        <span className="hint">{hint}</span>
      </div>
      <div className="card-body tight">
        {leads.length === 0 ? (
          <div className="empty"><b>Nothing here</b>All clear.</div>
        ) : (
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Company</th><th>Contact</th><th>Location</th><th>Site</th>
                  <th>Status</th><th>Due</th><th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link className="name" href={`/leads/${l.id}`}>{l.companyName}</Link>
                      <div className="sub">score {l.score}</div>
                    </td>
                    <td className="sub">{l.contactName || l.email || "—"}</td>
                    <td className="sub">{l.city || "—"}</td>
                    <td><span className={`badge ${segmentTone(l.segment)}`}>{l.segment || "—"}</span></td>
                    <td><span className={`badge ${statusTone(l.status)}`}>{l.status.replace("_", " ")}</span></td>
                    <td>
                      {l.nextFollowUpAt ? (
                        <span className={`badge ${tone}`}>
                          {l.nextFollowUpAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td className="right"><Link className="btn sm" href={`/leads/${l.id}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Follow-ups</h2>
          <p>Scheduled and overdue next-touches. Set one on any lead from its detail page.</p>
        </div>
        <Link className="btn" href="/leads?status=NEW&sort=score">Work the new leads →</Link>
      </div>

      {noFollowUp > 0 ? (
        <div className="callout warn">
          <b>{noFollowUp} qualified leads have no follow-up date set.</b>{" "}
          <Link href="/leads?status=NEW&sort=score">Open them</Link> and schedule the next touch so they
          don&apos;t go cold.
        </div>
      ) : null}

      <Section title="Overdue" hint={`${overdue.length} leads`} leads={overdue} tone="red" />
      <Section title="Due today" hint={`${today.length} leads`} leads={today} tone="amber" />
      <Section title="Next 14 days" hint={`${upcoming.length} leads`} leads={upcoming} tone="blue" />
    </>
  );
}

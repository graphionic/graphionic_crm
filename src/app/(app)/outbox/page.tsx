import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OutboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireActiveUser();
  const sp = await searchParams;
  const type = sp.type || "";
  const page = Math.max(1, Number(sp.page || 1));
  const PAGE_SIZE = 50;

  const where = {
    ...(type ? { type } : {}),
    direction: "OUT" as const,
  };

  const [rows, total, counts] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { lead: { select: { id: true, companyName: true, country: true } } },
    }),
    prisma.activity.count({ where }),
    prisma.activity.groupBy({
      by: ["type"],
      where: { direction: "OUT" },
      _count: { _all: true },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cMap = Object.fromEntries(counts.map((c) => [c.type, c._count._all]));

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Outbox</h2>
          <p>Every message sent, with status and delivery result.</p>
        </div>
      </div>

      <div className="grid c4" style={{ marginBottom: 18 }}>
        <div className="stat accent"><div className="k">Emails</div><div className="v">{cMap.EMAIL ?? 0}</div></div>
        <div className="stat"><div className="k">WhatsApp</div><div className="v">{cMap.WHATSAPP ?? 0}</div></div>
        <div className="stat"><div className="k">Calls</div><div className="v">{cMap.CALL ?? 0}</div></div>
        <div className="stat"><div className="k">Notes</div><div className="v">{cMap.NOTE ?? 0}</div></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="tabs" style={{ marginBottom: 0, borderBottom: "none" }}>
            <Link className={!type ? "on" : ""} href="/outbox">All</Link>
            <Link className={type === "EMAIL" ? "on" : ""} href="/outbox?type=EMAIL">Email</Link>
            <Link className={type === "WHATSAPP" ? "on" : ""} href="/outbox?type=WHATSAPP">WhatsApp</Link>
            <Link className={type === "NOTE" ? "on" : ""} href="/outbox?type=NOTE">Notes</Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body tight">
          {rows.length === 0 ? (
            <div className="empty">
              <b>Nothing sent yet</b>
              Once you send from a lead page, it appears here.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>When</th><th>Type</th><th>To</th><th>Subject / body</th>
                    <th>Template</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td className="sub nowrap">{a.createdAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td>
                        <span className={`badge ${a.type === "WHATSAPP" ? "wa" : "blue"}`}>{a.type}</span>
                      </td>
                      <td>
                        <Link className="name" href={`/leads/${a.lead.id}`}>{a.lead.companyName}</Link>
                        <div className="sub">{a.lead.country}</div>
                      </td>
                      <td className="sub" style={{ maxWidth: 340 }}>
                        {a.subject ? <div style={{ fontWeight: 600, color: "var(--ink)" }}>{a.subject}</div> : null}
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.body || "—"}
                        </div>
                        {a.error ? <div style={{ color: "var(--red)" }}>⚠ {a.error}</div> : null}
                      </td>
                      <td className="sub">{a.templateName || a.channel || "—"}</td>
                      <td>
                        <span className={`badge ${a.status === "sent" ? "green" : a.status === "failed" ? "red" : "slate"}`}>
                          {a.status || "—"}
                        </span>
                      </td>
                      <td className="right"><Link className="btn sm" href={`/leads/${a.lead.id}`}>Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {pages > 1 ? (
        <div className="hstack" style={{ justifyContent: "center" }}>
          {page > 1 ? <Link className="btn sm" href={`/outbox?${new URLSearchParams({ ...(type ? { type } : {}), page: String(page - 1) })}`}>← Previous</Link> : null}
          <span className="small muted">Page {page} of {pages}</span>
          {page < pages ? <Link className="btn sm" href={`/outbox?${new URLSearchParams({ ...(type ? { type } : {}), page: String(page + 1) })}`}>Next →</Link> : null}
        </div>
      ) : null}
    </>
  );
}

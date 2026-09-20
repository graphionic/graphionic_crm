import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { LEAD_STATUSES, SEGMENTS, COUNTRIES, statusTone, segmentTone } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireActiveUser();
  const sp = await searchParams;

  const q = (sp.q || "").trim();
  const status = sp.status || "";
  const segment = sp.segment || "";
  const country = sp.country || "";
  const sort = sp.sort || "score";
  const page = Math.max(1, Number(sp.page || 1));

  const where: Prisma.LeadWhereInput = {
    ...(q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { businessCategory: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(segment ? { segment } : {}),
    ...(country ? { country } : {}),
  };

  const orderBy: Prisma.LeadOrderByWithRelationInput[] =
    sort === "recent"
      ? [{ createdAt: "desc" }]
      : sort === "name"
        ? [{ companyName: "asc" }]
        : sort === "followup"
          ? [{ nextFollowUpAt: "asc" }]
          : [{ score: "desc" }, { createdAt: "desc" }];

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { activities: true } } },
    }),
    prisma.lead.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, status, segment, country, sort, page, ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
    }
    const s = p.toString();
    return `/leads${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Leads</h2>
          <p>{total.toLocaleString()} leads match your filters.</p>
        </div>
        <div className="hstack">
          <Link className="btn" href="/import">⇪ Import</Link>
          <Link className="btn primary" href="/leads/new">＋ New lead</Link>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form method="get" className="filters">
            <label className="f wide">
              <span>Search</span>
              <input name="q" defaultValue={q} placeholder="Company, contact, email, city, phone…" />
            </label>
            <label className="f">
              <span>Status</span>
              <select name="status" defaultValue={status}>
                <option value="">All statuses</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="f">
              <span>Website state</span>
              <select name="segment" defaultValue={segment}>
                <option value="">Any</option>
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="f">
              <span>Country</span>
              <select name="country" defaultValue={country}>
                <option value="">All</option>
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="f">
              <span>Sort</span>
              <select name="sort" defaultValue={sort}>
                <option value="score">Best score</option>
                <option value="recent">Newest</option>
                <option value="name">Name A–Z</option>
                <option value="followup">Follow-up date</option>
              </select>
            </label>
            <button className="btn primary" type="submit">Apply</button>
            {q || status || segment || country ? (
              <Link className="btn ghost" href="/leads">Clear</Link>
            ) : null}
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body tight">
          {leads.length === 0 ? (
            <div className="empty">
              <b>No leads found</b>
              {total === 0 && !q && !status && !segment && !country ? (
                <>Import a CSV or add one manually to get started.</>
              ) : (
                <>Try clearing the filters, or <Link href="/leads">view everything</Link>.</>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Country</th>
                    <th>Site</th>
                    <th className="num">Score</th>
                    <th>Status</th>
                    <th>Sent</th>
                    <th>Follow-up</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link className="name" href={`/leads/${l.id}`}>{l.companyName}</Link>
                        <div className="sub">
                          {l.businessCategory || "—"}
                          {l.city ? ` · ${l.city}` : ""}
                        </div>
                      </td>
                      <td>
                        {l.contactName ? <div>{l.contactName}</div> : <span className="muted">—</span>}
                        <div className="sub">{l.email || l.phone || "no contact details"}</div>
                      </td>
                      <td><span className="badge">{l.country}</span></td>
                      <td>
                        <span className={`badge ${segmentTone(l.segment)}`}>{l.segment || "—"}</span>
                        {l.website ? (
                          <div className="sub" style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <a href={l.website} target="_blank" rel="noopener noreferrer nofollow">{l.website.replace(/^https?:\/\//, "")}</a>
                          </div>
                        ) : null}
                      </td>
                      <td className="num"><b>{l.score}</b></td>
                      <td><span className={`badge ${statusTone(l.status)}`}>{l.status.replace("_", " ")}</span></td>
                      <td className="sub nowrap">
                        {l.emailSentCount > 0 ? <>✉ {l.emailSentCount}</> : null}
                        {l.whatsappSentCount > 0 ? <> <span style={{ color: "var(--green-wa)" }}>◍ {l.whatsappSentCount}</span></> : null}
                        {l.emailSentCount === 0 && l.whatsappSentCount === 0 ? <span className="muted">—</span> : null}
                      </td>
                      <td className="sub nowrap">
                        {l.nextFollowUpAt ? (
                          <span className={l.nextFollowUpAt < new Date() ? "badge red" : "badge amber"}>
                            {l.nextFollowUpAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </span>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td className="right">
                        <Link className="btn sm" href={`/leads/${l.id}`}>Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {pages > 1 ? (
        <div className="hstack" style={{ justifyContent: "center", gap: 8 }}>
          {page > 1 ? <Link className="btn sm" href={qs({ page: page - 1 })}>← Previous</Link> : null}
          <span className="small muted">Page {page} of {pages}</span>
          {page < pages ? <Link className="btn sm" href={qs({ page: page + 1 })}>Next →</Link> : null}
        </div>
      ) : null}
    </>
  );
}

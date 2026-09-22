"use client";
import { useEffect, useState } from "react";

type LiveData = {
  timestamp: string;
  crm: { total: number; withEmail: number; noSite: number; target: number; progress: number };
  file: { exists: boolean; rows: number; path: string };
  collectors: { pid: string; cmd: string; running: boolean }[];
  lastLeads: { company: string; category: string; email: string; phone: string; city: string; country?: string }[];
  byCountry: { country: string; _count: { _all: number } }[];
  byCategory: { businessCategory: string; _count: { _all: number } }[];
  status: string;
  message: string;
};

export default function LiveCollectionWidget() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchLive() {
    try {
      const res = await fetch("/api/live", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 5000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div className="card-head"><h3>🔴 Live Collection</h3><span className="hint">Loading...</span></div>
        <div className="card-body"><div className="empty">Loading live data...</div></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <div className="card-head"><h3>🔴 Live Collection</h3></div>
        <div className="card-body"><div className="empty">No data</div></div>
      </div>
    );
  }

  const isRunning = data.status === "running";
  const pct = Math.min(100, data.crm.progress);

  return (
    <div className="card" style={{ borderLeft: `4px solid ${isRunning ? "#22c55e" : "#ef4444"}` }}>
      <div className="card-head">
        <h3>🔴 Live Collection — Never Stops</h3>
        <span className={`badge ${isRunning ? "green" : "red"}`}>{isRunning ? "RUNNING" : "STOPPED"}</span>
      </div>
      <div className="card-body">
        {/* Status message - Never Stops */}
        <div style={{ 
          background: isRunning ? "#f0fdf4" : "#fef2f2", 
          border: `1px solid ${isRunning ? "#bbf7d0" : "#fecaca"}`, 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 600,
          color: isRunning ? "#15803d" : "#b91c1c"
        }}>
          {isRunning ? "✅" : "⚠️"} {data.message}
          {!isRunning && (
            <div style={{ marginTop: 8, fontSize: 11, fontWeight: 400 }}>
              Collector stopped — Overpass 504/429 or crash. Will auto-restart in 10 sec via watchdog. If stays stopped &gt;2 min, tell me. 🔴 Live auto-refresh every 5 sec
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="grid c3" style={{ marginBottom: 16 }}>
          <div className="stat" style={{ padding: 12 }}>
            <div className="k">CRM Total</div>
            <div className="v" style={{ fontSize: 22 }}>{data.crm.total} / {data.crm.target}</div>
            <div className="d">{pct}% — {data.crm.noSite} TRUE NO_SITE</div>
            <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, marginTop: 8 }}>
              <div style={{ width: `${pct}%`, height: 6, background: isRunning ? "#22c55e" : "#ef4444", borderRadius: 4, transition: "width 0.5s" }} />
            </div>
          </div>
          <div className="stat" style={{ padding: 12 }}>
            <div className="k">File Rows</div>
            <div className="v" style={{ fontSize: 22 }}>{data.file.rows}</div>
            <div className="d" style={{ wordBreak: "break-all", fontSize: 11 }}>{data.file.exists ? data.file.path : "Vercel (DB only)"}</div>
          </div>
          <div className="stat" style={{ padding: 12 }}>
            <div className="k">Collectors</div>
            <div className="v" style={{ fontSize: 22, color: isRunning ? "#22c55e" : "#ef4444" }}>{data.collectors.length} running</div>
            <div className="d">{isRunning ? "Chain unbroken" : "Chain broken!"}</div>
          </div>
        </div>

        {/* Country + Category breakdown */}
        <div className="grid c2" style={{ marginBottom: 16 }}>
          <div>
            <div className="k small muted" style={{ marginBottom: 6, fontWeight: 700 }}>BY COUNTRY</div>
            <div className="hstack" style={{ flexWrap: "wrap", gap: 6 }}>
              {data.byCountry?.map((c) => (
                <span key={c.country} className="badge" style={{ fontSize: 12 }}>
                  {c.country}: {c._count._all}
                </span>
              ))}
              {(!data.byCountry || data.byCountry.length === 0) && <span className="muted small">No data</span>}
            </div>
          </div>
          <div>
            <div className="k small muted" style={{ marginBottom: 6, fontWeight: 700 }}>BY CATEGORY</div>
            <div className="hstack" style={{ flexWrap: "wrap", gap: 6 }}>
              {data.byCategory?.map((c) => (
                <span key={c.businessCategory || "unknown"} className="badge slate" style={{ fontSize: 12 }}>
                  {c.businessCategory || "unknown"}: {c._count._all}
                </span>
              ))}
              {(!data.byCategory || data.byCategory.length === 0) && <span className="muted small">No data</span>}
            </div>
          </div>
        </div>

        {/* Last leads + collectors */}
        <div className="grid c2">
          <div>
            <div className="k small muted" style={{ marginBottom: 8, fontWeight: 700 }}>LAST 10 LEADS (LIVE)</div>
            <div className="table-wrap" style={{ maxHeight: 280, overflow: "auto" }}>
              <table className="t" style={{ fontSize: 12 }}>
                <thead><tr><th>Company</th><th>Email</th><th>Country</th></tr></thead>
                <tbody>
                  {data.lastLeads.slice(0, 10).map((l, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.company}</td>
                      <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.email}</td>
                      <td><span className="badge">{l.country || l.city || "—"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="k small muted" style={{ marginBottom: 8, fontWeight: 700 }}>COLLECTORS (LIVE)</div>
            {data.collectors.map((c, i) => (
              <div key={i} style={{ padding: 8, background: c.running ? "#f0fdf4" : "#fef2f2", border: `1px solid ${c.running ? "#bbf7d0" : "#fecaca"}`, borderRadius: 6, marginBottom: 6, fontSize: 11 }}>
                <div><b>PID {c.pid}</b> — {c.running ? "🟢 Running" : "🔴 Stopped"}</div>
                <div style={{ wordBreak: "break-all", color: "#666", marginTop: 4 }}>{c.cmd}</div>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: 10, background: "#f9fafb", borderRadius: 6, fontSize: 11 }}>
              <b>Rule:</b> NO website + email (phone optional) — TRUE NO_SITE verified (email domain has no live site, prevents Emma Clinic type)<br/>
              <b>Target:</b> 200 in 2 hours — 6 countries: UK, US, Dubai, AU, SG, TH<br/>
              <b>Live:</b> Auto-refresh 5s — works on Vercel via DB heartbeat
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: "#666" }}>
          Last update: {new Date(data.timestamp).toLocaleTimeString()} — <a href="/live" className="hint">Open full live page →</a>
        </div>
      </div>
    </div>
  );
}

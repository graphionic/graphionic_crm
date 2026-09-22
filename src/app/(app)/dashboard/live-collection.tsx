"use client";
import { useEffect, useState } from "react";

type LiveData = {
  timestamp: string;
  crm: { total: number; withEmail: number; noSite: number; target: number; progress: number };
  file: { exists: boolean; rows: number; path: string };
  collectors: { pid: string; cmd: string; running: boolean }[];
  lastLeads: { company: string; category: string; email: string; phone: string; city: string; country?: string }[];
  status: string;
  message: string;
};

export default function LiveCollectionWidget() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);

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

  async function handleRestart() {
    setRestarting(true);
    try {
      const res = await fetch("/api/restart", { method: "POST", cache: "no-store" });
      const json = await res.json();
      alert(json.message || "Restart triggered");
      setTimeout(fetchLive, 3000);
    } catch (e) {
      alert("Restart failed, check logs");
    } finally {
      setRestarting(false);
    }
  }

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 5000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: 12 }}>
        <div className="hstack" style={{ justifyContent: "space-between" }}>
          <span>🔴 Live Collection</span>
          <span className="hint">Loading...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ padding: 12 }}>
        <div className="hstack" style={{ justifyContent: "space-between" }}>
          <span>🔴 Live Collection</span>
          <span className="badge red">No data</span>
        </div>
      </div>
    );
  }

  const isRunning = data.status === "running";
  const pct = Math.min(100, data.crm.progress);

  return (
    <div className="card" style={{ padding: 12, borderLeft: `4px solid ${isRunning ? "#22c55e" : "#ef4444"}` }}>
      <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div className="hstack" style={{ gap: 10, alignItems: "center" }}>
          <span style={{ fontWeight: 700 }}>🔴 Live</span>
          <span className={`badge ${isRunning ? "green" : "red"}`} style={{ fontSize: 11 }}>
            {isRunning ? "RUNNING" : "STOPPED"}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            {data.crm.total}/{data.crm.target} ({pct}%)
          </span>
          <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: 6, background: isRunning ? "#22c55e" : "#ef4444", transition: "width 0.5s" }} />
          </div>
          <span className="hint" style={{ fontSize: 11 }}>
            {data.file.rows} rows • {data.collectors.length} proc • TRUE verified
          </span>
        </div>
        <div className="hstack" style={{ gap: 8 }}>
          {!isRunning && (
            <button
              onClick={handleRestart}
              disabled={restarting}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: restarting ? "not-allowed" : "pointer",
              }}
            >
              {restarting ? "Restarting..." : "🔄 Restart"}
            </button>
          )}
          <a href="/live" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
            View Live →
          </a>
        </div>
      </div>
      {!isRunning && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#b91c1c", background: "#fef2f2", padding: 6, borderRadius: 4 }}>
          ⚠️ {data.message} — Click Restart or will auto-restart in 10 sec
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

type LiveData = {
  timestamp: string;
  crm: { total: number; withEmail: number; target: number; progress: number };
  file: { exists: boolean; rows: number; path: string };
  collectors: { pid: string; cmd: string; running: boolean }[];
  lastLeads: { company: string; category: string; email: string; phone: string; city: string }[];
  status: string;
  message: string;
  error?: string;
};

export default function LivePage() {
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
      alert(json.message || "Restart triggered - will auto-restart in 10 sec");
      setTimeout(fetchLive, 3000);
    } catch (e) {
      alert("Restart failed");
    } finally {
      setRestarting(false);
    }
  }

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 5000); // every 5 sec
    return () => clearInterval(id);
  }, []);

  if (loading) return <div style={{padding:20}}>Loading live updates...</div>;
  if (!data) return <div style={{padding:20}}>No data</div>;

  const isStopped = data.status === "stopped" || data.collectors[0]?.pid === "none";

  return (
    <div style={{padding:20, maxWidth:1200, margin:"0 auto"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
        <a href="/dashboard" style={{color:"#2563eb", textDecoration:"none", fontSize:14, fontWeight:600}}>← Back to Dashboard</a>
        <div style={{display:"flex", gap:12, alignItems:"center"}}>
          <button
            onClick={handleRestart}
            disabled={restarting}
            style={{
              background: isStopped ? "#ef4444" : "#22c55e",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: restarting ? "not-allowed" : "pointer",
            }}
          >
            {restarting ? "Restarting..." : isStopped ? "🔄 Restart Collectors" : "🔄 Restart"}
          </button>
          <a href="/leads" style={{color:"#666", textDecoration:"none", fontSize:13}}>View Leads →</a>
        </div>
      </div>
      <h1 style={{fontSize:24, fontWeight:700, marginBottom:8}}>🔴 Live Collection — Never Stops</h1>
      <p style={{color:"#666", marginBottom:20}}>Auto-refresh every 5 sec — shows if chain breaks, errors, progress to 200 — TRUE NO_SITE verified (prevents Emma Clinic type)</p>

      {isStopped && (
        <div style={{background:"#fee", border:"1px solid #fcc", padding:16, borderRadius:8, marginBottom:20}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16}}>
            <div>
              <b style={{color:"#c00"}}>⚠️ {data.message}</b>
              <p style={{margin:"8px 0 0"}}>Collector stopped — Overpass 504/429 or crash. Will auto-restart in 10 sec. If stays stopped &gt;2 min, tell me.</p>
            </div>
            <button
              onClick={handleRestart}
              disabled={restarting}
              style={{
                background:"#c00",
                color:"white",
                border:"none",
                padding:"10px 20px",
                borderRadius:8,
                fontWeight:800,
                cursor:"pointer",
                whiteSpace:"nowrap"
              }}
            >
              {restarting ? "Restarting..." : "🔄 RESTART NOW"}
            </button>
          </div>
        </div>
      )}

      {!isStopped && (
        <div style={{background:"#efe", border:"1px solid #cfc", padding:16, borderRadius:8, marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <b style={{color:"#0a0"}}>✅ {data.message}</b>
          <span style={{fontSize:12, color:"#666"}}>Auto-refresh 5s • Chain unbroken</span>
        </div>
      )}

      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, marginBottom:24}}>
        <div style={{background:"#fff", border:"1px solid #e5e7eb", padding:16, borderRadius:8}}>
          <div style={{fontSize:12, color:"#666", textTransform:"uppercase"}}>CRM Total</div>
          <div style={{fontSize:32, fontWeight:800, color:isStopped?"#c00":"#2563eb"}}>{data.crm.total} / {data.crm.target}</div>
          <div style={{fontSize:12, color:"#666"}}>{data.crm.progress}% — {data.crm.withEmail} with email</div>
          <div style={{height:8, background:"#eee", borderRadius:4, marginTop:8}}>
            <div style={{width:`${Math.min(100, data.crm.progress)}%`, height:8, background:isStopped?"#c00":"#2563eb", borderRadius:4}} />
          </div>
        </div>
        <div style={{background:"#fff", border:"1px solid #e5e7eb", padding:16, borderRadius:8}}>
          <div style={{fontSize:12, color:"#666", textTransform:"uppercase"}}>File Rows</div>
          <div style={{fontSize:32, fontWeight:800}}>{data.file.rows}</div>
          <div style={{fontSize:12, color:"#666", wordBreak:"break-all"}}>{data.file.path}</div>
        </div>
        <div style={{background:"#fff", border:"1px solid #e5e7eb", padding:16, borderRadius:8}}>
          <div style={{fontSize:12, color:"#666", textTransform:"uppercase"}}>Collectors</div>
          <div style={{fontSize:20, fontWeight:700, color:isStopped?"#c00":"#0a0"}}>{data.collectors.length} running</div>
          <div style={{fontSize:12, color:"#666"}}>{isStopped ? "Chain broken!" : "Chain unbroken"}</div>
        </div>
        <div style={{background:"#fff", border:"1px solid #e5e7eb", padding:16, borderRadius:8}}>
          <div style={{fontSize:12, color:"#666", textTransform:"uppercase"}}>Last Update</div>
          <div style={{fontSize:14, fontWeight:600}}>{new Date(data.timestamp).toLocaleTimeString()}</div>
          <div style={{fontSize:12, color:"#666"}}>Auto-refresh 5s</div>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, overflow:"hidden"}}>
          <div style={{padding:"12px 16px", borderBottom:"1px solid #e5e7eb", fontWeight:700}}>Last 20 Leads Found (Live)</div>
          <div style={{maxHeight:400, overflow:"auto"}}>
            <table style={{width:"100%", fontSize:12, borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#f9fafb", textAlign:"left"}}><th style={{padding:8}}>Company</th><th style={{padding:8}}>Cat</th><th style={{padding:8}}>Email</th><th style={{padding:8}}>City</th></tr></thead>
              <tbody>
                {data.lastLeads.map((l,i)=>(
                  <tr key={i} style={{borderTop:"1px solid #eee"}}>
                    <td style={{padding:8}}>{l.company}</td>
                    <td style={{padding:8}}>{l.category}</td>
                    <td style={{padding:8, wordBreak:"break-all"}}>{l.email}</td>
                    <td style={{padding:8}}>{l.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.lastLeads.length===0 && <div style={{padding:20, textAlign:"center", color:"#999"}}>No leads yet</div>}
          </div>
        </div>

        <div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, overflow:"hidden"}}>
          <div style={{padding:"12px 16px", borderBottom:"1px solid #e5e7eb", fontWeight:700}}>Collector Processes (Live)</div>
          <div style={{padding:16}}>
            {data.collectors.map((c,i)=>(
              <div key={i} style={{padding:8, background:c.running?"#f0fdf4":"#fef2f2", border:`1px solid ${c.running?"#bbf7d0":"#fecaca"}`, borderRadius:6, marginBottom:8, fontSize:12}}>
                <div><b>PID {c.pid}</b> — {c.running?"🟢 Running":"🔴 Stopped"}</div>
                <div style={{wordBreak:"break-all", color:"#666", marginTop:4}}>{c.cmd}</div>
              </div>
            ))}
            <div style={{marginTop:16, padding:12, background:"#f9fafb", borderRadius:6, fontSize:12}}>
              <b>How it works:</b>
              <ul style={{margin:"8px 0 0", paddingLeft:16}}>
                <li>Scans BIG areas (London, Manchester, UK, USA, Dubai) — billions of data</li>
                <li>Target: 5 per category per hour = 25/hour → 200/hour with big areas</li>
                <li>No duplicates via seen set, shifts zipcode when area over</li>
                <li>Auto-import to CRM every 5 min</li>
                <li>If stopped &gt;2 min, chain broken — I auto-restart</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={{marginTop:16, background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, padding:16}}>
        <div style={{fontWeight:700, marginBottom:8}}>Progress to 200</div>
        <div style={{display:"flex", gap:4, alignItems:"center"}}>
          <div style={{flex:1, height:20, background:"#eee", borderRadius:10, overflow:"hidden"}}>
            <div style={{width:`${Math.min(100, (data.crm.total/200)*100)}%`, height:20, background:"#2563eb", transition:"width 0.5s"}} />
          </div>
          <div style={{fontWeight:700}}>{data.crm.total}/200</div>
        </div>
        <div style={{fontSize:12, color:"#666", marginTop:8}}>
          Need {Math.max(0, 200 - data.crm.total)} more for 200/hour target. At 5/min = {Math.ceil((200 - data.crm.total)/5)} min.
        </div>
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireActiveUser();
    // CRM counts
    const crmTotal = await prisma.lead.count();
    const crmWithEmail = await prisma.lead.count({ where: { email: { not: "" } } });
    const crmNoSite = await prisma.lead.count({ where: { OR: [{ website: "" }, { website: null }] } });
    
    // Last 20 leads from DB (works on Vercel)
    let dbLastLeads: any[] = [];
    try {
      const recent = await prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { companyName: true, businessCategory: true, email: true, phone: true, city: true, country: true, createdAt: true }
      });
      dbLastLeads = recent.map(r => ({
        company: (r.companyName || "").slice(0, 30),
        category: r.businessCategory || "",
        email: r.email || "",
        phone: r.phone || "",
        city: r.city || "",
        country: r.country || "",
        createdAt: r.createdAt
      }));
    } catch (e) {
      console.error("DB last leads error", e);
    }

    // File count (local only, fails on Vercel)
    const filePath = "/home/user/leads/leads-no-website-batch.csv";
    let fileRows = 0;
    let fileExists = false;
    let fileLastLeads: any[] = [];
    
    try {
      if (fs.existsSync(filePath)) {
        fileExists = true;
        const content = fs.readFileSync(filePath, "utf8");
        const lines = content.trim().split("\n");
        fileRows = Math.max(0, lines.length - 1);
        // Parse last 20 from file for local preview
        const rows = lines.slice(1).slice(-20).map(line => {
          const parts = line.split(",");
          return {
            company: parts[0]?.replace(/"/g, "")?.slice(0, 30) || "",
            category: parts[1] || "",
            email: parts[3] || "",
            phone: parts[4] || "",
            city: parts[6] || "",
          };
        });
        fileLastLeads = rows.reverse();
      }
    } catch (e) {
      // On Vercel, file won't exist, use DB counts
    }

    // Use file rows if available, else DB total
    const effectiveRows = fileExists ? fileRows : crmTotal;
    const lastLeads = fileLastLeads.length ? fileLastLeads : dbLastLeads;

    // Collector status - try ps (local), fallback to heartbeat Setting + last lead time (Vercel)
    let collectors: any[] = [];
    let status = "stopped";
    let heartbeat: any = null;

    try {
      const { execSync } = await import("child_process");
      const ps = execSync("ps aux | grep -E 'big_area|collector|gmb|auto_import|forever|fast_no_site|super_fast' | grep -v grep || echo 'none'", { encoding: "utf8" });
      collectors = ps.split("\n").filter(l => l.trim() && l !== "none").map(line => {
        const parts = line.split(/\s+/);
        return {
          pid: parts[1],
          cmd: parts.slice(10).join(" ").slice(0, 80),
          running: true,
        };
      });
      if (collectors.length) status = "running";
    } catch (e) {
      // ps not available on some platforms
    }

    // Always check heartbeat Setting for Vercel (even if ps returned none)
    try {
      const hb = await prisma.setting.findUnique({ where: { key: "collector_heartbeat" } });
      if (hb) {
        try {
          heartbeat = JSON.parse(hb.value);
          const lastBeat = new Date(heartbeat.timestamp);
          const diffMin = (Date.now() - lastBeat.getTime()) / 60000;
          if (diffMin < 10) {
            status = "running";
            // If ps found nothing, use heartbeat as collector
            if (!collectors.length) {
              collectors = [{
                pid: heartbeat.pid?.toString() || "vercel",
                cmd: heartbeat.message || `Last beat ${diffMin.toFixed(1)} min ago - ${heartbeat.fileRows || crmTotal} rows`,
                running: true,
              }];
            }
          } else if (diffMin >= 10) {
            // Heartbeat old - try to auto-heal by restarting watchdog (local only)
            try {
              const { execSync } = await import("child_process");
              // Check if watchdog running
              const psCheck = execSync("ps aux | grep never_stops_watchdog | grep -v grep || echo 'none'", { encoding: "utf8" });
              if (psCheck.trim() === "none" || psCheck.trim() === "") {
                // Try to restart watchdog in background
                execSync("cd /home/user/leads && nohup python3 -u never_stops_watchdog.py > /tmp/watchdog.log 2>&1 & echo started", { encoding: "utf8" });
              }
            } catch (healErr) {
              // ignore heal errors
            }
          }
        } catch (parseErr) {
          // ignore parse error
        }
      }
      // Fallback: check last lead created time if still stopped
      if (status === "stopped" && dbLastLeads.length) {
        const lastLeadTime = new Date((dbLastLeads[0] as any).createdAt || Date.now());
        const diffMin = (Date.now() - lastLeadTime.getTime()) / 60000;
        if (diffMin < 15) {
          status = "running";
          if (!collectors.length) {
            collectors = [{
              pid: "db",
              cmd: `Last lead ${diffMin.toFixed(1)} min ago - auto-detected running`,
              running: true,
            }];
          }
        }
      }
    } catch (e2) {
      // ignore
    }

    // If still no collectors, mark stopped but check heartbeat age for auto-restart message
    if (!collectors.length) {
      let msg = "No collectors running - chain broken! Check local machine";
      if (heartbeat) {
        const lastBeat = new Date(heartbeat.timestamp);
        const diffSec = (Date.now() - lastBeat.getTime()) / 1000;
        if (diffSec < 120) {
          msg = `Collector stopped — Overpass 504/429 or crash. Will auto-restart in 10 sec. Last beat ${diffSec.toFixed(0)}s ago. If stays stopped >2 min, tell me.`;
        } else {
          msg = `⚠️ COLLECTOR STOPPED - No process running, chain broken! Last beat ${Math.floor(diffSec/60)} min ago. Restart needed on local machine`;
        }
      }
      collectors = [{ pid: "none", cmd: msg, running: false }];
      status = "stopped";
    }

    // Country breakdown from DB
    let byCountry: any[] = [];
    let byCategory: any[] = [];
    try {
      // @ts-ignore - Prisma 6 type issue with groupBy
      byCountry = await (prisma.lead.groupBy as any)({ by: ["country"], _count: { _all: true } });
      // @ts-ignore
      byCategory = await (prisma.lead.groupBy as any)({ by: ["businessCategory"], _count: { _all: true } });
    } catch {}

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      crm: {
        total: crmTotal,
        withEmail: crmWithEmail,
        noSite: crmNoSite,
        target: 200,
        progress: Math.round((crmTotal / 200) * 100),
      },
      file: {
        exists: fileExists,
        rows: effectiveRows,
        path: filePath,
      },
      collectors,
      lastLeads,
      byCountry,
      byCategory,
      heartbeat,
      status,
      message: status === "running"
        ? `Collecting ${effectiveRows}/200 - CRM ${crmTotal}/200 - ${collectors.length} process(es) running - TRUE NO_SITE verified (prevents Emma Clinic type)`
        : collectors[0]?.cmd || "⚠️ COLLECTOR STOPPED - No process running, chain broken! Will auto-restart in 10 sec. If stays stopped >2 min, tell me.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}

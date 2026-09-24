import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireActiveUser();
    let output = "";
    const isVercel = !!process.env.VERCEL;

    // Always set restart flag in DB so local watchdog can pick it up (Vercel can't restart local processes directly)
    try {
      const flag = {
        timestamp: new Date().toISOString(),
        requestedAt: Date.now(),
        source: isVercel ? "vercel_dashboard" : "local_dashboard",
      };
      await prisma.setting.upsert({
        where: { key: "restart_requested" },
        update: { value: JSON.stringify(flag) },
        create: { key: "restart_requested", value: JSON.stringify(flag) },
      });
      output += `Set restart_requested flag in DB (isVercel=${isVercel})\n`;
    } catch (e: any) {
      output += `DB flag error: ${e.message}\n`;
    }

    // Try to restart locally (works when called from local Next dev, no-op on Vercel)
    try {
      execSync("pkill -f super_fast_parallel 2>/dev/null; pkill -f never_stops_watchdog 2>/dev/null; sleep 1; echo killed", { encoding: "utf8" });
      output += "Killed old processes (local)\n";
    } catch (e) {
      output += `Kill (local) - may be Vercel, ignored\n`;
    }

    try {
      execSync("cd /home/user/leads && nohup python3 -u never_stops_watchdog.py > /tmp/watchdog.log 2>&1 & echo started", { encoding: "utf8" });
      output += "Started watchdog (local)\n";
    } catch (e) {
      output += `Start watchdog (local) - may be Vercel, will be picked up by local watchdog polling DB\n`;
    }

    try {
      execSync("cd /home/user/leads && nohup python3 -u super_watchdog.py > /tmp/super_watchdog.log 2>&1 & echo started", { encoding: "utf8" });
      output += "Started super watchdog (local)\n";
    } catch {}

    // Get status after restart (local only)
    let ps = "";
    try {
      ps = execSync("ps aux | grep -E 'watchdog|super_fast' | grep -v grep || echo 'none'", { encoding: "utf8" });
    } catch {
      ps = "Vercel - no ps, but flag set - local watchdog will restart in <30 sec";
    }

    return NextResponse.json({
      success: true,
      message: isVercel
        ? "Restart requested - local watchdog will auto-restart collectors in <30 sec (via DB flag)"
        : "Restart triggered - collectors will auto-restart in 10 sec",
      output,
      ps: ps.slice(0, 1000),
      isVercel,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

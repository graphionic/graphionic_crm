import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Try to restart watchdog and collectors
    let output = "";
    try {
      // Kill old
      execSync("pkill -f super_fast_parallel 2>/dev/null; pkill -f never_stops_watchdog 2>/dev/null; sleep 1; echo killed", { encoding: "utf8" });
      output += "Killed old processes\n";
    } catch (e) {
      output += `Kill error: ${e}\n`;
    }

    try {
      // Start watchdog
      execSync("cd /home/user/leads && nohup python3 -u never_stops_watchdog.py > /tmp/watchdog.log 2>&1 & echo started", { encoding: "utf8" });
      output += "Started watchdog\n";
    } catch (e) {
      output += `Start watchdog error: ${e}\n`;
    }

    try {
      // Start super watchdog
      execSync("cd /home/user/leads && nohup python3 -u super_watchdog.py > /tmp/super_watchdog.log 2>&1 & echo started", { encoding: "utf8" });
      output += "Started super watchdog\n";
    } catch (e) {
      output += `Start super watchdog error: ${e}\n`;
    }

    // Get status after restart
    let ps = "";
    try {
      ps = execSync("ps aux | grep -E 'watchdog|super_fast' | grep -v grep || echo 'none'", { encoding: "utf8" });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Restart triggered - collectors will auto-restart in 10 sec",
      output,
      ps,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

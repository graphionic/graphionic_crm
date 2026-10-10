"use client";

import { useEffect, useState } from "react";
import { formatTimeInZone } from "@/lib/timezone";

interface LiveLocalTimeProps {
  timezone?: string | null;
  format?: "compact" | "full";
}

/**
 * Lightweight live-updating local time clock for a given IANA timezone.
 * Refreshes client-side every 30 seconds with 0 API calls or background overhead.
 */
export function LiveLocalTime({
  timezone,
  format = "compact",
}: LiveLocalTimeProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!timezone) {
    if (format === "full") {
      return <span className="muted">Unknown (Insufficient location data)</span>;
    }
    return null;
  }

  const timeStr = formatTimeInZone(now, timezone, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: format === "full",
  });

  if (format === "full") {
    const cityLabel = timezone.split("/")[1]?.replace(/_/g, " ") || timezone;
    return (
      <span className="badge green" title={`IANA Timezone: ${timezone}`}>
        {timeStr} · {cityLabel}
      </span>
    );
  }

  return (
    <div className="sub nowrap" style={{ fontSize: 11, color: "var(--text-secondary, #4b5563)", marginTop: 2 }}>
      {timeStr}
    </div>
  );
}

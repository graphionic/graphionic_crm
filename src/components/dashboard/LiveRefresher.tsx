"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastUpdated, setLastUpdated] = useState<string>("just now");

  // Format relative updated text
  useEffect(() => {
    let updateTimer: NodeJS.Timeout;
    const interval = setInterval(() => {
      setLastUpdated("just now");
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Visibility-aware background refresh every 45s
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const scheduleRefresh = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          startTransition(() => {
            router.refresh();
          });
        }
      }, 45000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Immediate soft refresh on tab re-activation
        startTransition(() => {
          router.refresh();
        });
        scheduleRefresh();
      } else if (timer) {
        clearInterval(timer);
      }
    };

    scheduleRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  const handleManualRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="dash-live-badge">
      <span className="dash-live-dot" aria-hidden="true" />
      <span className="dash-live-text">Live · {lastUpdated}</span>
      <button
        type="button"
        className={`dash-refresh-btn ${isPending ? "spinning" : ""}`}
        onClick={handleManualRefresh}
        title="Refresh live activity"
        aria-label="Refresh live activity"
        disabled={isPending}
      >
        ↻
      </button>
    </div>
  );
}

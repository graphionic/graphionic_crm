"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOperatorTimezone, clearOperatorTimezone } from "@/lib/actions/settings";
import {
  isValidTimeZone,
  getCurrentTimeInZone,
  getAllSupportedTimezones,
  POPULAR_TIMEZONES,
} from "@/lib/timezone";

type Props = {
  initialTimezone: string | null;
  userEmail: string;
};

export function RegionalSettingsForm({ initialTimezone, userEmail }: Props) {
  const router = useRouter();
  const [selectedTimezone, setSelectedTimezone] = useState<string>(initialTimezone || "");
  const [detectedTimezone, setDetectedTimezone] = useState<string>("");
  const [customSearch, setCustomSearch] = useState<string>("");
  const [timePreview, setTimePreview] = useState<{ dateStr: string; timeStr: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  // Detect browser device timezone on mount — NEVER automatically saved
  useEffect(() => {
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTz && isValidTimeZone(browserTz)) {
        setDetectedTimezone(browserTz);
      }
    } catch {
      // Ignored safely
    }
  }, []);

  // Update live preview clock in selected timezone
  useEffect(() => {
    const targetTz = selectedTimezone || detectedTimezone || "UTC";
    const updatePreview = () => {
      try {
        const info = getCurrentTimeInZone(targetTz);
        setTimePreview({ dateStr: info.dateStr, timeStr: info.timeStr });
      } catch {
        setTimePreview(null);
      }
    };

    updatePreview();
    const interval = setInterval(updatePreview, 1000);
    return () => clearInterval(interval);
  }, [selectedTimezone, detectedTimezone]);

  const allTimezones = getAllSupportedTimezones();
  const filteredTimezones = customSearch.trim()
    ? allTimezones.filter((tz) => tz.toLowerCase().includes(customSearch.trim().toLowerCase()))
    : allTimezones;

  const activeTz = selectedTimezone || (initialTimezone ?? "");
  const isSelectedValid = activeTz ? isValidTimeZone(activeTz) : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}

      <div className="card">
        <div className="card-head">
          <div className="hstack" style={{ justifyContent: "space-between", width: "100%" }}>
            <div>
              <h3>Operator Timezone Preference</h3>
              <p className="small muted" style={{ margin: "2px 0 0 0" }}>
                Configured individually for <b>{userEmail}</b>.
              </p>
            </div>
            <span className={`badge ${initialTimezone ? "green" : "amber"}`}>
              {initialTimezone ? "Configured" : "Not configured"}
            </span>
          </div>
        </div>
        <div className="card-body">
          <form
            action={(fd) =>
              start(async () => {
                if (!selectedTimezone) {
                  setMsg({ ok: false, text: "Please select an IANA timezone before saving." });
                  return;
                }
                const r = await saveOperatorTimezone(fd);
                setMsg({ ok: r.ok, text: r.message });
                router.refresh();
              })
            }
          >
            {/* Live Clock Preview Box */}
            <div
              style={{
                background: "var(--bg-subtle, #f9fafb)",
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: 8,
                padding: "14px 18px",
                marginBottom: 20,
              }}
            >
              <div className="hstack" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted, #6b7280)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Active Timezone Preview
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary, #111827)", marginTop: 2 }}>
                    {selectedTimezone || <span className="muted">No timezone selected (previewing {detectedTimezone || "UTC"})</span>}
                  </div>
                </div>
                {timePreview && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace" }}>
                      {timePreview.timeStr}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted, #6b7280)" }}>
                      {timePreview.dateStr}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Browser Device Suggestion (Explicit action only) */}
            {detectedTimezone && detectedTimezone !== selectedTimezone && (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 6,
                  padding: "10px 14px",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ fontSize: 13, color: "#1e40af", fontWeight: 500 }}>
                    Detected on this device: <b>{detectedTimezone}</b>
                  </span>
                  <div style={{ fontSize: 11.5, color: "#3b82f6" }}>
                    Device timezone is suggested for convenience and is never automatically saved.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn sm"
                  style={{ background: "#ffffff", borderColor: "#93c5fd", color: "#1d4ed8" }}
                  onClick={() => {
                    setSelectedTimezone(detectedTimezone);
                    setMsg(null);
                  }}
                >
                  Use {detectedTimezone}
                </button>
              </div>
            )}

            {/* Timezone Selection Controls */}
            <div className="grid c2" style={{ gap: 16 }}>
              <label className="f">
                <span>Select IANA Timezone</span>
                <select
                  name="timezone"
                  value={selectedTimezone}
                  onChange={(e) => {
                    setSelectedTimezone(e.target.value);
                    setMsg(null);
                  }}
                  style={{ fontFamily: "inherit" }}
                >
                  <option value="">— Select a timezone —</option>
                  <optgroup label="Popular Outreach & Operating Zones">
                    {POPULAR_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="All Supported IANA Timezones">
                    {allTimezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <span className="hint">
                  Standard IANA identifier (e.g. Europe/London, America/New_York, Asia/Kolkata).
                </span>
              </label>

              <label className="f">
                <span>Filter Timezones by Name</span>
                <input
                  type="text"
                  placeholder="e.g. London, Kolkata, New_York, Dubai..."
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                />
                <span className="hint">
                  {filteredTimezones.length} matching {filteredTimezones.length === 1 ? "zone" : "zones"}.
                </span>
              </label>
            </div>

            {/* Search filter results quick picks */}
            {customSearch.trim() && (
              <div style={{ marginTop: 10, marginBottom: 15 }}>
                <span className="small muted">Search matches: </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {filteredTimezones.slice(0, 10).map((tz) => (
                    <button
                      key={tz}
                      type="button"
                      className={`btn sm ${selectedTimezone === tz ? "primary" : ""}`}
                      style={{ fontSize: 12, padding: "2px 8px" }}
                      onClick={() => {
                        setSelectedTimezone(tz);
                        setMsg(null);
                      }}
                    >
                      {tz}
                    </button>
                  ))}
                  {filteredTimezones.length > 10 && (
                    <span className="small muted" style={{ alignSelf: "center" }}>
                      +{filteredTimezones.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Form Action Buttons */}
            <div className="hstack" style={{ marginTop: 24, gap: 12 }}>
              <button
                type="submit"
                className="btn primary"
                disabled={pending || !selectedTimezone || !isSelectedValid}
              >
                {pending ? "Saving…" : "Save Timezone Preference"}
              </button>

              {initialTimezone && (
                <button
                  type="button"
                  className="btn"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Clear your saved timezone preference?")) {
                      start(async () => {
                        const r = await clearOperatorTimezone();
                        setSelectedTimezone("");
                        setMsg({ ok: r.ok, text: r.message });
                        router.refresh();
                      });
                    }
                  }}
                >
                  Clear Preference
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>How ClientForge Uses Your Timezone</h3>
        </div>
        <div className="card-body">
          <ul style={{ paddingLeft: 20, margin: 0, lineHeight: 1.6, fontSize: 13.5, color: "var(--text-secondary, #4b5563)" }}>
            <li>
              <b>Authoritative Operator Display:</b> Lead activity timelines, email outbox records, follow-up schedules, and WhatsApp message timestamps render in your chosen timezone.
            </li>
            <li>
              <b>HIMI AI Temporal Context:</b> HIMI is grounded with your exact local date, time, and timezone so relative temporal queries (such as <i>&quot;What happened today?&quot;</i> or <i>&quot;Due tomorrow&quot;</i>) align with your actual working day.
            </li>
            <li>
              <b>Absolute UTC Storage:</b> All underlying database timestamps and Meta WhatsApp 24-hour customer service window calculations remain immutable, absolute UTC instants.
            </li>
            <li>
              <b>Per-Operator Isolation:</b> Your timezone setting is unique to your login (<code>{userEmail}</code>) and does not modify preferences for other team members.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

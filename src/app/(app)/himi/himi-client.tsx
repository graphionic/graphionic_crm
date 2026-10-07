"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

type ToolCallMeta = {
  name: string;
  ok: boolean;
  durationMs?: number;
};

type PendingAction = {
  action: "update_lead_status" | "update_lead_priority" | "add_lead_note";
  leadId: string;
  companyName: string;
  currentValue?: string | null;
  newValue: string;
  arguments: Record<string, any>;
};

type ExecutedAction = {
  action: string;
  companyName: string;
  previousValue?: string | null;
  newValue: string;
};

type SkillMeta = {
  id: string;
  slug: string;
  name: string;
};

type ResourceMeta = {
  id: string;
  title: string;
  skillId: string;
};

type ChatMessage = {
  id: string;
  sender: "user" | "himi";
  text: string;
  toolCalls?: ToolCallMeta[];
  skills?: SkillMeta[];
  resources?: ResourceMeta[];
  isError?: boolean;
  pendingAction?: PendingAction;
  executedAction?: ExecutedAction;
  timestamp: string;
};

const FRIENDLY_TOOL_LABELS: Record<string, string> = {
  search_leads: "Leads",
  get_lead_details: "Lead details",
  get_lead_activity: "Activity",
  get_outreach_stats: "Outreach stats",
  update_lead_status: "Update status",
  update_lead_priority: "Update priority",
  add_lead_note: "Add note",
  get_pipeline_summary: "Pipeline",
  get_leads_needing_attention: "Attention",
  get_engagement_summary: "Engagement",
  get_followup_opportunities: "Follow-ups",
  get_sales_activity_summary: "Sales activity",
  web_search: "Web research",
  web_search_call: "Web research",
  get_business_profile: "Business Profile",
  get_business_services: "Business Services",
  get_business_portfolio: "Business Portfolio",
};


export default function HimiClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [activePendingAction, setActivePendingAction] = useState<PendingAction | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check HIMI agent connectivity on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/himi/health");
        const data = await res.json();
        setConnected(Boolean(data.ok && data.configured));
      } catch {
        setConnected(false);
      }
    }
    checkHealth();
  }, []);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleConfirmAction = async (pending: PendingAction) => {
    if (loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: "Confirm",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setActivePendingAction(null);
    setLoading(true);

    try {
      const res = await fetch("/api/himi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmedPendingAction: pending,
        }),
      });

      const data = await res.json();
      const himiMsgId = `himi-${Date.now()}`;

      if (data.ok) {
        setConnected(true);
        setMessages((prev) => [
          ...prev,
          {
            id: himiMsgId,
            sender: "himi",
            text: data.response || "Action executed successfully.",
            executedAction: data.executedAction,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: himiMsgId,
            sender: "himi",
            text: data.error || "Execution failed. Please try again.",
            isError: true,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `himi-err-${Date.now()}`,
          sender: "himi",
          text: "Failed to confirm action due to connection error.",
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAction = async () => {
    if (loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: "Cancel",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setActivePendingAction(null);
    setLoading(true);

    try {
      await fetch("/api/himi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelPendingAction: true }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `himi-${Date.now()}`,
          sender: "himi",
          text: "Action cancelled. No changes were made.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `himi-${Date.now()}`,
          sender: "himi",
          text: "Action cancelled.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    // Natural-language confirmation / rejection check if activePendingAction exists
    if (activePendingAction) {
      const lower = textToSend.toLowerCase();
      const isConfirm = /^(yes|yep|yeah|confirm|do it|proceed|ok|sure|go ahead)$/i.test(lower);
      const isCancel = /^(no|nope|cancel|don't do it|never mind|stop)$/i.test(lower);

      if (isConfirm) {
        if (!messageText) setInput("");
        await handleConfirmAction(activePendingAction);
        return;
      }

      if (isCancel) {
        if (!messageText) setInput("");
        await handleCancelAction();
        return;
      }

      // If user types an unrelated command, discard stale pending action
      setActivePendingAction(null);
    }

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const historyPayload = messages.slice(-10).map((m) => ({
      sender: m.sender === "user" ? "user" : "assistant",
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/himi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      const himiMsgId = `himi-${Date.now()}`;

      if (data.ok && data.response) {
        setConnected(true);
        if (data.pendingAction) {
          setActivePendingAction(data.pendingAction);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: himiMsgId,
            sender: "himi",
            text: data.response,
            toolCalls: data.toolCalls || [],
            skills: data.skills || [],
            resources: data.resources || [],
            pendingAction: data.pendingAction,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: himiMsgId,
            sender: "himi",
            text: data.error || "HIMI is temporarily unavailable. Please try again.",
            isError: true,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch {
      setConnected(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `himi-err-${Date.now()}`,
          sender: "himi",
          text: "HIMI request failed. Please check your connection and OpenAI settings.",
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestionPrompts = [
    "How are we doing?",
    "What needs my attention?",
    "Which 5 leads should I focus on first and why?",
    "Are we getting engagement?",
  ];



  return (
    <div className="himi-shell">
      {/* Topbar */}
      <div className="himi-topbar">
        <div className="title-group">
          <div className="himi-icon-badge">✦</div>
          <div>
            <h2>HIMI</h2>
            <div className="sub">Your ClientForge AI operations assistant</div>
          </div>
        </div>

        <div className="status-group">
          <span className="readonly-pill">Controlled Actions</span>
          {connected === true ? (
            <span className="status-pill connected">
              <span className="status-dot" /> Connected
            </span>
          ) : connected === false ? (
            <span className="status-pill offline">
              <span className="status-dot" /> Not Configured
            </span>
          ) : (
            <span className="status-pill offline">
              <span className="status-dot" /> Checking…
            </span>
          )}
        </div>
      </div>

      {connected === false ? (
        <div style={{ padding: "12px 16px 0 16px" }}>
          <div className="callout warn" style={{ margin: 0 }}>
            <b>HIMI needs an OpenAI API Key.</b> Configure it in{" "}
            <Link href="/settings/himi" style={{ textDecoration: "underline", color: "inherit", fontWeight: 600 }}>
              Settings → HIMI / OpenAI
            </Link>.
          </div>
        </div>
      ) : null}

      {/* Main Chat Messages Container */}
      <div className="himi-chat-container">
        {messages.length === 0 ? (
          /* Empty State */
          <div className="himi-empty-state">
            <div className="himi-hero-avatar">✦</div>
            <h3>HIMI</h3>
            <p>Ask anything about your ClientForge CRM or perform controlled Lead actions after confirmation.</p>

            <div className="himi-suggestions">
              {suggestionPrompts.map((prompt, idx) => (
                <div
                  key={idx}
                  className="suggestion-card"
                  onClick={() => handleSend(prompt)}
                >
                  <span>"{prompt}"</span>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>➔</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Active Conversation Messages */
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`himi-msg-row ${msg.sender === "user" ? "user" : "himi"}`}
            >
              {msg.sender === "user" ? (
                <div className="user-bubble">{msg.text}</div>
              ) : (
                <div className={`himi-card ${msg.isError ? "error" : ""}`}>
                  <div className="himi-card-header">
                    <span>✦</span> HIMI
                  </div>

                  <FormattedText content={msg.text} />

                  {/* Confirmation Card UI */}
                  {msg.pendingAction ? (
                    <div className="himi-confirm-card">
                      <div className="himi-confirm-title">
                        <span>⚠</span> CONFIRMATION REQUIRED
                      </div>
                      <div className="himi-confirm-details">
                        <strong>{msg.pendingAction.companyName}</strong>
                        <br />
                        {msg.pendingAction.action === "update_lead_status" && (
                          <>Status Change: <code>{msg.pendingAction.currentValue || "N/A"}</code> → <code>{msg.pendingAction.newValue}</code></>
                        )}
                        {msg.pendingAction.action === "update_lead_priority" && (
                          <>Priority Change: <code>{msg.pendingAction.currentValue || "N/A"}</code> → <code>{msg.pendingAction.newValue}</code></>
                        )}
                        {msg.pendingAction.action === "add_lead_note" && (
                          <>Add Note: <em>"{msg.pendingAction.newValue}"</em></>
                        )}
                      </div>
                      {activePendingAction && activePendingAction.leadId === msg.pendingAction.leadId ? (
                        <div className="himi-confirm-actions">
                          <button
                            className="btn sm primary"
                            onClick={() => handleConfirmAction(msg.pendingAction!)}
                            disabled={loading}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn sm danger"
                            onClick={() => handleCancelAction()}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          (Action completed or expired)
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Success Execution Card UI */}
                  {msg.executedAction ? (
                    <div className="himi-success-card">
                      <span>✓</span>
                      <div>
                        <strong>Updated {msg.executedAction.companyName}</strong>
                        <br />
                        {msg.executedAction.previousValue ? (
                          <span style={{ fontSize: 12 }}>
                            {msg.executedAction.previousValue} → {msg.executedAction.newValue}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12 }}>Note recorded in lead timeline</span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Secondary Tool Execution & Dynamic Skill Observability Indicators */}
                  {((msg.toolCalls && msg.toolCalls.length > 0) ||
                    (msg.skills && msg.skills.length > 0) ||
                    (msg.resources && msg.resources.length > 0)) && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--line-2)", display: "flex", flexDirection: "column", gap: 4 }}>
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="himi-tool-badge" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                          <span>✓</span>
                          <span>
                            Checked:{" "}
                            {Array.from(
                              new Set(
                                msg.toolCalls.map(
                                  (t) =>
                                    FRIENDLY_TOOL_LABELS[t.name] ||
                                    (t.name.startsWith("web_search") ? "Web research" : t.name)
                                )
                              )
                            ).join(" · ")}
                          </span>
                        </div>
                      )}

                      {msg.skills && msg.skills.length > 0 && (
                        <div className="himi-tool-badge" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                          <span>✦</span>
                          <span>
                            {msg.skills.length === 1 ? "Skill" : "Skills"}:{" "}
                            {msg.skills.map((s) => s.name).join(" · ")}
                          </span>
                        </div>
                      )}

                      {msg.resources && msg.resources.length > 0 && (
                        <div className="himi-tool-badge" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                          <span>✦</span>
                          <span>
                            {msg.resources.length === 1 ? "Resource" : "Resources"}:{" "}
                            {msg.resources.map((r) => r.title).join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading ? (
          <div className="himi-msg-row himi">
            <div className="himi-card">
              <div className="himi-thinking">
                <div className="himi-spinner" />
                <span>HIMI is checking ClientForge…</span>
              </div>
            </div>
          </div>
        ) : null}

        <div ref={chatEndRef} />
      </div>

      {/* Input Composer */}
      <div className="himi-composer">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask HIMI about your leads or outreach…"
          rows={1}
        />
        <button
          disabled={!input.trim() || loading}
          onClick={() => handleSend()}
        >
          {loading ? "Thinking…" : "Send ↵"}
        </button>
      </div>
    </div>
  );
}

/** Safe, clean Markdown-like text renderer */
function FormattedText({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);
  return (
    <div className="himi-formatted">
      {blocks.map((block, idx) => {
        const lines = block.split(/\r?\n/).filter(Boolean);
        const isBulletList = lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l));
        const isNumList = lines.length > 0 && lines.every((l) => /^\s*\d+\.\s+/.test(l));

        if (isBulletList) {
          return (
            <ul key={idx} className="himi-list">
              {lines.map((l, liIdx) => (
                <li key={liIdx}>{renderInline(l.replace(/^\s*[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        if (isNumList) {
          return (
            <ol key={idx} className="himi-list">
              {lines.map((l, liIdx) => (
                <li key={liIdx}>{renderInline(l.replace(/^\s*\d+\.\s+/, ""))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={idx}>
            {lines.map((l, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 ? <br /> : null}
                {renderInline(l)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  // Pre-clean residual broken link artifacts
  const sanitized = text
    .replace(/\(\s*\[\s*\]\(\s*\)\s*\)/g, "")
    .replace(/\[\s*\]\(\s*\)/g, "")
    .replace(/\(\s*\)/g, "");

  const parts = sanitized.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="himi-code">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("[") && part.includes("](")) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const linkText = match[1].trim();
        const linkUrl = match[2].trim();
        if (!linkUrl || linkUrl === "undefined" || linkUrl === "null") {
          return linkText ? <span key={i}>{linkText}</span> : null;
        }
        const displayTitle = linkText || "Source";
        const href = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline", color: "var(--primary, #3b82f6)" }}
          >
            {displayTitle}
          </a>
        );
      }
    }
    return part;
  });
}

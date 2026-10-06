"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

type ToolCallMeta = {
  name: string;
  ok: boolean;
  durationMs?: number;
};

type ChatMessage = {
  id: string;
  sender: "user" | "himi";
  text: string;
  toolCalls?: ToolCallMeta[];
  isError?: boolean;
  timestamp: string;
};

const FRIENDLY_TOOL_LABELS: Record<string, string> = {
  search_leads: "Leads",
  get_lead_details: "Lead details",
  get_lead_activity: "Activity",
  get_outreach_stats: "Outreach stats",
};

export default function HimiClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

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

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

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
        setMessages((prev) => [
          ...prev,
          {
            id: himiMsgId,
            sender: "himi",
            text: data.response,
            toolCalls: data.toolCalls || [],
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
    "How many leads do we have?",
    "Show me high-priority dental leads.",
    "What happened with Mayank Parmar Test?",
    "How is our outreach performing?",
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
          <span className="readonly-pill">Read-only</span>
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
            <p>Ask anything about your ClientForge CRM.</p>

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

                  {/* Secondary Tool Execution Indicator */}
                  {msg.toolCalls && msg.toolCalls.length > 0 ? (
                    <div className="himi-tool-badge">
                      <span>✓</span>
                      <span>
                        Checked:{" "}
                        {Array.from(
                          new Set(
                            msg.toolCalls.map(
                              (t) => FRIENDLY_TOOL_LABELS[t.name] || t.name
                            )
                          )
                        ).join(" · ")}
                      </span>
                    </div>
                  ) : null}
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
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="himi-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

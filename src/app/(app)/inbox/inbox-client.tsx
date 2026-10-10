"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatDateInZone, formatTimeInZone } from "@/lib/timezone";

type ConversationSummary = {
  key: string;
  phone: string;
  displayName: string;
  leadId?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  city?: string | null;
  country?: string | null;
  leadStatus?: string | null;
  priority?: string | null;
  latestMessage: string;
  latestDirection: string;
  latestStatus: string | null;
  latestAt: string;
  isKnown: boolean;
};

type MessageItem = {
  id: string;
  direction: "IN" | "OUT";
  body: string | null;
  status: string | null;
  error: string | null;
  templateName: string | null;
  createdAt: string;
};

type Eligibility = {
  canReplyFreeform: boolean;
  windowExpiresAt: string | null;
  hoursLeft: number | null;
  blockedReason: string | null;
};

type ConversationDetail = {
  key: string;
  phone: string;
  displayName: string;
  lead?: {
    id: string;
    companyName: string;
    contactName?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    status: string;
    priority: string;
    doNotContact: boolean;
    optedInWhatsapp: boolean;
    lastInboundAt?: string | null;
  } | null;
  isKnown: boolean;
};

export default function InboxClient({
  initialPhone,
  initialLeadId,
  operatorTimezone,
}: {
  initialPhone?: string;
  initialLeadId?: string;
  operatorTimezone?: string | null;
} = {}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch list of conversations
  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const res = await fetch("/api/whatsapp/conversations");
      const data = await res.json();
      if (data.ok && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        return data.conversations as ConversationSummary[];
      }
      return [];
    } catch (err) {
      console.error("[Inbox Fetch Error]:", err);
      return [];
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, []);

  // Fetch single conversation messages and eligibility
  const openConversation = useCallback(async (key: string, silent = false) => {
    setSelectedKey(key);
    setSendError(null);
    if (!silent) setLoadingThread(true);

    try {
      const res = await fetch(`/api/whatsapp/conversations/${encodeURIComponent(key)}`);
      const data = await res.json();
      if (data.ok) {
        setActiveConversation(data.conversation);
        setMessages(data.messages || []);
        setEligibility(data.eligibility || null);
      }
    } catch (err) {
      console.error("[Inbox Thread Load Error]:", err);
    } finally {
      if (!silent) setLoadingThread(false);
    }
  }, []);

  // Mount initialization
  useEffect(() => {
    async function init() {
      const loaded = await fetchConversations();
      if (initialPhone) {
        openConversation(initialPhone);
      } else if (initialLeadId) {
        openConversation(initialLeadId);
      } else if (loaded && loaded.length > 0 && window.innerWidth > 768) {
        openConversation(loaded[0].key);
      }
    }
    init();
  }, [fetchConversations, initialPhone, initialLeadId, openConversation]);

  // Polling: every 10 seconds while tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchConversations(true);
        if (selectedKey) {
          openConversation(selectedKey, true);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchConversations, openConversation, selectedKey]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingThread]);

  // Handle sending reply
  const handleSendReply = async () => {
    const textToSend = replyText.trim();
    if (!textToSend || sending || !activeConversation || !eligibility?.canReplyFreeform) return;

    setSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: activeConversation.phone,
          text: textToSend,
          leadId: activeConversation.lead?.id || undefined,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setReplyText("");
        if (selectedKey) {
          await openConversation(selectedKey, true);
        }
        fetchConversations(true);
      } else {
        setSendError(data.error || "Failed to send WhatsApp reply.");
      }
    } catch {
      setSendError("Network error sending reply. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="inbox-workspace">
      {/* Left Conversation List Pane */}
      <aside className={`inbox-left-pane ${selectedKey ? "hidden-mobile" : ""}`}>
        <div className="inbox-left-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="message" size={18} style={{ color: "var(--brand)" }} />
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>WhatsApp Inbox</h2>
            </div>
            <button
              className="btn icon sm"
              title="Refresh conversations"
              onClick={() => fetchConversations()}
              disabled={loadingList}
            >
              <Icon name="refresh" size={14} />
            </button>
          </div>

          <div className="inbox-search-wrap">
            <span style={{ position: "absolute", left: 10, color: "var(--muted)", display: "flex", alignItems: "center" }}>
              <Icon name="search" size={14} />
            </span>
            <input
              type="text"
              className="inbox-search-input"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="inbox-conv-list">
          {loadingList ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
              Loading inbox…
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
              {searchQuery ? "No matching conversations" : "No WhatsApp messages yet"}
            </div>
          ) : (
            filteredConversations.map((c) => (
              <button
                key={c.key}
                className={`inbox-conv-item ${selectedKey === c.key ? "active" : ""}`}
                onClick={() => openConversation(c.key)}
              >
                <div className="inbox-conv-top">
                  <span className="inbox-conv-name">{c.displayName}</span>
                  <span className="inbox-conv-time">
                    {formatDateInZone(c.latestAt, operatorTimezone, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div className="inbox-conv-sub">
                  <span className="inbox-conv-snippet">
                    {c.latestDirection === "OUT" ? "You: " : ""}
                    {c.latestMessage}
                  </span>
                  {c.latestDirection === "OUT" && (
                    <span style={{ fontSize: 11, color: c.latestStatus === "read" ? "var(--brand)" : "var(--muted)" }}>
                      {c.latestStatus === "read" ? "✓✓" : c.latestStatus === "delivered" ? "✓✓" : c.latestStatus === "sent" ? "✓" : c.latestStatus === "failed" ? "⚠" : ""}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{c.phone}</span>
                  {c.leadStatus && (
                    <span className="badge" style={{ fontSize: 10, padding: "1px 5px" }}>
                      {c.leadStatus}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Right Conversation View & Reply Pane */}
      <main className={`inbox-right-pane ${!selectedKey ? "hidden-mobile" : ""}`}>
        {selectedKey && activeConversation ? (
          <>
            {/* Thread Header */}
            <header className="inbox-chat-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <button
                  className="inbox-mobile-back-btn"
                  title="Back to conversation list"
                  onClick={() => setSelectedKey(null)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {activeConversation.displayName}
                    </h3>
                    {activeConversation.lead?.status && (
                      <span className="badge" style={{ fontSize: 11 }}>
                        {activeConversation.lead.status}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{activeConversation.phone}</span>
                    {activeConversation.lead?.city && (
                      <span>· {activeConversation.lead.city}, {activeConversation.lead.country || "UK"}</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {activeConversation.lead ? (
                  <>
                    <Link
                      href={`/leads/${activeConversation.lead.id}`}
                      className="btn sm secondary"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <Icon name="user" size={13} />
                      <span>View Lead</span>
                    </Link>
                    <Link
                      href={`/himi?leadId=${activeConversation.lead.id}&intent=review_reply`}
                      className="btn sm"
                      style={{
                        background: "var(--brand-soft)",
                        color: "var(--brand)",
                        border: "1px solid var(--blue-line)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title="Review message and draft response with HIMI"
                    >
                      <span>✦ Draft with HIMI</span>
                    </Link>
                  </>
                ) : null}
              </div>
            </header>

            {/* Messages Body */}
            <div className="inbox-chat-body">
              {loadingThread ? (
                <div style={{ margin: "auto", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  Loading conversation…
                </div>
              ) : messages.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  No messages in this conversation.
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`inbox-msg-row ${m.direction === "IN" ? "in" : "out"}`}>
                    <div className={`inbox-msg-bubble ${m.direction === "IN" ? "in" : "out"}`}>
                      {m.templateName && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)", marginBottom: 4 }}>
                          Template: {m.templateName}
                        </div>
                      )}
                      <div>{m.body || "—"}</div>
                    </div>

                    <div className="inbox-msg-meta">
                      <span>
                        {formatTimeInZone(m.createdAt, operatorTimezone, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {m.direction === "OUT" && (
                        <span>
                          {m.status === "read" ? (
                            <span style={{ color: "var(--brand)", fontWeight: 600 }} title="Read by recipient">✓✓</span>
                          ) : m.status === "delivered" ? (
                            <span style={{ color: "var(--muted)" }} title="Delivered to recipient device">✓✓</span>
                          ) : m.status === "sent" ? (
                            <span style={{ color: "var(--muted)" }} title="Sent to WhatsApp network">✓</span>
                          ) : m.status === "failed" ? (
                            <span style={{ color: "var(--red)" }} title={m.error || "Delivery failed"}>⚠ Failed</span>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Composer & Policy Indicator */}
            <div className="inbox-composer-area">
              {eligibility?.canReplyFreeform ? (
                <div className="inbox-window-banner active">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
                    <span><b>24h Customer Service Window Active</b></span>
                  </div>
                  <span>{eligibility.hoursLeft}h remaining</span>
                </div>
              ) : eligibility?.blockedReason === "SUPPRESSED" ? (
                <div className="inbox-window-banner blocked">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="warning" size={14} />
                    <span><b>Contact is suppressed</b> (Opted out via WhatsApp). Messaging disabled.</span>
                  </div>
                </div>
              ) : eligibility?.blockedReason === "DO_NOT_CONTACT" ? (
                <div className="inbox-window-banner blocked">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="warning" size={14} />
                    <span><b>Lead marked Do Not Contact</b>. Messaging disabled.</span>
                  </div>
                </div>
              ) : (
                <div className="inbox-window-banner locked">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="clock" size={14} />
                    <span><b>24-hour window closed</b>. An approved template is required to initiate a new conversation.</span>
                  </div>
                </div>
              )}

              {sendError && (
                <div style={{ fontSize: 12, color: "var(--red)", padding: "2px 4px" }}>
                  ⚠ {sendError}
                </div>
              )}

              <div className="inbox-composer-box">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    eligibility?.canReplyFreeform
                      ? "Type a WhatsApp reply…"
                      : "Direct replies disabled outside 24h window"
                  }
                  rows={1}
                  disabled={!eligibility?.canReplyFreeform || sending}
                />
                <button
                  disabled={!replyText.trim() || !eligibility?.canReplyFreeform || sending}
                  onClick={handleSendReply}
                >
                  <Icon name="arrow-right" size={14} />
                  <span>{sending ? "Sending…" : "Send"}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty / No conversation selected state */
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 360, padding: 32 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--brand-soft)",
              color: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Icon name="message" size={22} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Select a WhatsApp Conversation</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Choose a conversation from the left to view messages and reply within the 24-hour customer service window.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

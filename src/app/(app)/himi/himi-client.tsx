"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type ToolCallMeta = {
  name: string;
  ok: boolean;
  durationMs?: number;
};

type PendingAction = {
  action: "update_lead_status" | "update_lead_priority" | "add_lead_note" | "send_email" | "send_whatsapp";
  actionId?: string;
  leadId: string;
  companyName: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  whatsappMode?: "text" | "template" | string | null;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateParams?: Record<string, string> | null;
  subject?: string | null;
  body?: string | null;
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

type MemoryMeta = {
  id: string;
  scope: string;
  category: string;
  content: string;
};

type ChatMessage = {
  id: string;
  sender: "user" | "himi";
  text: string;
  toolCalls?: ToolCallMeta[];
  skills?: SkillMeta[];
  resources?: ResourceMeta[];
  memories?: MemoryMeta[];
  isError?: boolean;
  pendingAction?: PendingAction;
  executedAction?: ExecutedAction;
  timestamp: string;
};

type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

const FRIENDLY_TOOL_LABELS: Record<string, string> = {
  search_leads: "Leads",
  get_lead_details: "Lead details",
  get_lead_activity: "Activity",
  get_outreach_stats: "Outreach stats",
  update_lead_status: "Update status",
  update_lead_priority: "Update priority",
  add_lead_note: "Add note",
  prepare_send_email: "Prepare email",
  prepare_send_whatsapp: "Prepare WhatsApp",
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
  save_memory: "Memory saved",
  forget_memory: "Memory forgot",
  list_memories: "Memory list",
};

function groupConversationsByDate(convs: ConversationSummary[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const sevenDaysStart = todayStart - 6 * 86400000;

  const groups: { label: string; items: ConversationSummary[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 Days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const conv of convs) {
    const time = new Date(conv.updatedAt).getTime();
    if (time >= todayStart) {
      groups[0].items.push(conv);
    } else if (time >= yesterdayStart) {
      groups[1].items.push(conv);
    } else if (time >= sevenDaysStart) {
      groups[2].items.push(conv);
    } else {
      groups[3].items.push(conv);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export default function HimiClient({
  initialLeadId,
  initialIntent,
  initialPrompt,
}: {
  initialLeadId?: string;
  initialIntent?: string;
  initialPrompt?: string;
} = {}) {
  // Conversation History state
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Chat message & interaction state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt || "");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [activePendingAction, setActivePendingAction] = useState<PendingAction | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/himi/conversations");
      const data = await res.json();
      if (data.ok && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        return data.conversations as ConversationSummary[];
      }
      return [];
    } catch (err) {
      console.error("[HIMI History Load Error]:", err);
      return [];
    }
  }, []);

  // Open a specific conversation and load its messages
  const openConversation = useCallback(async (convId: string, title?: string) => {
    setActiveConversationId(convId);
    if (title) setActiveConversationTitle(title);
    setActivePendingAction(null);
    setLoadingMessages(true);
    setDrawerOpen(false);

    try {
      const res = await fetch(`/api/himi/conversations/${convId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.messages)) {
        if (data.conversation?.title) {
          setActiveConversationTitle(data.conversation.title);
        }
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            sender: m.role.toLowerCase() === "user" ? "user" : "himi",
            text: m.content,
            timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }))
        );
      }
    } catch (err) {
      console.error("[HIMI Thread Load Error]:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Start a fresh New Chat
  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setActiveConversationTitle(null);
    setMessages([]);
    setActivePendingAction(null);
    setInput("");
    setDrawerOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Delete a conversation
  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;

    try {
      const res = await fetch(`/api/himi/conversations/${convId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setConversations((prev) => {
          const next = prev.filter((c) => c.id !== convId);
          if (activeConversationId === convId) {
            if (next.length > 0) {
              openConversation(next[0].id, next[0].title);
            } else {
              handleNewChat();
            }
          }
          return next;
        });
      }
    } catch (err) {
      console.error("[HIMI Thread Delete Error]:", err);
    }
  };

  // Mount initialization: Health check + Load recent conversations
  useEffect(() => {
    async function init() {
      try {
        const healthRes = await fetch("/api/himi/health");
        const healthData = await healthRes.json();
        setConnected(Boolean(healthData.ok && healthData.configured));
      } catch {
        setConnected(false);
      }

      setLoadingHistory(true);
      const loaded = await fetchConversations();
      setLoadingHistory(false);

      // Deep link isolation: if deep link parameters exist, keep clean New Chat state with prompt prefilled
      const isDeepLink = Boolean(initialPrompt || initialLeadId || initialIntent);
      if (!isDeepLink && loaded && loaded.length > 0) {
        openConversation(loaded[0].id, loaded[0].title);
      }
    }

    init();
  }, [fetchConversations, initialPrompt, initialLeadId, initialIntent, openConversation]);

  // Focus composer when prefilled with initialPrompt
  useEffect(() => {
    if (initialPrompt && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [initialPrompt]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, loadingMessages]);

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
          conversationId: activeConversationId || undefined,
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
        fetchConversations();
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
        body: JSON.stringify({
          cancelPendingAction: true,
          conversationId: activeConversationId || undefined,
        }),
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
      fetchConversations();
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

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/himi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          conversationId: activeConversationId || undefined,
        }),
      });

      const data = await res.json();
      const himiMsgId = `himi-${Date.now()}`;

      if (data.ok && data.response) {
        setConnected(true);
        if (data.pendingAction) {
          setActivePendingAction(data.pendingAction);
        }
        if (data.conversationId) {
          setActiveConversationId(data.conversationId);
          if (data.title) {
            setActiveConversationTitle(data.title);
          }
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
            memories: data.memories || [],
            pendingAction: data.pendingAction,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        fetchConversations();
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

  const grouped = groupConversationsByDate(conversations);

  return (
    <div className="himi-workspace">
      {/* Desktop Conversation Rail */}
      <aside className="himi-rail">
        <div className="himi-rail-header">
          <button className="himi-new-chat-btn" onClick={handleNewChat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>

        <div className="himi-rail-list">
          {loadingHistory ? (
            <div style={{ padding: "16px 8px", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
              Loading history…
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "16px 8px", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
              No previous conversations
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="himi-date-group">
                <div className="himi-date-heading">{group.label}</div>
                {group.items.map((conv) => (
                  <button
                    key={conv.id}
                    className={`himi-conv-item ${activeConversationId === conv.id ? "active" : ""}`}
                    onClick={() => openConversation(conv.id, conv.title)}
                  >
                    <span className="himi-conv-title">{conv.title}</span>
                    <span
                      className="himi-conv-delete"
                      title="Delete conversation"
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Mobile Drawer Slide-over */}
      {drawerOpen ? (
        <>
          <div className="himi-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="himi-drawer">
            <div className="himi-rail-header" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <button className="himi-new-chat-btn" style={{ flex: 1 }} onClick={handleNewChat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New Chat</span>
              </button>
              <button
                className="btn icon sm"
                style={{ marginLeft: 8 }}
                onClick={() => setDrawerOpen(false)}
                title="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="himi-rail-list">
              {conversations.length === 0 ? (
                <div style={{ padding: "16px 8px", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                  No previous conversations
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.label} className="himi-date-group">
                    <div className="himi-date-heading">{group.label}</div>
                    {group.items.map((conv) => (
                      <button
                        key={conv.id}
                        className={`himi-conv-item ${activeConversationId === conv.id ? "active" : ""}`}
                        onClick={() => openConversation(conv.id, conv.title)}
                      >
                        <span className="himi-conv-title">{conv.title}</span>
                        <span
                          className="himi-conv-delete"
                          title="Delete conversation"
                          onClick={(e) => handleDeleteConversation(e, conv.id)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Main HIMI Chat Panel */}
      <main className="himi-main-panel">
        <div className="himi-shell">
          {/* Topbar */}
          <div className="himi-topbar">
            <div className="title-group">
              <button
                className="himi-mobile-history-btn"
                title="Conversation history"
                onClick={() => setDrawerOpen(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
              <div className="himi-icon-badge">✦</div>
              <div>
                <h2>{activeConversationTitle || "HIMI"}</h2>
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
            <div style={{ padding: "0 0 12px 0" }}>
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
            {loadingMessages ? (
              <div style={{ margin: "auto", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                <div className="himi-spinner" style={{ margin: "0 auto 8px" }} />
                Loading conversation…
              </div>
            ) : messages.length === 0 ? (
              /* Empty State */
              <div className="himi-empty-state">
                <div className="himi-hero-avatar">✦</div>
                <h3>HIMI</h3>
                <p>Ask anything about your ClientForge CRM or perform controlled Lead actions after confirmation.</p>

                <div className="himi-suggestions">
                  {initialPrompt ? (
                    <div
                      className="suggestion-card"
                      style={{
                        gridColumn: "1 / -1",
                        background: "var(--brand-soft)",
                        borderColor: "var(--blue-line)",
                        color: "var(--brand)",
                        fontWeight: 600,
                      }}
                      onClick={() => handleSend(initialPrompt)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>✦</span>
                        <span>"{initialPrompt}"</span>
                      </div>
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>➔</span>
                    </div>
                  ) : null}

                  {suggestionPrompts.map((s, idx) => (
                    <div
                      key={idx}
                      className="suggestion-card"
                      onClick={() => handleSend(s)}
                    >
                      <span>{s}</span>
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

                      {/* Confirmation Card UI (Only for active runtime turn) */}
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
                            {msg.pendingAction.action === "send_email" && (
                              <div style={{ marginTop: 6 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                                  SEND EMAIL
                                </div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                                  <strong>To:</strong> {msg.pendingAction.recipientEmail || msg.pendingAction.arguments?.recipient_email || "N/A"}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                                  <strong>Subject:</strong> {msg.pendingAction.subject || msg.pendingAction.arguments?.subject || "N/A"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    background: "var(--surface-subtle, rgba(0, 0, 0, 0.03))",
                                    padding: "8px 10px",
                                    borderRadius: 4,
                                    maxHeight: 160,
                                    overflowY: "auto",
                                    whiteSpace: "pre-wrap",
                                    fontFamily: "inherit",
                                    border: "1px solid var(--border, #e5e7eb)",
                                  }}
                                >
                                  {msg.pendingAction.body || msg.pendingAction.arguments?.body || ""}
                                </div>
                              </div>
                            )}
                            {msg.pendingAction.action === "send_whatsapp" && (
                              <div style={{ marginTop: 6 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                                  SEND WHATSAPP
                                </div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                                  <strong>To:</strong> {msg.pendingAction.recipientPhone || msg.pendingAction.arguments?.recipient_phone || "N/A"}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                                  <strong>Mode:</strong> {msg.pendingAction.whatsappMode === "template" ? "Approved Template" : "Free-form message"}
                                </div>
                                {msg.pendingAction.whatsappMode === "template" && (
                                  <>
                                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                                      <strong>Template:</strong> {msg.pendingAction.templateName || msg.pendingAction.arguments?.template_name || "N/A"}
                                      {msg.pendingAction.templateLanguage ? ` (${msg.pendingAction.templateLanguage})` : ""}
                                    </div>
                                    {msg.pendingAction.templateParams && (
                                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                                        <strong>Parameters:</strong> {JSON.stringify(msg.pendingAction.templateParams)}
                                      </div>
                                    )}
                                  </>
                                )}
                                {(msg.pendingAction.body || msg.pendingAction.arguments?.body || msg.pendingAction.arguments?.text) && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      background: "var(--surface-subtle, rgba(0, 0, 0, 0.03))",
                                      padding: "8px 10px",
                                      borderRadius: 4,
                                      maxHeight: 160,
                                      overflowY: "auto",
                                      whiteSpace: "pre-wrap",
                                      fontFamily: "inherit",
                                      border: "1px solid var(--border, #e5e7eb)",
                                    }}
                                  >
                                    {msg.pendingAction.body || msg.pendingAction.arguments?.body || msg.pendingAction.arguments?.text || ""}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {activePendingAction && activePendingAction.leadId === msg.pendingAction.leadId ? (
                            <div className="himi-confirm-actions">
                              <button
                                className="btn sm primary"
                                onClick={() => handleConfirmAction(msg.pendingAction!)}
                                disabled={loading}
                              >
                                {msg.pendingAction.action === "send_email" || msg.pendingAction.action === "send_whatsapp" ? "Confirm Send" : "Confirm"}
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
                            {msg.executedAction.action === "send_email" ? (
                              <>
                                <strong>Email sent to {msg.executedAction.companyName}</strong>
                                <br />
                                <span style={{ fontSize: 12 }}>Recorded in lead timeline</span>
                              </>
                            ) : msg.executedAction.action === "send_whatsapp" ? (
                              <>
                                <strong>WhatsApp submitted for {msg.executedAction.companyName}</strong>
                                <br />
                                <span style={{ fontSize: 12 }}>Delivery status will update in lead timeline</span>
                              </>
                            ) : (
                              <>
                                <strong>Updated {msg.executedAction.companyName}</strong>
                                <br />
                                {msg.executedAction.previousValue ? (
                                  <span style={{ fontSize: 12 }}>
                                    {msg.executedAction.previousValue} → {msg.executedAction.newValue}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 12 }}>Note recorded in lead timeline</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {/* Tool Execution & Observability Badges */}
                      {((msg.toolCalls && msg.toolCalls.length > 0) ||
                        (msg.skills && msg.skills.length > 0) ||
                        (msg.resources && msg.resources.length > 0) ||
                        (msg.memories && msg.memories.length > 0)) && (
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

                          {msg.memories && msg.memories.length > 0 && (
                            <div className="himi-tool-badge" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                              <span>✦</span>
                              <span>
                                Memory:{" "}
                                {msg.memories.map((m) => m.content.length > 35 ? `${m.content.slice(0, 35)}…` : m.content).join(" · ")}
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

          {/* Composer */}
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
      </main>
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

"use client";

import { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import {
  humanReadableRejection,
  humanReadableSource,
  humanReadableExternalType,
  humanReadableDecision,
  classifyEmail,
  statusBadgeStyle,
  githubRunUrl,
} from "./collector-utils";

interface CandidateQueueProps {
  categories?: any[];
  sources?: any[];
  showHeader?: boolean;
}

export default function CandidateQueueClient({
  categories = [],
  sources = [],
  showHeader = true,
}: CandidateQueueProps) {
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateSearchDebounced, setCandidateSearchDebounced] = useState("");
  const [candidateStatus, setCandidateStatus] = useState("All");
  const [candidateCategory, setCandidateCategory] = useState("All");
  const [candidateCity, setCandidateCity] = useState("All");
  const [candidateSourceId, setCandidateSourceId] = useState("All");
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidatePageSize, setCandidatePageSize] = useState(25);
  const [candidateSortBy, setCandidateSortBy] = useState("createdAt");
  const [candidateSortOrder, setCandidateSortOrder] = useState<"asc" | "desc">("desc");

  const [candidateData, setCandidateData] = useState<{
    candidates: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } | null>(null);
  const [candidateStats, setCandidateStats] = useState<any>(null);
  const [candidateLoading, setCandidateLoading] = useState(true);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rawTagsOpen, setRawTagsOpen] = useState(false);
  const [rawMetaOpen, setRawMetaOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const drawerTitleId = useId();

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setCandidateSearchDebounced(candidateSearch);
      setCandidatePage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [candidateSearch]);

  // Keyboard Escape listener for drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailOpen) {
        setDetailOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailOpen]);

  const fetchCandidateStats = useCallback(async () => {
    try {
      const res = await fetch("/api/collector/candidates/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setCandidateStats(data);
    } catch (e: any) {
      console.error(e);
    }
  }, []);

  const fetchCandidates = useCallback(async () => {
    setCandidateLoading(true);
    setCandidateError(null);
    try {
      const params = new URLSearchParams({
        page: String(candidatePage),
        pageSize: String(candidatePageSize),
        sortBy: candidateSortBy,
        sortOrder: candidateSortOrder,
      });
      if (candidateSearchDebounced) params.set("search", candidateSearchDebounced);
      if (candidateStatus && candidateStatus !== "All") params.set("status", candidateStatus);
      if (candidateCategory && candidateCategory !== "All") params.set("category", candidateCategory);
      if (candidateCity && candidateCity !== "All") params.set("city", candidateCity);
      if (candidateSourceId && candidateSourceId !== "All") params.set("sourceId", candidateSourceId);

      const res = await fetch(`/api/collector/candidates?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load candidates (${res.status})`);
      const data = await res.json();
      setCandidateData(data);
    } catch (e: any) {
      setCandidateError(e.message || "Failed to load candidates");
    } finally {
      setCandidateLoading(false);
    }
  }, [candidatePage, candidatePageSize, candidateSearchDebounced, candidateStatus, candidateCategory, candidateCity, candidateSourceId, candidateSortBy, candidateSortOrder]);

  const fetchCandidateDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedCandidateId(id);
    setDetailOpen(true);
    setRawTagsOpen(false);
    setRawMetaOpen(false);
    try {
      const res = await fetch(`/api/collector/candidates/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch candidate details (${res.status})`);
      const data = await res.json();
      setSelectedCandidate(data);
    } catch (e: any) {
      setDetailError(e.message || "Failed to load candidate details");
      setSelectedCandidate(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidateStats();
  }, [fetchCandidateStats]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const clearAllFilters = () => {
    setCandidateSearch("");
    setCandidateSearchDebounced("");
    setCandidateStatus("All");
    setCandidateCategory("All");
    setCandidateCity("All");
    setCandidateSourceId("All");
    setCandidatePage(1);
  };

  const hasActiveFilters = Boolean(
    candidateSearchDebounced ||
    candidateStatus !== "All" ||
    candidateCategory !== "All" ||
    (candidateCity && candidateCity !== "All") ||
    candidateSourceId !== "All"
  );

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    }).catch(() => {});
  };

  const decisionInfo = selectedCandidate ? humanReadableDecision(selectedCandidate) : null;
  const drawerEmailInfo = selectedCandidate ? classifyEmail(selectedCandidate.email) : null;

  return (
    <div style={{ display: "grid", gap: 16, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      {/* Header */}
      {showHeader && (
        <div className="page-head" style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "#9299A8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>
            <span>Lead Operations</span>
            <span>/</span>
            <span style={{ color: "#49339A" }}>Candidates</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", margin: "0 0 4px" }}>Candidate Queue</h2>
          <p style={{ fontSize: 13, color: "#60697A", margin: 0 }}>
            Businesses discovered by collection sources and evaluated before entering the qualified lead pipeline.
          </p>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Total Candidates</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.total ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>{candidateStats?.recent24h ?? 0} in last 24h</div>
        </div>
        <div style={{ background: "white", border: "1px solid #F4BE52", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#B7791F", textTransform: "uppercase" }}>Needs Enrichment</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.NEEDS_ENRICHMENT ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Missing email / no site</div>
        </div>
        <div style={{ background: "white", border: "1px solid #FBD5D5", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#C53030", textTransform: "uppercase" }}>Rejected</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.REJECTED ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Website / domain exists</div>
        </div>
        <div style={{ background: "white", border: "1px solid #C5E9F1", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#2B6CB0", textTransform: "uppercase" }}>Verification Pending</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.VERIFICATION_PENDING ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Cross-check queued</div>
        </div>
        <div style={{ background: "white", border: "1px solid #D5F0E5", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#276749", textTransform: "uppercase" }}>Qualified</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.QUALIFIED ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Promoted to CRM Lead</div>
        </div>
      </div>

      {/* Compact Filter Toolbar */}
      <div className="candidate-filter-toolbar-card" style={{ background: "#FFFFFF", border: "1px solid #E5E3DF", borderRadius: 8, padding: "8px 12px" }}>
        <div className="candidate-filter-toolbar" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Search */}
          <div className="candidate-filter-search" style={{ flex: "1 1 280px", minWidth: 280, maxWidth: 420, position: "relative" }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#9299A8", pointerEvents: "none" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={candidateSearch}
              onChange={e => setCandidateSearch(e.target.value)}
              placeholder="Search company name, email, phone, city, external ID..."
              style={{
                width: "100%",
                height: 42,
                padding: "0 12px 0 36px",
                borderRadius: 8,
                border: "1px solid #E5E3DF",
                fontSize: 14,
                color: "#151927",
                background: "#FAF9F7",
                outline: "none",
                fontFamily: "'Poppins', system-ui, sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Status */}
          <select
            value={candidateStatus}
            onChange={e => { setCandidateStatus(e.target.value); setCandidatePage(1); }}
            className="candidate-filter-ctrl candidate-ctrl-status"
            style={{
              height: 42,
              width: 160,
              minWidth: 150,
              maxWidth: 170,
              flex: "0 1 auto",
              padding: "0 10px",
              borderRadius: 8,
              border: "1px solid #E5E3DF",
              fontSize: 14,
              color: "#151927",
              background: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
              fontFamily: "'Poppins', system-ui, sans-serif",
              boxSizing: "border-box",
            }}
          >
            <option value="All">All Statuses</option>
            <option value="NEEDS_ENRICHMENT">Needs Enrichment</option>
            <option value="REJECTED">Rejected</option>
            <option value="VERIFICATION_PENDING">Verification Pending</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="DISCOVERED">Discovered</option>
          </select>

          {/* Category */}
          <select
            value={candidateCategory}
            onChange={e => { setCandidateCategory(e.target.value); setCandidatePage(1); }}
            className="candidate-filter-ctrl candidate-ctrl-category"
            style={{
              height: 42,
              width: 170,
              minWidth: 160,
              maxWidth: 180,
              flex: "0 1 auto",
              padding: "0 10px",
              borderRadius: 8,
              border: "1px solid #E5E3DF",
              fontSize: 14,
              color: "#151927",
              background: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
              fontFamily: "'Poppins', system-ui, sans-serif",
              boxSizing: "border-box",
            }}
          >
            <option value="All">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>

          {/* Source */}
          <select
            value={candidateSourceId}
            onChange={e => { setCandidateSourceId(e.target.value); setCandidatePage(1); }}
            className="candidate-filter-ctrl candidate-ctrl-source"
            style={{
              height: 42,
              width: 160,
              minWidth: 150,
              maxWidth: 170,
              flex: "0 1 auto",
              padding: "0 10px",
              borderRadius: 8,
              border: "1px solid #E5E3DF",
              fontSize: 14,
              color: "#151927",
              background: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
              fontFamily: "'Poppins', system-ui, sans-serif",
              boxSizing: "border-box",
            }}
          >
            <option value="All">All Sources</option>
            {sources.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* City */}
          <input
            value={candidateCity === "All" ? "" : candidateCity}
            onChange={e => { setCandidateCity(e.target.value || "All"); setCandidatePage(1); }}
            placeholder="City..."
            className="candidate-filter-ctrl candidate-ctrl-city"
            style={{
              height: 42,
              width: 150,
              minWidth: 140,
              maxWidth: 160,
              flex: "0 1 auto",
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid #E5E3DF",
              fontSize: 14,
              color: "#151927",
              background: "#FFFFFF",
              outline: "none",
              fontFamily: "'Poppins', system-ui, sans-serif",
              boxSizing: "border-box",
            }}
          />

          {/* Sort */}
          <select
            value={candidateSortBy}
            onChange={e => setCandidateSortBy(e.target.value)}
            className="candidate-filter-ctrl candidate-ctrl-sort"
            style={{
              height: 42,
              width: 150,
              minWidth: 140,
              maxWidth: 160,
              flex: "0 1 auto",
              padding: "0 10px",
              borderRadius: 8,
              border: "1px solid #E5E3DF",
              fontSize: 14,
              color: "#151927",
              background: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
              fontFamily: "'Poppins', system-ui, sans-serif",
              boxSizing: "border-box",
            }}
          >
            <option value="createdAt">Newest First</option>
            <option value="companyName">Business A–Z</option>
            <option value="status">Status</option>
            <option value="city">City</option>
          </select>

          {/* Page Size */}
          <select
            value={candidatePageSize}
            onChange={e => { setCandidatePageSize(parseInt(e.target.value)); setCandidatePage(1); }}
            className="candidate-filter-ctrl candidate-ctrl-pagesize"
            style={{
              height: 42,
              width: 110,
              minWidth: 100,
              maxWidth: 120,
              flex: "0 1 auto",
              padding: "0 10px",
              borderRadius: 8,
              border: "1px solid #E5E3DF",
              fontSize: 14,
              color: "#151927",
              background: "#FFFFFF",
              outline: "none",
              cursor: "pointer",
              fontFamily: "'Poppins', system-ui, sans-serif",
              boxSizing: "border-box",
            }}
          >
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>

          {/* Clear Filters (conditional) */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              style={{
                height: 42,
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid #FBD5D5",
                background: "#FDECEC",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                color: "#EC6262",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                boxSizing: "border-box",
              }}
              title="Reset all filters"
            >
              <span>✕ Clear</span>
            </button>
          )}

          {/* Total & Page Counts */}
          <div className="candidate-filter-meta" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9299A8", whiteSpace: "nowrap", paddingLeft: 4 }}>
            <span>Total: <strong style={{ color: "#151927" }}>{candidateData?.total ?? 0}</strong></span>
            {candidateData && (
              <span style={{ fontSize: 12, background: "#FAF9F7", padding: "2px 8px", borderRadius: 4, border: "1px solid #E5E3DF" }}>
                Page {candidateData.page} of {candidateData.totalPages || 1}
              </span>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 8, paddingTop: 6, borderTop: "1px solid #F0EEEA" }}>
            <span style={{ fontSize: 11, color: "#9299A8", fontWeight: 500 }}>Active filters:</span>
            {candidateSearchDebounced && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 5, background: "#F0ECFA", color: "#49339A", fontSize: 11, border: "1px solid #E0D6F5" }}>
                Search: "{candidateSearchDebounced}"
                <button onClick={() => setCandidateSearch("")} style={{ background: "none", border: "none", color: "#49339A", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
              </span>
            )}
            {candidateStatus !== "All" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 5, background: "#F0ECFA", color: "#49339A", fontSize: 11, border: "1px solid #E0D6F5" }}>
                Status: {candidateStatus}
                <button onClick={() => setCandidateStatus("All")} style={{ background: "none", border: "none", color: "#49339A", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
              </span>
            )}
            {candidateCategory !== "All" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 5, background: "#F0ECFA", color: "#49339A", fontSize: 11, border: "1px solid #E0D6F5" }}>
                Category: {categories.find(c => c.slug === candidateCategory)?.name || candidateCategory}
                <button onClick={() => setCandidateCategory("All")} style={{ background: "none", border: "none", color: "#49339A", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
              </span>
            )}
            {candidateCity && candidateCity !== "All" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 5, background: "#F0ECFA", color: "#49339A", fontSize: 11, border: "1px solid #E0D6F5" }}>
                City: {candidateCity}
                <button onClick={() => setCandidateCity("All")} style={{ background: "none", border: "none", color: "#49339A", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
              </span>
            )}
            {candidateSourceId !== "All" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 5, background: "#F0ECFA", color: "#49339A", fontSize: 11, border: "1px solid #E0D6F5" }}>
                Source: {sources.find(s => s.id === candidateSourceId)?.name || candidateSourceId}
                <button onClick={() => setCandidateSourceId("All")} style={{ background: "none", border: "none", color: "#49339A", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
              </span>
            )}
          </div>
        )}

        <style>{`
          @media (max-width: 1200px) {
            .candidate-filter-search {
              flex: 1 1 100% !important;
              max-width: 100% !important;
            }
            .candidate-filter-meta {
              width: 100%;
              justify-content: flex-end;
              margin-top: 4px;
            }
          }
          @media (max-width: 640px) {
            .candidate-filter-ctrl {
              flex: 1 1 calc(50% - 6px) !important;
              min-width: 0 !important;
              max-width: none !important;
              width: auto !important;
            }
          }
        `}</style>
      </div>

      {/* Candidate Data Table */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 14px" }}>Business</th>
                <th style={{ padding: "10px 14px" }}>Contact</th>
                <th style={{ padding: "10px 14px" }}>Location</th>
                <th style={{ padding: "10px 14px" }}>Source</th>
                <th style={{ padding: "10px 14px" }}>Status</th>
                <th style={{ padding: "10px 14px" }}>Decision / Reason</th>
                <th style={{ padding: "10px 14px" }}>Discovered</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {candidateLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F0EEEA" }}>
                    <td style={{ padding: "12px 14px" }}><div style={{ width: 140, height: 14, background: "#F0EEEA", borderRadius: 4 }} /></td>
                    <td style={{ padding: "12px 14px" }}><div style={{ width: 120, height: 14, background: "#F0EEEA", borderRadius: 4 }} /></td>
                    <td style={{ padding: "12px 14px" }}><div style={{ width: 90, height: 14, background: "#F0EEEA", borderRadius: 4 }} /></td>
                    <td style={{ padding: "12px 14px" }}><div style={{ width: 100, height: 14, background: "#F0EEEA", borderRadius: 4 }} /></td>
                    <td style={{ padding: "12px 14px" }}><div style={{ width: 80, height: 14, background: "#F0EEEA", borderRadius: 4 }} /></td>
                    <td style={{ padding: "12px 14px" }}><div style={{ width: 130, height: 14, background: "#F0EEEA", borderRadius: 4 }} /></td>
                    <td style={{ padding: "12px 14px" }}><div style={{ width: 70, height: 14, background: "#F0EEEA", borderRadius: 4 }} /></td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}><div style={{ width: 50, height: 24, background: "#F0EEEA", borderRadius: 6, marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : candidateError ? (
                <tr>
                  <td colSpan={8} style={{ padding: "32px", textAlign: "center" }}>
                    <div style={{ color: "#EC6262", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Error: {candidateError}</div>
                    <button onClick={fetchCandidates} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer" }}>Retry</button>
                  </td>
                </tr>
              ) : !candidateData || candidateData.candidates.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "36px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#151927", marginBottom: 4 }}>
                      {hasActiveFilters ? "No candidates match these filters." : "No candidates have been discovered yet."}
                    </div>
                    <div style={{ fontSize: 12, color: "#60697A", marginBottom: 12 }}>
                      {hasActiveFilters ? "Try clearing search keywords or facet selections." : "Candidate discovery runs will populate this queue automatically."}
                    </div>
                    {hasActiveFilters && (
                      <button onClick={clearAllFilters} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #E5E3DF", background: "#FAF9F7", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                candidateData.candidates.map((c: any) => {
                  const badge = statusBadgeStyle(c.status);
                  const emailInfo = classifyEmail(c.email);
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                      {/* Business */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#151927", fontSize: 13 }}>{c.companyName}</div>
                        <div style={{ fontSize: 11, color: "#60697A", marginTop: 1 }}>{c.businessCategory}</div>
                        <div style={{ fontSize: 10, color: "#9299A8", fontFamily: "monospace", marginTop: 2 }}>
                          {c.externalType || "entity"} · {c.externalId || "—"}
                        </div>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: "10px 14px" }}>
                        {c.email ? (
                          <div style={{ fontSize: 12, color: "#151927", fontWeight: 500 }}>{c.email}</div>
                        ) : (
                          <div style={{ fontSize: 11, color: "#9299A8", fontStyle: "italic" }}>No email discovered</div>
                        )}
                        {c.phone && <div style={{ fontSize: 11, color: "#60697A", marginTop: 1 }}>{c.phone}</div>}
                        {emailInfo.status === "GENERIC_WEBMAIL" && (
                          <span style={{ display: "inline-block", fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#FFF6E3", color: "#B7791F", border: "1px solid #F4BE52", marginTop: 2 }}>
                            generic webmail
                          </span>
                        )}
                      </td>

                      {/* Location */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 12, color: "#151927", fontWeight: 500 }}>
                          {c.city || "—"}{c.country ? ` (${c.country})` : ""}
                        </div>
                        {c.address && (
                          <div style={{ fontSize: 10, color: "#9299A8", marginTop: 1, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.address}
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 12, color: "#151927" }}>{humanReadableSource(c.discoverySource?.name)}</div>
                        <div style={{ fontSize: 10, color: "#9299A8" }}>{humanReadableExternalType(c.externalType)}</div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: "nowrap" }}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Decision / Reason */}
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#60697A" }}>
                        {c.rejectionReason ? (
                          <span style={{ color: "#C53030", fontWeight: 500 }}>
                            {humanReadableRejection(c.rejectionReason)}
                          </span>
                        ) : c.status === "NEEDS_ENRICHMENT" ? (
                          <span style={{ color: "#B7791F" }}>Missing email / awaiting enrichment</span>
                        ) : c.status === "QUALIFIED" ? (
                          <span style={{ color: "#276749", fontWeight: 500 }}>Promoted to CRM Lead</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Discovered */}
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#9299A8" }}>
                        <div>{new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#60697A" }}>
                          Run {c.discoveryRunId?.slice(0, 8)}…
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <button
                          onClick={() => fetchCandidateDetail(c.id)}
                          style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer", color: "#49339A", fontWeight: 500 }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {candidateData && candidateData.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #E5E3DF", background: "#FAF9F7", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 11, color: "#60697A" }}>
              Showing {(candidateData.page - 1) * candidateData.pageSize + 1}–{Math.min(candidateData.page * candidateData.pageSize, candidateData.total)} of {candidateData.total} candidates
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                disabled={candidateData.page <= 1}
                onClick={() => setCandidatePage(p => Math.max(1, p - 1))}
                style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: candidateData.page <= 1 ? "#F0EEEA" : "white", fontSize: 11, cursor: candidateData.page <= 1 ? "not-allowed" : "pointer", color: candidateData.page <= 1 ? "#9299A8" : "#151927" }}
              >
                ← Previous
              </button>
              <span style={{ padding: "5px 10px", fontSize: 11, color: "#60697A" }}>
                Page {candidateData.page} of {candidateData.totalPages}
              </span>
              <button
                disabled={candidateData.page >= candidateData.totalPages}
                onClick={() => setCandidatePage(p => Math.min(candidateData.totalPages, p + 1))}
                style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: candidateData.page >= candidateData.totalPages ? "#F0EEEA" : "white", fontSize: 11, cursor: candidateData.page >= candidateData.totalPages ? "not-allowed" : "pointer", color: candidateData.page >= candidateData.totalPages ? "#9299A8" : "#151927" }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forensic Inspection Drawer */}
      {detailOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={drawerTitleId}
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setDetailOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(21,25,39,0.4)" }}
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: "relative",
              width: "min(580px, 94vw)",
              background: "#FFFFFF",
              borderLeft: "1px solid #E5E3DF",
              boxShadow: "-8px 0 24px rgba(21,25,39,0.08)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "100vh",
              overflow: "hidden",
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E3DF", display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#FAF9F7" }}>
              <div>
                <div style={{ fontSize: 11, color: "#9299A8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Candidate Inspection</div>
                <h3 id={drawerTitleId} style={{ fontSize: 16, fontWeight: 600, color: "#151927", margin: "2px 0 2px" }}>
                  {selectedCandidate?.companyName || "Candidate Details"}
                </h3>
                <div style={{ fontSize: 12, color: "#60697A" }}>
                  {selectedCandidate?.businessCategory} · {selectedCandidate?.city || "—"}{selectedCandidate?.country ? `, ${selectedCandidate.country}` : ""}
                </div>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                aria-label="Close candidate inspection"
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
              >
                ✕ Close
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "grid", gap: 14 }}>
              {detailLoading ? (
                <div style={{ display: "grid", gap: 12, padding: "20px 0" }}>
                  <div style={{ height: 90, background: "#F0EEEA", borderRadius: 10 }} />
                  <div style={{ height: 110, background: "#F0EEEA", borderRadius: 10 }} />
                  <div style={{ height: 110, background: "#F0EEEA", borderRadius: 10 }} />
                </div>
              ) : detailError ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <div style={{ color: "#EC6262", fontSize: 13, marginBottom: 10 }}>Error: {detailError}</div>
                  <button
                    onClick={() => selectedCandidateId && fetchCandidateDetail(selectedCandidateId)}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer" }}
                  >
                    Retry loading
                  </button>
                </div>
              ) : !selectedCandidate ? (
                <div style={{ padding: 24, textAlign: "center", color: "#9299A8" }}>No candidate data available.</div>
              ) : (
                <>
                  {/* 1. Decision Summary Callout (Most Important) */}
                  <div
                    style={{
                      background: decisionInfo?.tone === "good" ? "#EEF8F4" : decisionInfo?.tone === "warn" ? "#FFF6E3" : decisionInfo?.tone === "bad" ? "#FDECEC" : "#FAF9F7",
                      border: `1px solid ${decisionInfo?.tone === "good" ? "#D5F0E5" : decisionInfo?.tone === "warn" ? "#F4BE52" : decisionInfo?.tone === "bad" ? "#FBD5D5" : "#E5E3DF"}`,
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: decisionInfo?.tone === "good" ? "#276749" : decisionInfo?.tone === "warn" ? "#B7791F" : decisionInfo?.tone === "bad" ? "#C53030" : "#60697A", textTransform: "uppercase" }}>
                        Decision Summary
                      </div>
                      <span style={{ ...(() => { const s = statusBadgeStyle(selectedCandidate.status); return { background: s.bg, color: s.color, border: `1px solid ${s.border}` }; })(), fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6 }}>
                        {selectedCandidate.status}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 6 }}>
                      {decisionInfo?.statusTitle}
                    </div>
                    <p style={{ fontSize: 12, color: "#60697A", margin: "0 0 10px", lineHeight: 1.5 }}>
                      {decisionInfo?.summary}
                    </p>

                    <div style={{ display: "grid", gap: 6, fontSize: 11, background: "rgba(255,255,255,0.7)", padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)" }}>
                      <div><strong style={{ color: "#151927" }}>Email Status:</strong> <span style={{ color: "#60697A" }}>{decisionInfo?.emailEvidence}</span></div>
                      <div><strong style={{ color: "#151927" }}>Website Status:</strong> <span style={{ color: "#60697A" }}>{decisionInfo?.websiteEvidence}</span></div>
                      <div><strong style={{ color: "#151927" }}>Pipeline Outcome:</strong> <span style={{ color: "#49339A", fontWeight: 500 }}>{decisionInfo?.result}</span></div>
                    </div>
                  </div>

                  {/* 2. Business Identity */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>
                      Business Identity
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Company:</span> <strong style={{ color: "#151927", display: "block" }}>{selectedCandidate.companyName}</strong></div>
                      <div><span style={{ color: "#9299A8" }}>Category:</span> <div style={{ color: "#151927", fontWeight: 500 }}>{selectedCandidate.businessCategory}</div></div>
                      <div style={{ gridColumn: "span 2" }}>
                        <span style={{ color: "#9299A8" }}>Address:</span>
                        <div style={{ color: "#151927" }}>{selectedCandidate.address || "—"}</div>
                      </div>
                      <div><span style={{ color: "#9299A8" }}>City / Country:</span> <div style={{ color: "#151927" }}>{selectedCandidate.city || "—"}{selectedCandidate.country ? ` (${selectedCandidate.country})` : ""}</div></div>
                      <div><span style={{ color: "#9299A8" }}>Postcode:</span> <div style={{ color: "#151927" }}>{selectedCandidate.postcode || "—"}</div></div>
                      <div>
                        <span style={{ color: "#9299A8" }}>Coordinates:</span>
                        <div style={{ color: "#151927", fontFamily: "monospace", fontSize: 11 }}>
                          {selectedCandidate.latitude && selectedCandidate.longitude ? `${selectedCandidate.latitude.toFixed(5)}, ${selectedCandidate.longitude.toFixed(5)}` : "—"}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: "#9299A8" }}>External ID:</span>
                        <div style={{ color: "#151927", fontFamily: "monospace", fontSize: 11 }}>
                          {selectedCandidate.externalType || "entity"} · {selectedCandidate.externalId || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Contact Intelligence */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>
                      Contact Intelligence
                    </div>
                    <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ color: "#9299A8" }}>Email:</span>{" "}
                          <span style={{ fontWeight: selectedCandidate.email ? 600 : 400, color: selectedCandidate.email ? "#151927" : "#9299A8" }}>
                            {selectedCandidate.email || "No email discovered"}
                          </span>
                        </div>
                        {drawerEmailInfo && (
                          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: drawerEmailInfo.status === "VALID_BUSINESS" ? "#EEF8F4" : drawerEmailInfo.status === "GENERIC_WEBMAIL" ? "#FFF6E3" : "#FAF9F7", color: drawerEmailInfo.status === "VALID_BUSINESS" ? "#276749" : drawerEmailInfo.status === "GENERIC_WEBMAIL" ? "#B7791F" : "#9299A8", border: "1px solid #E5E3DF" }}>
                            {drawerEmailInfo.label}
                          </span>
                        )}
                      </div>

                      <div>
                        <span style={{ color: "#9299A8" }}>Phone:</span>{" "}
                        <span style={{ color: selectedCandidate.phone ? "#151927" : "#9299A8" }}>
                          {selectedCandidate.phone || "No phone discovered"}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: "#9299A8" }}>Discovery Website:</span>{" "}
                        {selectedCandidate.website ? (
                          <a href={selectedCandidate.website} target="_blank" rel="noopener noreferrer" style={{ color: "#49339A", textDecoration: "underline" }}>
                            {selectedCandidate.website}
                          </a>
                        ) : (
                          <span style={{ color: "#9299A8", fontStyle: "italic" }}>Not provided by discovery source</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Website & Verification Evidence */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>
                      Website & Verification Evidence
                    </div>
                    <div style={{ display: "grid", gap: 8, fontSize: 11 }}>
                      {/* Discovery Source Evidence */}
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FAF9F7", padding: "8px 10px", borderRadius: 6 }}>
                        <span style={{ fontSize: 14 }}>{selectedCandidate.website ? "🌐" : "○"}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: "#151927" }}>Discovery Source Evidence ({humanReadableSource(selectedCandidate.discoverySource?.name || "OpenStreetMap")})</div>
                          <div style={{ color: "#60697A", marginTop: 2 }}>
                            {selectedCandidate.website ? `Website URL supplied: ${selectedCandidate.website} (Disqualified from NO_SITE qualification)` : `Not provided by discovery source (${humanReadableSource(selectedCandidate.discoverySource?.name || "OpenStreetMap")} tags contain no website URL)`}
                          </div>
                        </div>
                      </div>

                      {/* Email Domain Check Evidence */}
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: selectedCandidate.rejectionReason === "email_domain_has_live_website" ? "#FDECEC" : "#FAF9F7", padding: "8px 10px", borderRadius: 6, border: selectedCandidate.rejectionReason === "email_domain_has_live_website" ? "1px solid #FBD5D5" : "none" }}>
                        <span style={{ fontSize: 14 }}>{selectedCandidate.rejectionReason === "email_domain_has_live_website" ? "✕" : "○"}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: selectedCandidate.rejectionReason === "email_domain_has_live_website" ? "#C53030" : "#151927" }}>
                            Email Domain Website Verification
                          </div>
                          <div style={{ color: selectedCandidate.rejectionReason === "email_domain_has_live_website" ? "#C53030" : "#60697A", marginTop: 2 }}>
                            {selectedCandidate.rejectionReason === "email_domain_has_live_website" ? `Live website detected responding on https://${drawerEmailInfo?.domain || "domain"} (LIVE — Excluded to prevent false NO_SITE)` : selectedCandidate.email ? `Email domain (${drawerEmailInfo?.domain || "domain"}) evaluated during qualification — no independent live website confirmed` : "Not evaluated (candidate lacks email)"}
                          </div>
                        </div>
                      </div>

                      {/* Google Cross-Source Verification */}
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FAF9F7", padding: "8px 10px", borderRadius: 6 }}>
                        <span style={{ fontSize: 14 }}>◈</span>
                        <div>
                          <div style={{ fontWeight: 600, color: "#151927" }}>Google Places Cross-Source Verification</div>
                          <div style={{ color: "#60697A", marginTop: 2 }}>
                            {selectedCandidate.metadata?.googlePlaceId ? `Google Place match: ${selectedCandidate.metadata.googlePlaceId} (${selectedCandidate.metadata.googleEvidence || "Verified"})` : "Not checked (Google Places integration is currently disabled; no candidate-specific Google verification performed)"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Source Evidence (Parsed from metadata.sourceEvidence) */}
                  {Array.isArray(selectedCandidate.metadata?.sourceEvidence) && selectedCandidate.metadata.sourceEvidence.length > 0 && (
                    <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>
                        Source Evidence Records ({selectedCandidate.metadata.sourceEvidence.length})
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {selectedCandidate.metadata.sourceEvidence.map((ev: any, idx: number) => (
                          <div key={idx} style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 6, padding: 8, fontSize: 11 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <strong style={{ color: "#151927" }}>{ev.sourceType || "OVERPASS"} #{ev.externalId}</strong>
                              <span style={{ color: "#9299A8" }}>{ev.collectedAt ? new Date(ev.collectedAt).toLocaleString() : "—"}</span>
                            </div>
                            <div style={{ color: "#60697A" }}>
                              Raw Name: <span style={{ color: "#151927" }}>{ev.rawName || "—"}</span> · Raw Email: <span style={{ color: "#151927" }}>{ev.rawEmail || "None"}</span>
                            </div>
                            <div style={{ color: "#60697A" }}>
                              Raw Website: <span style={{ color: "#151927" }}>{ev.rawWebsite || "None"}</span> · Phone: <span style={{ color: "#151927" }}>{ev.rawPhone || "None"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 6. Discovery Traceability & Collector Run */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>
                      Discovery Traceability
                    </div>
                    <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Discovery Source:</span> <strong style={{ color: "#151927" }}>{humanReadableSource(selectedCandidate.discoverySource?.name)}</strong> ({selectedCandidate.discoverySource?.type || "overpass"})</div>
                      <div>
                        <span style={{ color: "#9299A8" }}>Collector Run ID:</span>{" "}
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#151927" }}>{selectedCandidate.discoveryRunId}</span>
                      </div>
                      {selectedCandidate.discoveryRun && (
                        <>
                          <div>
                            <span style={{ color: "#9299A8" }}>Run Target:</span>{" "}
                            <span style={{ color: "#151927" }}>
                              {selectedCandidate.discoveryRun.location?.city || "—"} / {selectedCandidate.discoveryRun.category?.slug || "—"} ({selectedCandidate.discoveryRun.status})
                            </span>
                          </div>
                          <div>
                            <span style={{ color: "#9299A8" }}>Execution Time:</span>{" "}
                            <span style={{ color: "#60697A" }}>{new Date(selectedCandidate.discoveryRun.startedAt).toLocaleString()}</span>
                          </div>
                          {selectedCandidate.discoveryRun.metadata?.githubRunId && (
                            <div>
                              <span style={{ color: "#9299A8" }}>GitHub Run:</span>{" "}
                              <a
                                href={githubRunUrl(selectedCandidate.discoveryRun.metadata.githubRunId) || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#49339A", textDecoration: "underline", fontSize: 11 }}
                              >
                                GH Actions #{selectedCandidate.discoveryRun.metadata.githubRunId} ↗
                              </a>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 7. CRM Lead Relationship */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>
                      CRM Lead Relationship
                    </div>
                    {selectedCandidate.qualifiedLead ? (
                      <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div><strong style={{ color: "#151927" }}>{selectedCandidate.qualifiedLead.companyName}</strong></div>
                          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#EEF8F4", color: "#276749", border: "1px solid #D5F0E5", fontWeight: 600 }}>
                            Lead #{selectedCandidate.qualifiedLead.id?.slice(0, 8)}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#60697A" }}>
                          Status: {selectedCandidate.qualifiedLead.status} · Score: {selectedCandidate.qualifiedLead.score ?? 0} · Segment: {selectedCandidate.qualifiedLead.segment || "—"}
                        </div>
                        <Link
                          href={`/leads/${selectedCandidate.qualifiedLead.id}`}
                          style={{ color: "#49339A", fontSize: 12, fontWeight: 500, textDecoration: "underline", marginTop: 4, display: "inline-block" }}
                        >
                          View CRM Lead Record ↗
                        </Link>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#60697A" }}>
                        No CRM Lead created. Candidate is currently in <strong>{selectedCandidate.status}</strong> state{selectedCandidate.rejectionReason ? ` (${humanReadableRejection(selectedCandidate.rejectionReason)})` : ""}.
                      </div>
                    )}
                  </div>

                  {/* 8. Technical Data (Collapsed by default) */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>
                        Raw Discovery Tags
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(selectedCandidate.rawTags || {}, null, 2), "tags")}
                          style={{ fontSize: 11, color: "#60697A", background: "none", border: "none", cursor: "pointer" }}
                        >
                          {copiedSection === "tags" ? "✓ Copied" : "Copy Tags"}
                        </button>
                        <button
                          onClick={() => setRawTagsOpen(!rawTagsOpen)}
                          style={{ fontSize: 11, color: "#49339A", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                        >
                          {rawTagsOpen ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                    {rawTagsOpen && (
                      <pre style={{ margin: "10px 0 0", padding: 10, background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 6, fontSize: 11, overflowX: "auto", maxHeight: 200, fontFamily: "monospace" }}>
                        {JSON.stringify(selectedCandidate.rawTags || {}, null, 2)}
                      </pre>
                    )}
                  </div>

                  {/* 9. Technical Metadata (Collapsed by default) */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>
                        Technical Metadata
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(selectedCandidate.metadata || {}, null, 2), "meta")}
                          style={{ fontSize: 11, color: "#60697A", background: "none", border: "none", cursor: "pointer" }}
                        >
                          {copiedSection === "meta" ? "✓ Copied" : "Copy Metadata"}
                        </button>
                        <button
                          onClick={() => setRawMetaOpen(!rawMetaOpen)}
                          style={{ fontSize: 11, color: "#49339A", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                        >
                          {rawMetaOpen ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                    {rawMetaOpen && (
                      <pre style={{ margin: "10px 0 0", padding: 10, background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 6, fontSize: 11, overflowX: "auto", maxHeight: 200, fontFamily: "monospace" }}>
                        {JSON.stringify(selectedCandidate.metadata || {}, null, 2)}
                      </pre>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

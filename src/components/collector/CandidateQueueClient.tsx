"use client";

import { useState, useEffect, useCallback } from "react";
import { humanReadableRejection, statusBadgeStyle } from "./collector-utils";

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
  const [candidateData, setCandidateData] = useState<{ candidates: any[]; total: number; page: number; pageSize: number; totalPages: number } | null>(null);
  const [candidateStats, setCandidateStats] = useState<any>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rawTagsOpen, setRawTagsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCandidateSearchDebounced(candidateSearch), 400);
    return () => clearTimeout(t);
  }, [candidateSearch]);

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
      if (!res.ok) throw new Error("Failed to fetch candidates");
      const data = await res.json();
      setCandidateData(data);
    } catch (e: any) {
      setCandidateError(e.message);
    } finally {
      setCandidateLoading(false);
    }
  }, [candidatePage, candidatePageSize, candidateSearchDebounced, candidateStatus, candidateCategory, candidateCity, candidateSourceId, candidateSortBy, candidateSortOrder]);

  const fetchCandidateDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setSelectedCandidateId(id);
    setDetailOpen(true);
    setRawTagsOpen(false);
    try {
      const res = await fetch(`/api/collector/candidates/${id}`);
      if (!res.ok) throw new Error("Failed to fetch candidate detail");
      const data = await res.json();
      setSelectedCandidate(data);
    } catch (e: any) {
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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showHeader && (
        <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Candidate Queue</h2>
            <p style={{ fontSize: 13, color: "#60697A" }}>Discovery storage of parsed businesses progressing through qualification and verification.</p>
          </div>
        </div>
      )}

      {/* Summary — dynamic counts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Total Candidates</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.total ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>24h: {candidateStats?.recent24h ?? 0} new</div>
        </div>
        <div style={{ background: "white", border: "1px solid #F4BE52", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#B7791F", textTransform: "uppercase" }}>Needs Enrichment</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.NEEDS_ENRICHMENT ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>No email, no website</div>
        </div>
        <div style={{ background: "white", border: "1px solid #FBD5D5", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#C53030", textTransform: "uppercase" }}>Rejected</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.REJECTED ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Website exists / duplicate</div>
        </div>
        <div style={{ background: "white", border: "1px solid #D5F0E5", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#276749", textTransform: "uppercase" }}>Qualified</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.QUALIFIED ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Linked to CRM Lead</div>
        </div>
        <div style={{ background: "white", border: "1px solid #E0D6F5", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#553C9A", textTransform: "uppercase" }}>Discovered</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.DISCOVERED ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Initial state</div>
        </div>
        <div style={{ background: "white", border: "1px solid #C5E9F1", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#2B6CB0", textTransform: "uppercase" }}>Verification Pending</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.VERIFICATION_PENDING ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Awaiting verification</div>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
        {/* Row 1: Search + Clear */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={candidateSearch}
            onChange={e => setCandidateSearch(e.target.value)}
            placeholder="Search company, email, phone, city, externalId..."
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
          />
          <button
            onClick={() => {
              setCandidateSearch("");
              setCandidateStatus("All");
              setCandidateCategory("All");
              setCandidateCity("All");
              setCandidateSourceId("All");
              setCandidatePage(1);
            }}
            style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #E5E3DF", background: "#FAF9F7", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Clear filters
          </button>
        </div>
        {/* Row 2: Status / Category / Source / City / PageSize / Sort */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={candidateStatus} onChange={e => { setCandidateStatus(e.target.value); setCandidatePage(1); }} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white", minWidth: 140 }}>
            <option value="All">All Status</option>
            <option value="NEEDS_ENRICHMENT">Needs Enrichment</option>
            <option value="REJECTED">Rejected</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="DISCOVERED">Discovered</option>
            <option value="VERIFICATION_PENDING">Verification Pending</option>
          </select>
          <select value={candidateCategory} onChange={e => { setCandidateCategory(e.target.value); setCandidatePage(1); }} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white", minWidth: 140 }}>
            <option value="All">All Categories</option>
            {categories.map((c: any) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          <select value={candidateSourceId} onChange={e => { setCandidateSourceId(e.target.value); setCandidatePage(1); }} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white", minWidth: 130 }}>
            <option value="All">All Sources</option>
            {sources.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            value={candidateCity === "All" ? "" : candidateCity}
            onChange={e => { setCandidateCity(e.target.value || "All"); setCandidatePage(1); }}
            placeholder="City"
            style={{ width: 120, padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12 }}
          />
          <select value={candidatePageSize} onChange={e => { setCandidatePageSize(parseInt(e.target.value)); setCandidatePage(1); }} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white" }}>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
          <select value={candidateSortBy} onChange={e => setCandidateSortBy(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white" }}>
            <option value="createdAt">Newest</option>
            <option value="companyName">Business A-Z</option>
            <option value="status">Status</option>
            <option value="city">City</option>
          </select>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#9299A8", display: "flex", gap: 12 }}>
            <span>Total: {candidateData?.total ?? 0}</span>
            {candidateData && <span>Page {candidateData.page}/{candidateData.totalPages}</span>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 12px" }}>Business</th>
                <th style={{ padding: "10px 12px" }}>Category</th>
                <th style={{ padding: "10px 12px" }}>Location</th>
                <th style={{ padding: "10px 12px" }}>Contact</th>
                <th style={{ padding: "10px 12px" }}>Discovery</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
                <th style={{ padding: "10px 12px" }}>Reason</th>
                <th style={{ padding: "10px 12px" }}>Created</th>
                <th style={{ padding: "10px 12px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {candidateLoading ? (
                <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>Loading candidates...</td></tr>
              ) : candidateError ? (
                <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "#EC6262", fontSize: 12 }}>Error: {candidateError}</td></tr>
              ) : !candidateData || candidateData.candidates.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>{candidateSearchDebounced || candidateStatus !== "All" || candidateCategory !== "All" || candidateCity !== "All" || candidateSourceId !== "All" ? "No candidates match these filters." : "No candidates discovered yet. Run collector to discover businesses."}</td></tr>
              ) : (
                candidateData.candidates.map((c: any) => {
                  const badge = statusBadgeStyle(c.status);
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 500, color: "#151927", fontSize: 12 }}>{c.companyName}</div>
                        <div style={{ fontSize: 10, color: "#9299A8", fontFamily: "monospace" }}>{c.externalType} {c.externalId}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "#60697A" }}>{c.businessCategory}</td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "#151927" }}>
                        <div>{c.city || "—"} {c.country ? `(${c.country})` : ""}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "#60697A" }}>
                        <div>{c.email || "—"}</div>
                        <div style={{ fontSize: 10, color: "#9299A8" }}>{c.phone || ""}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "#60697A" }}>
                        <div>{c.discoverySource?.name || "—"}</div>
                        <div style={{ fontSize: 10, color: "#9299A8", fontFamily: "monospace" }}>Run {c.discoveryRunId?.slice(0, 8)}… {c.discoveryRun?.location?.city ? `(${c.discoveryRun.location.city})` : ""}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 7px", borderRadius: 6, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: "nowrap" }}>{c.status}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "#60697A" }}>{humanReadableRejection(c.rejectionReason)}</td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "#9299A8" }}>{new Date(c.createdAt).toLocaleDateString()}<br /><span style={{ fontSize: 10 }}>{new Date(c.createdAt).toLocaleTimeString()}</span></td>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => fetchCandidateDetail(c.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer", color: "#49339A", fontWeight: 500 }}>Inspect</button>
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
              Showing {(candidateData.page - 1) * candidateData.pageSize + 1}–{Math.min(candidateData.page * candidateData.pageSize, candidateData.total)} of {candidateData.total} — Page {candidateData.page} / {candidateData.totalPages}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button disabled={candidateData.page <= 1} onClick={() => setCandidatePage(p => Math.max(1, p - 1))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: candidateData.page <= 1 ? "#F0EEEA" : "white", fontSize: 11, cursor: candidateData.page <= 1 ? "not-allowed" : "pointer", color: candidateData.page <= 1 ? "#9299A8" : "#151927" }}>Prev</button>
              <span style={{ padding: "6px 10px", fontSize: 11, color: "#60697A" }}>{candidateData.page} / {candidateData.totalPages}</span>
              <button disabled={candidateData.page >= candidateData.totalPages} onClick={() => setCandidatePage(p => Math.min(candidateData.totalPages, p + 1))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: candidateData.page >= candidateData.totalPages ? "#F0EEEA" : "white", fontSize: 11, cursor: candidateData.page >= candidateData.totalPages ? "not-allowed" : "pointer", color: candidateData.page >= candidateData.totalPages ? "#9299A8" : "#151927" }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {detailOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={() => setDetailOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(21,25,39,0.4)" }} />
          <div style={{ position: "relative", width: "min(520px, 92vw)", background: "white", borderLeft: "1px solid #E5E3DF", boxShadow: "-8px 0 24px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", maxHeight: "100vh", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E3DF", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAF9F7" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Candidate Inspection</div>
                <div style={{ fontSize: 11, color: "#9299A8", fontFamily: "monospace" }}>{selectedCandidateId?.slice(0, 16)}…</div>
              </div>
              <button onClick={() => setDetailOpen(false)} aria-label="Close detail" style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer" }}>✕ Close</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "grid", gap: 16 }}>
              {detailLoading ? (
                <div style={{ fontSize: 12, color: "#9299A8", padding: 20, textAlign: "center" }}>Loading candidate forensic data...</div>
              ) : !selectedCandidate ? (
                <div style={{ fontSize: 12, color: "#EC6262", padding: 20, textAlign: "center" }}>Failed to load candidate.</div>
              ) : (
                <>
                  {/* Business Identity */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Business Identity</div>
                    <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Company Name:</span> <strong style={{ color: "#151927" }}>{selectedCandidate.companyName}</strong></div>
                      <div><span style={{ color: "#9299A8" }}>Category:</span> {selectedCandidate.businessCategory}</div>
                      <div><span style={{ color: "#9299A8" }}>External ID:</span> <span style={{ fontFamily: "monospace" }}>{selectedCandidate.externalType} / {selectedCandidate.externalId || "—"}</span></div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: "#9299A8" }}>Status:</span>
                        <span style={{ ...(() => { const s = statusBadgeStyle(selectedCandidate.status); return { background: s.bg, color: s.color, border: `1px solid ${s.border}` }; })(), fontSize: 10, fontWeight: 600, padding: "3px 7px", borderRadius: 6 }}>{selectedCandidate.status}</span>
                      </div>
                      {selectedCandidate.rejectionReason && (
                        <div>
                          <span style={{ color: "#9299A8" }}>Rejection Reason:</span>{" "}
                          <span style={{ background: "#FDECEC", color: "#C53030", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
                            {humanReadableRejection(selectedCandidate.rejectionReason)} <span style={{ fontSize: 10, color: "#9299A8" }}>({selectedCandidate.rejectionReason})</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pipeline Lifecycle Timeline */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Pipeline Lifecycle</div>
                    <div style={{ display: "grid", gap: 8, fontSize: 11 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ width: 18, height: 18, borderRadius: 9999, background: "#EEF8F4", color: "#4FAE91", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✓</span>
                        <div><strong>1. Discovered:</strong> {new Date(selectedCandidate.createdAt).toLocaleString()} via {selectedCandidate.discoverySource?.name || "Collector"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ width: 18, height: 18, borderRadius: 9999, background: selectedCandidate.status === "REJECTED" ? "#FDECEC" : "#EEF8F4", color: selectedCandidate.status === "REJECTED" ? "#EC6262" : "#4FAE91", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{selectedCandidate.status === "REJECTED" ? "✕" : "✓"}</span>
                        <div><strong>2. Quality Filter:</strong> {selectedCandidate.status === "REJECTED" ? `Rejected (${humanReadableRejection(selectedCandidate.rejectionReason)})` : "Passed validation filter"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ width: 18, height: 18, borderRadius: 9999, background: selectedCandidate.status === "QUALIFIED" ? "#EEF8F4" : selectedCandidate.status === "NEEDS_ENRICHMENT" ? "#FFF6E3" : "#FAF9F7", color: selectedCandidate.status === "QUALIFIED" ? "#4FAE91" : selectedCandidate.status === "NEEDS_ENRICHMENT" ? "#F29B38" : "#9299A8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>•</span>
                        <div><strong>3. Enrichment / Verification:</strong> {selectedCandidate.status === "QUALIFIED" ? "Qualified" : selectedCandidate.status === "NEEDS_ENRICHMENT" ? "Queued for enrichment (Pending email discovery)" : selectedCandidate.status === "VERIFICATION_PENDING" ? "Verification in progress" : "None"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ width: 18, height: 18, borderRadius: 9999, background: selectedCandidate.qualifiedLead ? "#EEF8F4" : "#FAF9F7", color: selectedCandidate.qualifiedLead ? "#4FAE91" : "#9299A8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{selectedCandidate.qualifiedLead ? "✓" : "○"}</span>
                        <div><strong>4. CRM Lead:</strong> {selectedCandidate.qualifiedLead ? `Linked to Lead #${selectedCandidate.qualifiedLead.id}` : "Not in CRM leads"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Location */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Contact & Location</div>
                    <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Email:</span> {selectedCandidate.email || <span style={{ color: "#9299A8" }}>No email found</span>}</div>
                      <div><span style={{ color: "#9299A8" }}>Phone:</span> {selectedCandidate.phone || <span style={{ color: "#9299A8" }}>No phone found</span>}</div>
                      <div><span style={{ color: "#9299A8" }}>Website Tag:</span> {selectedCandidate.website ? <a href={selectedCandidate.website} target="_blank" rel="noopener noreferrer" style={{ color: "#49339A" }}>{selectedCandidate.website}</a> : <span style={{ color: "#9299A8" }}>No website tag</span>}</div>
                      <div><span style={{ color: "#9299A8" }}>Address:</span> {selectedCandidate.address || "—"}</div>
                      <div><span style={{ color: "#9299A8" }}>City / Country:</span> {selectedCandidate.city || "—"}{selectedCandidate.country ? `, ${selectedCandidate.country}` : ""} {selectedCandidate.postcode ? `(${selectedCandidate.postcode})` : ""}</div>
                      <div><span style={{ color: "#9299A8" }}>Coordinates:</span> {selectedCandidate.latitude && selectedCandidate.longitude ? `${selectedCandidate.latitude.toFixed(5)}, ${selectedCandidate.longitude.toFixed(5)}` : "—"}</div>
                    </div>
                  </div>

                  {/* Discovery Traceability */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Discovery Traceability</div>
                    <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Source:</span> {selectedCandidate.discoverySource?.name || "—"} ({selectedCandidate.discoverySource?.type || "unknown"})</div>
                      <div><span style={{ color: "#9299A8" }}>Collector Run:</span> <span style={{ fontFamily: "monospace" }}>{selectedCandidate.discoveryRunId}</span></div>
                      {selectedCandidate.discoveryRun && (
                        <>
                          <div><span style={{ color: "#9299A8" }}>Run Target:</span> {selectedCandidate.discoveryRun.location?.city || "—"} / {selectedCandidate.discoveryRun.category?.slug || "—"}</div>
                          <div><span style={{ color: "#9299A8" }}>Run Status:</span> {selectedCandidate.discoveryRun.status} ({new Date(selectedCandidate.discoveryRun.startedAt).toLocaleString()})</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Raw Data (JSON) */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Raw Discovery Tags</div>
                      <button onClick={() => setRawTagsOpen(!rawTagsOpen)} style={{ fontSize: 11, color: "#49339A", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>{rawTagsOpen ? "Hide" : "Show"}</button>
                    </div>
                    {rawTagsOpen && (
                      <pre style={{ margin: "10px 0 0", padding: 10, background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 6, fontSize: 11, overflowX: "auto", maxHeight: 200, fontFamily: "monospace" }}>
                        {JSON.stringify(selectedCandidate.rawTags || {}, null, 2)}
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

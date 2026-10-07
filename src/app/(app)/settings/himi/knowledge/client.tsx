"use client";

import React, { useState } from "react";
import {
  upsertBusinessProfile,
  createBusinessService,
  updateBusinessService,
  toggleBusinessServiceEnabled,
  createBusinessPortfolioItem,
  updateBusinessPortfolioItem,
  toggleBusinessPortfolioItemEnabled,
} from "@/lib/actions/himi-knowledge";

export interface BusinessProfileData {
  id: string;
  businessName: string;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  headquarters?: string | null;
  targetMarkets?: string | null;
  valueProposition?: string | null;
  positioning?: string | null;
  pricingPolicy?: string | null;
  salesGuidance?: string | null;
  updatedAt: string;
}

export interface BusinessServiceData {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  deliverables?: string | null;
  technologies?: string | null;
  idealCustomer?: string | null;
  pricingGuidance?: string | null;
  timelineGuidance?: string | null;
  salesNotes?: string | null;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessPortfolioData {
  id: string;
  projectName: string;
  clientName?: string | null;
  industry?: string | null;
  description?: string | null;
  servicesProvided?: string | null;
  technologies?: string | null;
  resultOutcome?: string | null;
  projectUrl?: string | null;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeManagerProps {
  initialProfile: BusinessProfileData | null;
  initialServices: BusinessServiceData[];
  initialPortfolio: BusinessPortfolioData[];
}

export function KnowledgeManager({
  initialProfile,
  initialServices,
  initialPortfolio,
}: KnowledgeManagerProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "services" | "portfolio">("profile");

  // Profile State
  const [profile, setProfile] = useState<BusinessProfileData | null>(initialProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  // Services State
  const [services, setServices] = useState<BusinessServiceData[]>(initialServices);
  const [editingService, setEditingService] = useState<BusinessServiceData | "new" | null>(null);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceFeedback, setServiceFeedback] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  // Portfolio State
  const [portfolio, setPortfolio] = useState<BusinessPortfolioData[]>(initialPortfolio);
  const [editingPortfolio, setEditingPortfolio] = useState<BusinessPortfolioData | "new" | null>(
    null
  );
  const [portfolioSaving, setPortfolioSaving] = useState(false);
  const [portfolioFeedback, setPortfolioFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback(null);

    const fd = new FormData(e.currentTarget);
    const res = await upsertBusinessProfile(fd);

    if (res.ok && res.profile) {
      setProfile({
        ...res.profile,
        updatedAt: res.profile.updatedAt.toISOString(),
      });
      setProfileFeedback({ ok: true, message: res.message || "Profile saved successfully." });
    } else {
      setProfileFeedback({ ok: false, message: res.message || "Failed to save profile." });
    }
    setProfileSaving(false);
  };

  // Service Save Handler
  const handleSaveService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServiceSaving(true);
    setServiceFeedback(null);

    const fd = new FormData(e.currentTarget);

    if (editingService === "new") {
      const res = await createBusinessService(fd);
      if (res.ok && res.service) {
        const formatted: BusinessServiceData = {
          ...res.service,
          createdAt: res.service.createdAt.toISOString(),
          updatedAt: res.service.updatedAt.toISOString(),
        };
        setServices((prev) => [...prev, formatted].sort((a, b) => a.priority - b.priority));
        setEditingService(null);
        setServiceFeedback({ ok: true, message: "Service created successfully." });
      } else {
        setServiceFeedback({ ok: false, message: res.message || "Failed to create service." });
      }
    } else if (editingService && typeof editingService === "object") {
      const res = await updateBusinessService(editingService.id, fd);
      if (res.ok && res.service) {
        const formatted: BusinessServiceData = {
          ...res.service,
          createdAt: res.service.createdAt.toISOString(),
          updatedAt: res.service.updatedAt.toISOString(),
        };
        setServices((prev) =>
          prev.map((s) => (s.id === formatted.id ? formatted : s)).sort((a, b) => a.priority - b.priority)
        );
        setEditingService(null);
        setServiceFeedback({ ok: true, message: "Service updated successfully." });
      } else {
        setServiceFeedback({ ok: false, message: res.message || "Failed to update service." });
      }
    }
    setServiceSaving(false);
  };

  // Service Toggle Handler
  const handleToggleService = async (id: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: nextEnabled } : s))
    );
    const res = await toggleBusinessServiceEnabled(id, nextEnabled);
    if (!res.ok) {
      // Revert on failure
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: currentEnabled } : s))
      );
      setServiceFeedback({ ok: false, message: res.message || "Failed to update status." });
    }
  };

  // Portfolio Save Handler
  const handleSavePortfolio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPortfolioSaving(true);
    setPortfolioFeedback(null);

    const fd = new FormData(e.currentTarget);

    if (editingPortfolio === "new") {
      const res = await createBusinessPortfolioItem(fd);
      if (res.ok && res.item) {
        const formatted: BusinessPortfolioData = {
          ...res.item,
          createdAt: res.item.createdAt.toISOString(),
          updatedAt: res.item.updatedAt.toISOString(),
        };
        setPortfolio((prev) => [...prev, formatted].sort((a, b) => a.priority - b.priority));
        setEditingPortfolio(null);
        setPortfolioFeedback({ ok: true, message: "Portfolio item created successfully." });
      } else {
        setPortfolioFeedback({ ok: false, message: res.message || "Failed to create portfolio item." });
      }
    } else if (editingPortfolio && typeof editingPortfolio === "object") {
      const res = await updateBusinessPortfolioItem(editingPortfolio.id, fd);
      if (res.ok && res.item) {
        const formatted: BusinessPortfolioData = {
          ...res.item,
          createdAt: res.item.createdAt.toISOString(),
          updatedAt: res.item.updatedAt.toISOString(),
        };
        setPortfolio((prev) =>
          prev.map((p) => (p.id === formatted.id ? formatted : p)).sort((a, b) => a.priority - b.priority)
        );
        setEditingPortfolio(null);
        setPortfolioFeedback({ ok: true, message: "Portfolio item updated successfully." });
      } else {
        setPortfolioFeedback({ ok: false, message: res.message || "Failed to update portfolio item." });
      }
    }
    setPortfolioSaving(false);
  };

  // Portfolio Toggle Handler
  const handleTogglePortfolio = async (id: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    setPortfolio((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: nextEnabled } : p))
    );
    const res = await toggleBusinessPortfolioItemEnabled(id, nextEnabled);
    if (!res.ok) {
      // Revert on failure
      setPortfolio((prev) =>
        prev.map((p) => (p.id === id ? { ...p, enabled: currentEnabled } : p))
      );
      setPortfolioFeedback({ ok: false, message: res.message || "Failed to update status." });
    }
  };

  return (
    <div className="vstack" style={{ gap: 20 }}>
      {/* Informational Boundary Banner */}
      <div className="callout info" style={{ margin: 0 }}>
        <div className="hstack" style={{ gap: 8, marginBottom: 4 }}>
          <strong>✦ Business Knowledge Boundary</strong>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Business Knowledge contains factual information about the configured business (services, pricing guidance, positioning, target markets, portfolio proof).
          <br />
          <strong>Do NOT store secrets here.</strong> API keys, passwords, database credentials, and private authentication tokens belong in encrypted OpenAI or environment settings.
        </p>
      </div>

      {/* Main Subtabs Navigation */}
      <div className="hstack" style={{ gap: 8, borderBottom: "1px solid var(--border-color, #e5e7eb)", paddingBottom: 8 }}>
        <button
          type="button"
          className={`btn sm ${activeTab === "profile" ? "primary" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          Business Profile
        </button>
        <button
          type="button"
          className={`btn sm ${activeTab === "services" ? "primary" : ""}`}
          onClick={() => setActiveTab("services")}
        >
          Services ({services.length})
        </button>
        <button
          type="button"
          className={`btn sm ${activeTab === "portfolio" ? "primary" : ""}`}
          onClick={() => setActiveTab("portfolio")}
        >
          Portfolio &amp; Proof ({portfolio.length})
        </button>
      </div>

      {/* ---------------------------------------------------------------- TAB 1: BUSINESS PROFILE */}
      {activeTab === "profile" && (
        <div className="card">
          <div className="card-head">
            <h3>Business Profile</h3>
          </div>
          <div className="card-body">
            {!profile && (
              <div className="callout warn" style={{ marginBottom: 16 }}>
                <strong>No business profile has been configured yet.</strong> Fill out the details below to establish your business identity.
              </div>
            )}

            {profileFeedback && (
              <div className={`callout ${profileFeedback.ok ? "success" : "error"}`} style={{ marginBottom: 16 }}>
                {profileFeedback.message}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="vstack" style={{ gap: 16 }}>
              <div className="grid c2">
                <div className="form-group">
                  <label>Business Name *</label>
                  <input
                    type="text"
                    name="businessName"
                    defaultValue={profile?.businessName || ""}
                    placeholder="e.g. Graphionic Infotech"
                    required
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Industry</label>
                  <input
                    type="text"
                    name="industry"
                    defaultValue={profile?.industry || ""}
                    placeholder="e.g. Software Development &amp; AI Solutions"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="grid c3">
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    name="website"
                    defaultValue={profile?.website || ""}
                    placeholder="https://example.com"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    name="contactEmail"
                    defaultValue={profile?.contactEmail || ""}
                    placeholder="contact@example.com"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    name="contactPhone"
                    defaultValue={profile?.contactPhone || ""}
                    placeholder="+44 20 1234 5678"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Headquarters / Location</label>
                <input
                  type="text"
                  name="headquarters"
                  defaultValue={profile?.headquarters || ""}
                  placeholder="e.g. London, UK / Remote Worldwide"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={profile?.description || ""}
                  placeholder="Brief overview of the business, background, and core focus..."
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Target Markets</label>
                <textarea
                  name="targetMarkets"
                  rows={2}
                  defaultValue={profile?.targetMarkets || ""}
                  placeholder="e.g. UK, USA, UAE, Australia — Dental Clinics, SMBs, E-commerce brands..."
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Value Proposition</label>
                <textarea
                  name="valueProposition"
                  rows={3}
                  defaultValue={profile?.valueProposition || ""}
                  placeholder="Core value proposition that sets this business apart..."
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Positioning</label>
                <textarea
                  name="positioning"
                  rows={3}
                  defaultValue={profile?.positioning || ""}
                  placeholder="Market positioning statement and brand identity guidance..."
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Global Pricing Policy</label>
                <textarea
                  name="pricingPolicy"
                  rows={3}
                  defaultValue={profile?.pricingPolicy || ""}
                  placeholder="Business-wide pricing rules and boundaries. HIMI must not invent pricing that is not configured."
                  className="form-control"
                />
                <span className="small muted">
                  Business-wide pricing rules and boundaries. HIMI must not invent pricing that is not configured.
                </span>
              </div>

              <div className="form-group">
                <label>Sales Guidance</label>
                <textarea
                  name="salesGuidance"
                  rows={3}
                  defaultValue={profile?.salesGuidance || ""}
                  placeholder="Internal guidance about how the business should be positioned and what should or should not be promised."
                  className="form-control"
                />
                <span className="small muted">
                  Internal guidance about how the business should be positioned and what should or should not be promised.
                </span>
              </div>

              <div className="hstack" style={{ justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" disabled={profileSaving} className="btn primary">
                  {profileSaving ? "Saving..." : "Save Business Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- TAB 2: SERVICES */}
      {activeTab === "services" && (
        <div className="vstack" style={{ gap: 16 }}>
          <div className="hstack" style={{ justifyContent: "space-between" }}>
            <div>
              <h3 style={{ margin: 0 }}>Business Services</h3>
              <p className="small muted" style={{ margin: 0 }}>
                Manage offerings, deliverables, ideal customer profiles, and pricing guidance.
              </p>
            </div>
            {!editingService && (
              <button
                type="button"
                className="btn primary sm"
                onClick={() => setEditingService("new")}
              >
                + Create Service
              </button>
            )}
          </div>

          {serviceFeedback && (
            <div className={`callout ${serviceFeedback.ok ? "success" : "error"}`}>
              {serviceFeedback.message}
            </div>
          )}

          {/* Service Create / Edit Form */}
          {editingService && (
            <div className="card" style={{ border: "1px solid var(--brand, #3b82f6)" }}>
              <div className="card-head hstack" style={{ justifyContent: "space-between" }}>
                <h3>{editingService === "new" ? "Create New Service" : `Edit Service: ${(editingService as BusinessServiceData).name}`}</h3>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setEditingService(null)}
                >
                  Cancel
                </button>
              </div>
              <div className="card-body">
                <form onSubmit={handleSaveService} className="vstack" style={{ gap: 14 }}>
                  <div className="grid c3">
                    <div className="form-group">
                      <label>Service Name *</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={typeof editingService === "object" ? editingService.name : ""}
                        placeholder="e.g. Custom Website Development"
                        required
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <input
                        type="text"
                        name="category"
                        defaultValue={typeof editingService === "object" ? editingService.category || "" : ""}
                        placeholder="e.g. Web Engineering"
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Priority</label>
                      <input
                        type="number"
                        name="priority"
                        defaultValue={typeof editingService === "object" ? editingService.priority : 0}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="hstack" style={{ gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        name="enabled"
                        defaultChecked={typeof editingService === "object" ? editingService.enabled : true}
                      />
                      <span>Enabled (available to HIMI)</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={typeof editingService === "object" ? editingService.description || "" : ""}
                      placeholder="High-level description of what this service offers..."
                      className="form-control"
                    />
                  </div>

                  <div className="grid c2">
                    <div className="form-group">
                      <label>Deliverables</label>
                      <textarea
                        name="deliverables"
                        rows={3}
                        defaultValue={typeof editingService === "object" ? editingService.deliverables || "" : ""}
                        placeholder="e.g. Custom design, responsive layout, SEO setup, CMS integration..."
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Technologies / Capabilities</label>
                      <textarea
                        name="technologies"
                        rows={3}
                        defaultValue={typeof editingService === "object" ? editingService.technologies || "" : ""}
                        placeholder="e.g. React, Next.js, Node.js, Tailwind CSS..."
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Ideal Customer Profile (ICP)</label>
                    <textarea
                      name="idealCustomer"
                      rows={2}
                      defaultValue={typeof editingService === "object" ? editingService.idealCustomer || "" : ""}
                      placeholder="Describe the customer/profile this service fits best."
                      className="form-control"
                    />
                    <span className="small muted">
                      Describe the customer/profile this service fits best.
                    </span>
                  </div>

                  <div className="grid c2">
                    <div className="form-group">
                      <label>Pricing Guidance</label>
                      <textarea
                        name="pricingGuidance"
                        rows={3}
                        defaultValue={typeof editingService === "object" ? editingService.pricingGuidance || "" : ""}
                        placeholder="Only enter pricing HIMI is allowed to rely on. Leave blank when pricing requires human scoping."
                        className="form-control"
                      />
                      <span className="small muted">
                        Only enter pricing HIMI is allowed to rely on. Leave blank when pricing requires human scoping.
                      </span>
                    </div>
                    <div className="form-group">
                      <label>Timeline Guidance</label>
                      <textarea
                        name="timelineGuidance"
                        rows={3}
                        defaultValue={typeof editingService === "object" ? editingService.timelineGuidance || "" : ""}
                        placeholder="e.g. 3–5 weeks standard delivery..."
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Sales Notes</label>
                    <textarea
                      name="salesNotes"
                      rows={2}
                      defaultValue={typeof editingService === "object" ? editingService.salesNotes || "" : ""}
                      placeholder="Internal selling guidance, differentiators, restrictions, or important context."
                      className="form-control"
                    />
                    <span className="small muted">
                      Internal selling guidance, differentiators, restrictions, or important context.
                    </span>
                  </div>

                  <div className="hstack" style={{ justifyContent: "flex-end", gap: 10 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setEditingService(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={serviceSaving} className="btn primary">
                      {serviceSaving ? "Saving..." : "Save Service"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Services List */}
          {services.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "36px 20px" }}>
              <p className="muted" style={{ marginBottom: 12 }}>
                No services configured yet.
              </p>
              {!editingService && (
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => setEditingService("new")}
                >
                  + Create First Service
                </button>
              )}
            </div>
          ) : (
            <div className="vstack" style={{ gap: 12 }}>
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="card"
                  style={{ opacity: srv.enabled ? 1 : 0.65 }}
                >
                  <div className="card-body">
                    <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                      <div className="hstack" style={{ gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 16 }}>{srv.name}</h4>
                        {srv.category && (
                          <span className="badge blue">{srv.category}</span>
                        )}
                        <span className={`badge ${srv.enabled ? "green" : "gray"}`}>
                          {srv.enabled ? "Enabled" : "Disabled"}
                        </span>
                        <span className="badge gray" style={{ fontSize: 11 }}>
                          Priority: {srv.priority}
                        </span>
                      </div>
                      <div className="hstack" style={{ gap: 8 }}>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => handleToggleService(srv.id, srv.enabled)}
                        >
                          {srv.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="btn sm primary"
                          onClick={() => setEditingService(srv)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {srv.description && (
                      <p className="small" style={{ marginBottom: 8 }}>{srv.description}</p>
                    )}

                    <div className="grid c2" style={{ gap: 12, fontSize: 13, color: "var(--ink-2, #374151)" }}>
                      {srv.deliverables && (
                        <div>
                          <strong>Deliverables:</strong> {srv.deliverables}
                        </div>
                      )}
                      {srv.pricingGuidance && (
                        <div>
                          <strong>Pricing Guidance:</strong> {srv.pricingGuidance}
                        </div>
                      )}
                      {srv.idealCustomer && (
                        <div>
                          <strong>Ideal Customer:</strong> {srv.idealCustomer}
                        </div>
                      )}
                      {srv.technologies && (
                        <div>
                          <strong>Technologies:</strong> {srv.technologies}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- TAB 3: PORTFOLIO */}
      {activeTab === "portfolio" && (
        <div className="vstack" style={{ gap: 16 }}>
          <div className="hstack" style={{ justifyContent: "space-between" }}>
            <div>
              <h3 style={{ margin: 0 }}>Portfolio &amp; Proof</h3>
              <p className="small muted" style={{ margin: 0 }}>
                Manage case studies, project outcomes, and verifiable claims for HIMI reference.
              </p>
            </div>
            {!editingPortfolio && (
              <button
                type="button"
                className="btn primary sm"
                onClick={() => setEditingPortfolio("new")}
              >
                + Create Portfolio Item
              </button>
            )}
          </div>

          {portfolioFeedback && (
            <div className={`callout ${portfolioFeedback.ok ? "success" : "error"}`}>
              {portfolioFeedback.message}
            </div>
          )}

          {/* Portfolio Create / Edit Form */}
          {editingPortfolio && (
            <div className="card" style={{ border: "1px solid var(--brand, #3b82f6)" }}>
              <div className="card-head hstack" style={{ justifyContent: "space-between" }}>
                <h3>{editingPortfolio === "new" ? "Create New Portfolio Item" : `Edit Portfolio Item: ${(editingPortfolio as BusinessPortfolioData).projectName}`}</h3>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setEditingPortfolio(null)}
                >
                  Cancel
                </button>
              </div>
              <div className="card-body">
                <form onSubmit={handleSavePortfolio} className="vstack" style={{ gap: 14 }}>
                  <div className="grid c3">
                    <div className="form-group">
                      <label>Project Name *</label>
                      <input
                        type="text"
                        name="projectName"
                        defaultValue={typeof editingPortfolio === "object" ? editingPortfolio.projectName : ""}
                        placeholder="e.g. NHS Dental Booking Portal"
                        required
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Client Name</label>
                      <input
                        type="text"
                        name="clientName"
                        defaultValue={typeof editingPortfolio === "object" ? editingPortfolio.clientName || "" : ""}
                        placeholder="e.g. Almondbury Dental"
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Industry</label>
                      <input
                        type="text"
                        name="industry"
                        defaultValue={typeof editingPortfolio === "object" ? editingPortfolio.industry || "" : ""}
                        placeholder="e.g. Healthcare / Dental"
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="grid c2">
                    <div className="form-group">
                      <label>Priority</label>
                      <input
                        type="number"
                        name="priority"
                        defaultValue={typeof editingPortfolio === "object" ? editingPortfolio.priority : 0}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group" style={{ display: "flex", alignItems: "flex-end" }}>
                      <label className="hstack" style={{ gap: 8, cursor: "pointer", marginBottom: 8 }}>
                        <input
                          type="checkbox"
                          name="enabled"
                          defaultChecked={typeof editingPortfolio === "object" ? editingPortfolio.enabled : true}
                        />
                        <span>Enabled (available to HIMI)</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={typeof editingPortfolio === "object" ? editingPortfolio.description || "" : ""}
                      placeholder="Brief overview of the project scope and challenge..."
                      className="form-control"
                    />
                  </div>

                  <div className="grid c2">
                    <div className="form-group">
                      <label>Services Provided</label>
                      <textarea
                        name="servicesProvided"
                        rows={2}
                        defaultValue={typeof editingPortfolio === "object" ? editingPortfolio.servicesProvided || "" : ""}
                        placeholder="e.g. UI/UX design, custom web portal development..."
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Technologies Used</label>
                      <textarea
                        name="technologies"
                        rows={2}
                        defaultValue={typeof editingPortfolio === "object" ? editingPortfolio.technologies || "" : ""}
                        placeholder="e.g. Next.js, Node.js, PostgreSQL..."
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Result / Outcome</label>
                    <textarea
                      name="resultOutcome"
                      rows={3}
                      defaultValue={typeof editingPortfolio === "object" ? editingPortfolio.resultOutcome || "" : ""}
                      placeholder="Only enter results or claims that are supportable. Do not invent metrics. Portfolio entries will later provide HIMI with factual proof/case-study material."
                      className="form-control"
                    />
                    <span className="small muted">
                      Only enter results or claims that are supportable. Do not invent metrics. Portfolio entries will later provide HIMI with factual proof/case-study material.
                    </span>
                  </div>

                  <div className="form-group">
                    <label>Project URL</label>
                    <input
                      type="url"
                      name="projectUrl"
                      defaultValue={typeof editingPortfolio === "object" ? editingPortfolio.projectUrl || "" : ""}
                      placeholder="https://example.com/case-study"
                      className="form-control"
                    />
                  </div>

                  <div className="hstack" style={{ justifyContent: "flex-end", gap: 10 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setEditingPortfolio(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={portfolioSaving} className="btn primary">
                      {portfolioSaving ? "Saving..." : "Save Portfolio Item"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Portfolio List */}
          {portfolio.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "36px 20px" }}>
              <p className="muted" style={{ marginBottom: 12 }}>
                No portfolio items configured yet.
              </p>
              {!editingPortfolio && (
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => setEditingPortfolio("new")}
                >
                  + Create First Portfolio Item
                </button>
              )}
            </div>
          ) : (
            <div className="vstack" style={{ gap: 12 }}>
              {portfolio.map((item) => (
                <div
                  key={item.id}
                  className="card"
                  style={{ opacity: item.enabled ? 1 : 0.65 }}
                >
                  <div className="card-body">
                    <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                      <div className="hstack" style={{ gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 16 }}>{item.projectName}</h4>
                        {item.clientName && (
                          <span className="badge blue">{item.clientName}</span>
                        )}
                        {item.industry && (
                          <span className="badge gray">{item.industry}</span>
                        )}
                        <span className={`badge ${item.enabled ? "green" : "gray"}`}>
                          {item.enabled ? "Enabled" : "Disabled"}
                        </span>
                        <span className="badge gray" style={{ fontSize: 11 }}>
                          Priority: {item.priority}
                        </span>
                      </div>
                      <div className="hstack" style={{ gap: 8 }}>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => handleTogglePortfolio(item.id, item.enabled)}
                        >
                          {item.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="btn sm primary"
                          onClick={() => setEditingPortfolio(item)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {item.description && (
                      <p className="small" style={{ marginBottom: 8 }}>{item.description}</p>
                    )}

                    <div className="grid c2" style={{ gap: 12, fontSize: 13, color: "var(--ink-2, #374151)" }}>
                      {item.resultOutcome && (
                        <div>
                          <strong>Result / Outcome:</strong> {item.resultOutcome}
                        </div>
                      )}
                      {item.servicesProvided && (
                        <div>
                          <strong>Services:</strong> {item.servicesProvided}
                        </div>
                      )}
                      {item.technologies && (
                        <div>
                          <strong>Technologies:</strong> {item.technologies}
                        </div>
                      )}
                      {item.projectUrl && (
                        <div>
                          <strong>URL:</strong>{" "}
                          <a
                            href={item.projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "underline" }}
                          >
                            {item.projectUrl}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

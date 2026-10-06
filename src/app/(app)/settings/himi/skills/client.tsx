"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSkill,
  updateSkill,
  toggleSkillEnabled,
  createSkillResource,
  updateSkillResource,
  toggleSkillResourceEnabled,
} from "@/lib/actions/himi-skills";

export type SkillResourceItem = {
  id: string;
  skillId: string;
  title: string;
  content: string;
  enabled: boolean;
  priority: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type SkillItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  instructions: string;
  usageGuidance: string | null;
  category: string;
  enabled: boolean;
  priority: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  resources?: SkillResourceItem[];
};

export function SkillsManager({ initialSkills }: { initialSkills: SkillItem[] }) {
  const router = useRouter();
  const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingResource, setEditingResource] = useState<SkillResourceItem | null>(null);
  const [isCreatingResource, setIsCreatingResource] = useState(false);

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const handleToggle = (id: string, currentEnabled: boolean) => {
    setMsg(null);
    startTransition(async () => {
      const res = await toggleSkillEnabled(id, !currentEnabled);
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) router.refresh();
    });
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      let res;
      if (editingSkill) {
        res = await updateSkill(editingSkill.id, fd);
      } else {
        res = await createSkill(fd);
      }

      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) {
        setEditingSkill(null);
        setIsCreating(false);
        setEditingResource(null);
        setIsCreatingResource(false);
        router.refresh();
      }
    });
  };

  const handleToggleResource = (id: string, currentEnabled: boolean) => {
    setMsg(null);
    startTransition(async () => {
      const res = await toggleSkillResourceEnabled(id, !currentEnabled);
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) router.refresh();
    });
  };

  const handleSaveResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSkill) return;
    setMsg(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      let res;
      if (editingResource) {
        res = await updateSkillResource(editingResource.id, fd);
      } else {
        res = await createSkillResource(editingSkill.id, fd);
      }

      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) {
        setEditingResource(null);
        setIsCreatingResource(false);
        router.refresh();
      }
    });
  };

  return (
    <div>
      {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`} style={{ marginBottom: 16 }}>{msg.text}</div> : null}

      <div className="hstack" style={{ marginBottom: 16, justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 16, margin: 0 }}>Registered HIMI Skills ({initialSkills.length})</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Skills define procedural intelligence and supporting resources for HIMI conversations.
          </p>
        </div>
        {!isCreating && !editingSkill ? (
          <button
            className="btn primary sm"
            onClick={() => {
              setEditingSkill(null);
              setIsCreating(true);
              setEditingResource(null);
              setIsCreatingResource(false);
              setMsg(null);
            }}
          >
            + Create Skill
          </button>
        ) : null}
      </div>

      {/* Form Area for Create / Edit Skill */}
      {(isCreating || editingSkill) ? (
        <div className="card" style={{ marginBottom: 24, borderLeft: "3px solid var(--accent, #3b82f6)" }}>
          <div className="card-head">
            <h3>{editingSkill ? `Edit Skill: ${editingSkill.name}` : "Create New HIMI Skill"}</h3>
            <span className="spacer" />
            <button
              className="btn sm"
              type="button"
              disabled={pending}
              onClick={() => {
                setIsCreating(false);
                setEditingSkill(null);
                setEditingResource(null);
                setIsCreatingResource(false);
                setMsg(null);
              }}
            >
              Cancel
            </button>
          </div>
          <div className="card-body">
            <form key={editingSkill ? editingSkill.id : "create"} onSubmit={handleSave}>
              <div className="grid c2">
                <label className="f">
                  <span>Name *</span>
                  <input
                    name="name"
                    required
                    defaultValue={editingSkill?.name || ""}
                    placeholder="e.g. Cold Outreach Specialist"
                  />
                  <span className="hint">Display name for administrative views.</span>
                </label>

                <label className="f">
                  <span>Slug *</span>
                  <input
                    name="slug"
                    required
                    defaultValue={editingSkill?.slug || ""}
                    placeholder="e.g. cold-outreach"
                  />
                  <span className="hint">Unique identifier used for seeding &amp; lookup.</span>
                </label>

                <label className="f">
                  <span>Category</span>
                  <input
                    name="category"
                    defaultValue={editingSkill?.category || "GENERAL"}
                    placeholder="e.g. SALES, RESEARCH, OPERATIONS"
                  />
                  <span className="hint">Group categorization for skills list.</span>
                </label>

                <label className="f">
                  <span>Priority</span>
                  <input
                    name="priority"
                    type="number"
                    defaultValue={editingSkill?.priority ?? 0}
                    placeholder="0"
                  />
                  <span className="hint">Integer sorting order (lower numbers load first).</span>
                </label>
              </div>

              <div className="grid c1" style={{ marginTop: 12 }}>
                <label className="f">
                  <span>Short Description</span>
                  <input
                    name="description"
                    defaultValue={editingSkill?.description || ""}
                    placeholder="Brief summary of what this skill enables HIMI to do."
                  />
                </label>

                <label className="f">
                  <span>Usage Guidance (When to invoke)</span>
                  <textarea
                    name="usageGuidance"
                    rows={3}
                    defaultValue={editingSkill?.usageGuidance || ""}
                    placeholder="Describes when HIMI should invoke this skill (e.g. 'Use when user asks to rank or prioritize leads')."
                  />
                  <span className="hint">Used in V8.3 for automatic semantic discovery.</span>
                </label>

                <label className="f">
                  <span>Procedural Instructions *</span>
                  <textarea
                    name="instructions"
                    required
                    rows={12}
                    style={{ fontFamily: "monospace", fontSize: 13 }}
                    defaultValue={editingSkill?.instructions || ""}
                    placeholder="Detailed SKILL.md-style instructions and procedural mandates for HIMI."
                  />
                  <span className="hint">Procedural system instructions injected into HIMI prompt when active.</span>
                </label>

                <label
                  style={{
                    display: "inline-flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 12,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    name="enabled"
                    value="true"
                    defaultChecked={editingSkill ? editingSkill.enabled : true}
                    style={{
                      width: 18,
                      height: 18,
                      margin: 0,
                      cursor: "pointer",
                      accentColor: "var(--accent, #3b82f6)",
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Enable skill immediately</span>
                </label>
              </div>

              <div className="hstack" style={{ marginTop: 16, gap: 12 }}>
                <button className="btn primary" type="submit" disabled={pending}>
                  {pending ? "Saving…" : editingSkill ? "Update Skill" : "Create Skill"}
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setIsCreating(false);
                    setEditingSkill(null);
                    setEditingResource(null);
                    setIsCreatingResource(false);
                    setMsg(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Resources Section for Existing Skill */}
            {editingSkill ? (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border-color, #e5e7eb)" }}>
                <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontSize: 15, margin: 0 }}>Supporting Resources ({editingSkill.resources?.length || 0})</h4>
                    <p className="small muted" style={{ margin: 0 }}>
                      Supporting procedural guidance for this skill (max 3,000 characters per resource). Business-specific facts belong in Business Knowledge.
                    </p>
                  </div>
                  {!isCreatingResource && !editingResource ? (
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => {
                        setEditingResource(null);
                        setIsCreatingResource(true);
                      }}
                    >
                      + Add Resource
                    </button>
                  ) : null}
                </div>

                {/* Form for Create / Edit Resource */}
                {(isCreatingResource || editingResource) ? (
                  <div className="card" style={{ marginBottom: 16, backgroundColor: "var(--bg-subtle, #f9fafb)", borderLeft: "3px solid #6366f1" }}>
                    <div className="card-head">
                      <h4 style={{ fontSize: 14, margin: 0 }}>{editingResource ? `Edit Resource: ${editingResource.title}` : "Add New Supporting Resource"}</h4>
                      <span className="spacer" />
                      <button
                        className="btn sm"
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setIsCreatingResource(false);
                          setEditingResource(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="card-body">
                      <form key={editingResource ? editingResource.id : "create-res"} onSubmit={handleSaveResource}>
                        <div className="grid c2">
                          <label className="f">
                            <span>Resource Title *</span>
                            <input
                              name="title"
                              required
                              defaultValue={editingResource?.title || ""}
                              placeholder="e.g. Subject Line Guidelines"
                            />
                          </label>

                          <label className="f">
                            <span>Priority</span>
                            <input
                              name="priority"
                              type="number"
                              defaultValue={editingResource?.priority ?? 0}
                              placeholder="0"
                            />
                            <span className="hint">Lower priority numbers load first.</span>
                          </label>
                        </div>

                        <div className="grid c1" style={{ marginTop: 12 }}>
                          <label className="f">
                            <span>Resource Content (Max 3,000 chars) *</span>
                            <textarea
                              name="content"
                              required
                              rows={6}
                              style={{ fontFamily: "monospace", fontSize: 13 }}
                              defaultValue={editingResource?.content || ""}
                              placeholder="Detailed guidelines, templates, or checklists supporting this skill..."
                            />
                            <span className="hint">
                              Procedural reference guidance. Do NOT include company pricing/portfolio facts (use Business Knowledge).
                            </span>
                          </label>

                          <label
                            style={{
                              display: "inline-flex",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                              marginTop: 8,
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                          >
                            <input
                              type="checkbox"
                              name="enabled"
                              value="true"
                              defaultChecked={editingResource ? editingResource.enabled : true}
                              style={{
                                width: 18,
                                height: 18,
                                margin: 0,
                                cursor: "pointer",
                                accentColor: "var(--accent, #3b82f6)",
                              }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 500 }}>Enable resource immediately</span>
                          </label>
                        </div>

                        <div className="hstack" style={{ marginTop: 16, gap: 12 }}>
                          <button className="btn primary sm" type="submit" disabled={pending}>
                            {pending ? "Saving…" : editingResource ? "Update Resource" : "Create Resource"}
                          </button>
                          <button
                            className="btn sm"
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              setIsCreatingResource(false);
                              setEditingResource(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : null}

                {/* Existing Resources Table */}
                {editingSkill.resources && editingSkill.resources.length > 0 ? (
                  <div className="table-wrap">
                    <table className="t">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Title</th>
                          <th>Priority</th>
                          <th>Content Preview</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingSkill.resources.map((resItem) => (
                          <tr key={resItem.id} style={{ opacity: resItem.enabled ? 1 : 0.65 }}>
                            <td>
                              <button
                                type="button"
                                className={`badge ${resItem.enabled ? "green" : "amber"}`}
                                style={{ cursor: "pointer", border: "none", background: "inherit" }}
                                disabled={pending}
                                onClick={() => handleToggleResource(resItem.id, resItem.enabled)}
                                title="Click to toggle status"
                              >
                                {resItem.enabled ? "Enabled" : "Disabled"}
                              </button>
                            </td>
                            <td style={{ fontWeight: 600 }}>{resItem.title}</td>
                            <td>{resItem.priority}</td>
                            <td style={{ maxWidth: 280 }}>
                              <div className="small muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {resItem.content}
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                className="btn sm"
                                type="button"
                                disabled={pending}
                                onClick={() => {
                                  setIsCreatingResource(false);
                                  setEditingResource(resItem);
                                  setMsg(null);
                                }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="small muted">No supporting resources added yet for this skill.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Skills Table / List */}
      <div className="card">
        <div className="card-head">
          <h3>Configured Skills</h3>
        </div>
        <div className="card-body tight">
          {initialSkills.length === 0 ? (
            <div className="empty">
              <b>No dynamic skills configured</b>
              Create your first HIMI skill or run the project seed script to populate initial defaults.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Name / Slug</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Resources</th>
                    <th>Usage Guidance / Description</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {initialSkills.map((skill) => (
                    <tr key={skill.id} style={{ opacity: skill.enabled ? 1 : 0.65 }}>
                      <td>
                        <button
                          type="button"
                          className={`badge ${skill.enabled ? "green" : "amber"}`}
                          style={{ cursor: "pointer", border: "none", background: "inherit" }}
                          disabled={pending}
                          onClick={() => handleToggle(skill.id, skill.enabled)}
                          title="Click to toggle status"
                        >
                          {skill.enabled ? "Enabled" : "Disabled"}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{skill.name}</div>
                        <code className="small muted" style={{ fontSize: 11 }}>{skill.slug}</code>
                      </td>
                      <td>
                        <span className="badge">{skill.category}</span>
                      </td>
                      <td>{skill.priority}</td>
                      <td>
                        <span className="badge">
                          {skill.resources ? `${skill.resources.length} res` : "0 res"}
                        </span>
                      </td>
                      <td style={{ maxWidth: 300 }}>
                        <div className="small" style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {skill.description || <span className="muted">No description</span>}
                        </div>
                        {skill.usageGuidance ? (
                          <div className="small muted" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            Guidance: {skill.usageGuidance}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn sm"
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setIsCreating(false);
                            setEditingSkill(skill);
                            setEditingResource(null);
                            setIsCreatingResource(false);
                            setMsg(null);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

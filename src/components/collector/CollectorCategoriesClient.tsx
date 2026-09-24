"use client";

import { useState } from "react";

interface CollectorCategoriesProps {
  initialCategories?: any[];
  showHeader?: boolean;
}

export default function CollectorCategoriesClient({
  initialCategories = [],
  showHeader = true,
}: CollectorCategoriesProps) {
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [searchCategory, setSearchCategory] = useState("");

  const [catForm, setCatForm] = useState({
    name: "",
    slug: "",
    description: "",
    priority: "50",
    priorityLabel: "MEDIUM",
    osmTags: '["amenity"="dentist"]',
  });

  const handleCreateCategory = async () => {
    try {
      const res = await fetch("/api/collector/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...catForm,
          priority: parseInt(catForm.priority),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategories([data, ...categories]);
      setShowCategoryForm(false);
      setCatForm({ name: "", slug: "", description: "", priority: "50", priorityLabel: "MEDIUM", osmTags: '["amenity"="dentist"]' });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleCategory = async (id: string) => {
    const res = await fetch(`/api/collector/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    const data = await res.json();
    if (res.ok) setCategories(categories.map((c: any) => (c.id === id ? data : c)));
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category? This removes rotation history for this category.")) return;
    const res = await fetch(`/api/collector/categories/${id}`, { method: "DELETE" });
    if (res.ok) setCategories(categories.filter((c: any) => c.id !== id));
  };

  const filteredCategories = categories.filter((cat: any) => {
    if (!searchCategory.trim()) return true;
    const q = searchCategory.toLowerCase();
    return cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showHeader && (
        <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Lead Categories</h2>
            <p style={{ fontSize: 13, color: "#60697A" }}>Business taxonomy, OSM tag mapping, priority weights, and category run history.</p>
          </div>
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            {showCategoryForm ? "Cancel" : "+ Add Category"}
          </button>
        </div>
      )}

      {showCategoryForm && (
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Create New Business Category</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Name *</label>
              <input
                value={catForm.name}
                onChange={e => setCatForm({ ...catForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                placeholder="Dental Clinics"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Slug (unique) *</label>
              <input
                value={catForm.slug}
                onChange={e => setCatForm({ ...catForm, slug: e.target.value })}
                placeholder="dental"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
          </div>
          <button
            onClick={handleCreateCategory}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}
          >
            Create Category
          </button>
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={searchCategory}
          onChange={e => setSearchCategory(e.target.value)}
          placeholder="Search categories by name or slug..."
          style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
        />
        <span style={{ fontSize: 11, color: "#9299A8" }}>{filteredCategories.length} categories</span>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
              <th style={{ padding: "10px 14px" }}>Category</th>
              <th style={{ padding: "10px 14px" }}>Priority</th>
              <th style={{ padding: "10px 14px" }}>Last Run</th>
              <th style={{ padding: "10px 14px" }}>Status</th>
              <th style={{ padding: "10px 14px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>
                  No categories match your search.
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat: any) => (
                <tr key={cat.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 500, color: "#151927" }}>{cat.name}</div>
                    <div style={{ fontSize: 11, color: "#9299A8", fontFamily: "monospace" }}>{cat.slug}</div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: cat.priorityLabel === "HIGH" ? "#FFF6E3" : "#F0ECFA", color: cat.priorityLabel === "HIGH" ? "#F29B38" : "#49339A", fontSize: 11, fontWeight: 500 }}>
                      {cat.priorityLabel}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", color: "#60697A", fontSize: 12 }}>
                    {cat.lastRunAt ? new Date(cat.lastRunAt).toLocaleString() : "Never"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: cat.enabled ? "#EEF8F4" : "#F0EEEA", color: cat.enabled ? "#4FAE91" : "#9299A8", fontSize: 11, fontWeight: 500 }}>
                      {cat.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleToggleCategory(cat.id)}
                        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}
                      >
                        {cat.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

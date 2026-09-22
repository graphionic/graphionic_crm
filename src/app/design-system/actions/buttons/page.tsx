"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function ButtonsPage() {
  const [loadingDemo, setLoadingDemo] = useState(false);

  const triggerLoading = () => {
    setLoadingDemo(true);
    setTimeout(() => setLoadingDemo(false), 2000);
  };

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>10 / 74 · ACTIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Buttons</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 680 }}>Complete ClientForge button system. Hierarchy Primary → Secondary → Outline → Ghost → Danger → Success → Accent → Link. Poppins 500, 8px radius, compact.</p>
      </div>

      {/* 01 Hierarchy */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 4 }}>01 Hierarchy</h3>
        <p style={{ fontSize: 12, color: "#9299A8", marginBottom: 16 }}>Primary for main action, Secondary/Outline for alternative, Ghost for low priority, Danger/Success semantic, Accent sparingly, Link for inline.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary">Create Lead</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="outline">Import Leads</Button>
          <Button variant="ghost">View More</Button>
          <Button variant="danger">Delete Lead</Button>
          <Button variant="success">Approve</Button>
          <Button variant="accent">Upgrade</Button>
          <Button variant="link">View all leads →</Button>
        </div>
      </div>

      {/* 02 Variants */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>02 Variants — Live</h3>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, fontSize: 12 }}>
          {[
            { v: "primary" as const, label: "Primary", desc: "Royal Indigo #49339A white text — main action", ex: "Create Lead, Save Changes, Start Campaign" },
            { v: "secondary" as const, label: "Secondary", desc: "White, soft border #E5E3DF, dark text", ex: "Cancel, Preview, Export" },
            { v: "outline" as const, label: "Outline", desc: "Transparent, indigo border + text", ex: "Import Leads, Add Filter" },
            { v: "ghost" as const, label: "Ghost", desc: "Transparent no border, low priority", ex: "View More, Reset, Back" },
            { v: "danger" as const, label: "Danger", desc: "Semantic #EC6262 — never for normal", ex: "Delete Lead, Remove User" },
            { v: "success" as const, label: "Success", desc: "Semantic #4FAE91", ex: "Approve, Mark Complete" },
            { v: "accent" as const, label: "Accent", desc: "Warm Amber #F4BE52 dark text — very selective", ex: "Upgrade, Important attention" },
            { v: "link" as const, label: "Text / Link", desc: "No container, indigo text", ex: "View all →, Learn more" },
          ].map((row) => (
            <div key={row.v} style={{ display: "contents" }}>
              <div style={{ padding: "10px 0", borderBottom: "1px solid #FAF9F7" }}>
                <div style={{ fontWeight: 600, color: "#151927" }}>{row.label}</div>
                <div style={{ color: "#9299A8", fontSize: 11, marginTop: 2 }}>{row.desc}</div>
                <div style={{ color: "#60697A", fontSize: 11, marginTop: 2, fontStyle: "italic" }}>{row.ex}</div>
              </div>
              <div style={{ padding: "10px 0", borderBottom: "1px solid #FAF9F7" }}>
                <Button variant={row.v}>{row.label}</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 03 Sizes */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>03 Sizes — XS 30 / SM 34 / MD 40 / LG 46 / XL 52</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Button size="xs">XS 30px</Button>
          <Button size="sm">SM 34px</Button>
          <Button size="md">MD 40px</Button>
          <Button size="lg">LG 46px</Button>
          <Button size="xl">XL 52px</Button>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8", fontFamily: "monospace" }}>XS h30 p10 f12 / SM h34 p14 f13 / MD h40 p18 f14 / LG h46 p22 f14 / XL h52 p26 f15 • radius 8px all • not pill</div>
      </div>

      {/* 04 Icons */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>04 Button + Icon — Leading / Trailing / Both • Gap 8px</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Button leadingIcon={<span>+</span>}>Create Lead</Button>
          <Button trailingIcon={<span>→</span>}>Continue</Button>
          <Button leadingIcon={<span>⇪</span>} trailingIcon={<span>↓</span>}>Import</Button>
          <Button variant="secondary" leadingIcon={<span>◎</span>}>View Details</Button>
          <Button variant="ghost" leadingIcon={<span>↩</span>}>Back</Button>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Icon sizes: XS 14px / SM 16px / MD 18px / LG 18px / XL 20px • Gap standard 8px • Do not decorate every button</div>
      </div>

      {/* 05 States */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>05 States — Default / Hover / Active / Focus / Disabled</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>Primary States</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button>Default</Button>
              <Button style={{ background: "#38247F" }}>Hover #38247F</Button>
              <Button style={{ background: "#2C1D66" }}>Active</Button>
              <Button style={{ boxShadow: "0 0 0 3px #F0ECFA", outline: "1px solid #49339A" }}>Focus ring</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>Secondary / Outline</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="secondary">Secondary</Button>
              <Button variant="secondary" style={{ background: "#FAF9F7" }}>Hover</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="outline" style={{ background: "#F0ECFA" }}>Hover</Button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>Danger / Accent</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="danger">Delete</Button>
              <Button variant="danger" style={{ background: "#D94F4F" }}>Hover</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="accent" style={{ filter: "brightness(0.95)" }}>Hover</Button>
            </div>
          </div>
        </div>
      </div>

      {/* 06 Loading */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>06 Loading — Spinner, no width jump, disable repeat</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Button loading={loadingDemo} onClick={triggerLoading}>Saving...</Button>
          <Button variant="secondary" loading={loadingDemo}>Creating Lead...</Button>
          <Button variant="outline" loading>Sending...</Button>
          <Button variant="primary" size="sm" loading>Importing...</Button>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Click primary to trigger 2s loading demo • Button width should not jump dramatically • Disable repeated submission while loading</div>
      </div>

      {/* 07 Full Width */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>07 Full Width — Login / Modal / Mobile</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#9299A8", marginBottom: 8 }}>Normal width</div>
            <Button>Continue</Button>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9299A8", marginBottom: 8 }}>Full width (360px container)</div>
            <div style={{ maxWidth: 360 }}>
              <Button fullWidth>Continue →</Button>
            </div>
          </div>
        </div>
      </div>

      {/* 08 Usage */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#EEF8F4", border: "1px solid #D5EDE3", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#2F7A63", marginBottom: 10 }}>✓ Do — One obvious primary</h4>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#151927", marginBottom: 12 }}>Lead Details</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="secondary">Cancel</Button>
              <Button>Save Changes</Button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#2F7A63", marginTop: 8 }}>One primary, one secondary — clear hierarchy</div>
        </div>
        <div style={{ background: "#FDECEC", border: "1px solid #FBD5D5", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#B93E3E", marginBottom: 10 }}>✗ Don't — Three competing primaries</h4>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#151927", marginBottom: 12 }}>Lead Details</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button>Save</Button>
              <Button>Delete</Button>
              <Button>Archive</Button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#B93E3E", marginTop: 8 }}>Three primary buttons competing inside one card — confusing</div>
        </div>
      </div>

      {/* 09 Accessibility + 10 Anatomy */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>09 Accessibility</h4>
          <div style={{ display: "grid", gap: 8, fontSize: 12, color: "#60697A" }}>
            <div>• Keyboard: Tab focus, Enter/Space activate, visible focus ring</div>
            <div>• Focus: Clear ring #F0ECFA + border #49339A, not color only</div>
            <div>• Loading: aria-busy, disable repeat, announce</div>
            <div>• Disabled: aria-disabled, 0.6 opacity but readable</div>
            <div>• Contrast: Primary #49339A white AAA, Accent #F4BE52 #151927 AA</div>
            <div>• Reduced motion: respect prefers-reduced-motion</div>
          </div>
        </div>
        <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>10 Anatomy</h4>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 20, textAlign: "center", position: "relative" }}>
            <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", fontSize: 9, background: "#151927", color: "white", padding: "2px 6px", borderRadius: 4 }}>height 40px MD</div>
            <Button> <span style={{ width: 18, height: 18, background: "#F0ECFA", borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#49339A" }}>+</span> Create Lead</Button>
            <div style={{ marginTop: 10, fontSize: 10, color: "#9299A8" }}>← 18px padding → • gap 8px • radius 8px • icon 18px • label 14px/500 • focus ring 3px #F0ECFA</div>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#9299A8" }}>Height</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>30/34/40/46/52</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#9299A8" }}>Padding</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>10/14/18/22/26</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#9299A8" }}>Radius</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>8px (md)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#9299A8" }}>Icon gap</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>8px (token 2)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

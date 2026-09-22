"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonGroup, SegmentedControl } from "@/components/ui/ButtonGroup";

export default function ButtonGroupsPage() {
  const [view, setView] = useState("list");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("7D");

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>11 / 74 · ACTIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Button Groups</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 680 }}>Reusable ButtonGroup and Segmented Control — one control visually, not separate heavy buttons. Poppins, indigo active, compact.</p>
      </div>

      <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Standard Group — Day / Week / Month</h3>
          <ButtonGroup>
            <Button variant="secondary" size="sm">Day</Button>
            <Button variant="primary" size="sm">Week</Button>
            <Button variant="secondary" size="sm">Month</Button>
          </ButtonGroup>
          <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Gap 6px, each button 8px radius, secondary + primary active</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Segmented Control — Polished (Important)</h3>
          <div style={{ display: "grid", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>View: List | Grid</div>
              <SegmentedControl
                value={view}
                onChange={setView}
                options={[
                  { label: "List", value: "list" },
                  { label: "Grid", value: "grid" },
                ]}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>Lead Status: All | New | Contacted | Qualified</div>
              <SegmentedControl
                value={status}
                onChange={setStatus}
                options={[
                  { label: "All", value: "all" },
                  { label: "New", value: "new" },
                  { label: "Contacted", value: "contacted" },
                  { label: "Qualified", value: "qualified" },
                ]}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>Date: Day | Week | Month (with icons)</div>
              <SegmentedControl
                value={period}
                onChange={setPeriod}
                options={[
                  { label: "7D", value: "7D" },
                  { label: "30D", value: "30D" },
                  { label: "90D", value: "90D" },
                  { label: "1Y", value: "1Y" },
                ]}
              />
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Active: white bg + shadow + indigo text #49339A, not heavy button. Group reads as ONE control. Background #FAF9F7 border #E5E3DF padding 3px gap 3px</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Toolbar Group — Undo / Redo / Copy + Sizes SM/MD/LG</h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, color: "#9299A8", marginBottom: 4 }}>SM</div>
              <ButtonGroup size="sm">
                <Button variant="secondary" size="sm">Undo</Button>
                <Button variant="secondary" size="sm">Redo</Button>
                <Button variant="secondary" size="sm">Copy</Button>
              </ButtonGroup>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9299A8", marginBottom: 4 }}>MD</div>
              <ButtonGroup size="md">
                <Button variant="secondary" size="sm">Undo</Button>
                <Button variant="secondary" size="sm">Redo</Button>
                <Button variant="secondary" size="sm">Copy</Button>
              </ButtonGroup>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9299A8", marginBottom: 4 }}>LG</div>
              <ButtonGroup size="lg">
                <Button variant="secondary" size="sm">Undo</Button>
                <Button variant="secondary" size="sm">Redo</Button>
                <Button variant="secondary" size="sm">Copy</Button>
              </ButtonGroup>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 10 }}>Full Width Mobile</h4>
            <div style={{ maxWidth: 320 }}>
              <SegmentedControl fullWidth value={view} onChange={setView} options={[{ label: "Table", value: "list" }, { label: "Kanban", value: "grid" }]} />
            </div>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>Mobile full-width, flex 1 each, responsive wrapping</div>
          </div>
          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 10 }}>Keyboard & Accessibility</h4>
            <div style={{ fontSize: 12, color: "#60697A", lineHeight: 1.6 }}>
              <div>• Arrow keys navigate segmented controls</div>
              <div>• Role tablist / tab, aria-selected</div>
              <div>• Focus ring visible</div>
              <div>• Single selection default, multiple where appropriate</div>
              <div>• Disabled option with opacity 0.5 + not-allowed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

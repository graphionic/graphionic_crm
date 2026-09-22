"use client";
import { useState } from "react";

export default function MotionPage() {
  const [demo, setDemo] = useState(0);

  const durations = [
    { name: "Instant", value: "75ms", token: "duration-instant", usage: "Checkbox, toggle, instant feedback" },
    { name: "Fast", value: "120ms", token: "duration-fast", usage: "Button hover, icon, micro interactions" },
    { name: "Normal", value: "180ms", token: "duration-normal", usage: "Input focus, dropdown open (default)" },
    { name: "Moderate", value: "240ms", token: "duration-moderate", usage: "Popover, tooltip, accordion" },
    { name: "Slow", value: "320ms", token: "duration-slow", usage: "Modal, drawer, sidebar collapse" },
  ];

  const easings = [
    { name: "standard", value: "cubic-bezier(0.2, 0, 0, 1)", usage: "Most UI, default" },
    { name: "enter", value: "cubic-bezier(0, 0, 0, 1)", usage: "Enter, fade in, scale in" },
    { name: "exit", value: "cubic-bezier(0.3, 0, 1, 1)", usage: "Exit, fade out" },
    { name: "emphasis", value: "cubic-bezier(0.2, 0, 0, 1.2)", usage: "Emphasis, slight overshoot" },
  ];

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>08 / 74 · FOUNDATIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Motion</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Restrained enterprise motion. Responsive, not decorative. Communicate state, hierarchy, navigation, feedback. No bouncing, no excessive springs.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Durations</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {durations.map((d) => (
            <div key={d.name} style={{ display: "grid", gridTemplateColumns: "100px 80px 140px 1fr", gap: 16, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #FAF9F7" }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#151927" }}>{d.name}</span>
              <span style={{ fontSize: 12, fontFamily: "monospace", color: "#49339A", fontWeight: 500 }}>{d.value}</span>
              <span style={{ fontSize: 11, color: "#9299A8", fontFamily: "monospace" }}>{d.token}</span>
              <span style={{ fontSize: 12, color: "#60697A" }}>{d.usage}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Easing</h4>
          <div style={{ display: "grid", gap: 10 }}>
            {easings.map((e) => (
              <div key={e.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #FAF9F7", fontSize: 12 }}>
                <span style={{ fontWeight: 500, color: "#151927" }}>{e.name}</span>
                <span style={{ color: "#9299A8", fontFamily: "monospace", fontSize: 10 }}>{e.value}</span>
                <span style={{ color: "#60697A" }}>{e.usage}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Interactive Examples</h4>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setDemo(demo + 1)}
                style={{ background: "#49339A", color: "white", border: "none", padding: "0 16px", height: 42, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: "Poppins", transition: "all 180ms cubic-bezier(0.2,0,0,1)", transform: demo % 2 === 1 ? "scale(0.98)" : "scale(1)" }}
              >
                Button hover — 120ms
              </button>
              <span style={{ fontSize: 11, color: "#9299A8" }}>Hover: 120ms standard</span>
            </div>
            <div style={{ border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: "#9299A8", marginBottom: 6 }}>Input focus — 180ms</div>
              <input placeholder="Focus me" style={{ width: "100%", height: 42, border: "1px solid #E5E3DF", borderRadius: 8, padding: "0 12px", transition: "all 180ms cubic-bezier(0.2,0,0,1)", fontFamily: "Poppins" }} />
            </div>
            <div style={{ border: "1px solid #E5E3DF", borderRadius: 8, padding: 12, overflow: "hidden" }}>
              <div style={{ fontSize: 11, color: "#9299A8", marginBottom: 6 }}>Dropdown open — 180ms enter</div>
              <div style={{ background: "#FAF9F7", borderRadius: 6, padding: 8, height: 60, position: "relative" }}>
                <div style={{ position: "absolute", top: 8, left: 8, right: 8, background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 8, boxShadow: "0 4px 8px rgba(21,25,39,0.08)", transition: "all 180ms cubic-bezier(0,0,0,1)", transform: demo % 2 === 0 ? "translateY(0) scale(1)" : "translateY(-4px) scale(0.98)", opacity: demo % 2 === 0 ? 1 : 0.9 }}>
                  <div style={{ fontSize: 12 }}>Dropdown content</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Motion for Components</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, fontSize: 12 }}>
          {[
            { comp: "Button hover", duration: "120ms fast", easing: "standard", props: "background, transform" },
            { comp: "Input focus", duration: "180ms normal", easing: "standard", props: "border, box-shadow" },
            { comp: "Dropdown open", duration: "180ms normal", easing: "enter", props: "opacity, transform" },
            { comp: "Tooltip", duration: "120ms fast", easing: "enter", props: "opacity" },
            { comp: "Popover", duration: "240ms moderate", easing: "enter", props: "opacity, transform" },
            { comp: "Modal", duration: "320ms slow", easing: "enter", props: "opacity, transform" },
            { comp: "Drawer", duration: "320ms slow", easing: "standard", props: "transform" },
            { comp: "Sidebar collapse", duration: "240ms moderate", easing: "standard", props: "width, transform" },
            { comp: "Accordion", duration: "240ms moderate", easing: "standard", props: "height" },
            { comp: "Toast", duration: "240ms moderate", easing: "enter", props: "transform, opacity" },
            { comp: "Table row actions", duration: "120ms fast", easing: "standard", props: "opacity" },
            { comp: "Skeleton", duration: "1200ms", easing: "standard", props: "opacity pulse" },
          ].map((m) => (
            <div key={m.comp} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #FAF9F7" }}>
              <span style={{ fontWeight: 500, color: "#151927" }}>{m.comp}</span>
              <span style={{ color: "#60697A" }}>{m.duration} · {m.easing}</span>
              <span style={{ color: "#9299A8", fontFamily: "monospace", fontSize: 10 }}>{m.props}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#FFF6E3", border: "1px solid #FFEDC2", borderRadius: 10, padding: 16, fontSize: 12, color: "#60697A" }}>
        <strong style={{ color: "#151927" }}>Rule:</strong> No bouncing UI, no unnecessary floating animation, no excessive spring effects, no large decorative motion. Animations must communicate state, hierarchy, navigation, feedback. Respect prefers-reduced-motion.
      </div>
    </div>
  );
}

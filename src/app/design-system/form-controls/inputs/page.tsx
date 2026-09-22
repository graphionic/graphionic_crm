"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription, FieldError, FieldSuccess } from "@/components/ui/FormField";
import { Input, CharacterCounter } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

export default function InputsPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [search, setSearch] = useState("");

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>14 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Text Inputs</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 680 }}>Clean, compact, professional, fast, predictable, accessible. Persistent labels above fields, 4px base, Poppins, Royal Indigo focus, 8px radius.</p>
      </div>

      {/* Anatomy */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Standard Field Anatomy</h3>
        <div style={{ maxWidth: 400 }}>
          <FormField>
            <FieldLabel required>Email address</FieldLabel>
            <Input placeholder="john@acme.com" defaultValue="john@acme.com" />
            <FieldDescription>Used for campaign communication.</FieldDescription>
          </FormField>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Label 13px/500 • Required * danger subtle • Input MD 42px • Helper 12px • Gap label→input 8px • Field gap 20px</div>
      </div>

      {/* Sizes */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Sizes — SM 36px/13px • MD 42px/14px (default) • LG 48px/15px • Radius 8px</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 700 }}>
          <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 6 }}>SM 36px</div><Input size="sm" placeholder="Small input" /></div>
          <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 6 }}>MD 42px — DEFAULT</div><Input size="md" placeholder="Default input" /></div>
          <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 6 }}>LG 48px</div><Input size="lg" placeholder="Large input" /></div>
        </div>
      </div>

      {/* States */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>States — Default / Hover / Focus / Filled / Success / Warning / Error / Disabled / ReadOnly</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 800 }}>
          <FormField><FieldLabel>Default</FieldLabel><Input placeholder="Placeholder" /></FormField>
          <FormField><FieldLabel>Focus — Indigo #49339A + #F0ECFA ring</FieldLabel><Input placeholder="Focused" autoFocus style={{ borderColor: "#49339A", boxShadow: "0 0 0 3px #F0ECFA" }} /></FormField>
          <FormField><FieldLabel>Filled</FieldLabel><Input defaultValue="Glow Dentistry" /></FormField>
          <FormField><FieldLabel>Success</FieldLabel><Input state="success" defaultValue="john@acme.com" /><FieldSuccess>Valid email</FieldSuccess></FormField>
          <FormField><FieldLabel>Warning</FieldLabel><Input state="warning" defaultValue="john@ac" /><FieldDescription>Did you mean john@acme.com?</FieldDescription></FormField>
          <FormField><FieldLabel>Error</FieldLabel><Input state="error" defaultValue="invalid@" /><FieldError>Enter a valid email address.</FieldError></FormField>
          <FormField><FieldLabel>Disabled</FieldLabel><Input disabled placeholder="Disabled" /></FormField>
          <FormField><FieldLabel>Read Only — distinct from disabled</FieldLabel><Input readOnly defaultValue="Read-only, can select & copy" /></FormField>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Default white + #E5E3DF border, Hover slightly stronger neutral, Focus indigo border + subtle ring (not electric blue), Success green #4FAE91, Warning orange #F29B38, Error coral #EC6262, Disabled readable, ReadOnly selectable</div>
      </div>

      {/* Label System */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Label System — Required * vs Optional (Optional)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, maxWidth: 700 }}>
          <FormField><FieldLabel required>Company Name</FieldLabel><Input placeholder="Acme Inc" /></FormField>
          <FormField><FieldLabel optional>Website</FieldLabel><Input placeholder="https://acme.com" /></FormField>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Label 13px/500 • Required * uses danger subtle #EC6262 • Optional (Optional) not asterisk • Consistent placement above field</div>
      </div>

      {/* Helper + Validation */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Helper Text</h4>
          <FormField>
            <FieldLabel>Company website</FieldLabel>
            <Input prefix="https://" placeholder="acme.com" />
            <FieldDescription>Include https:// when available.</FieldDescription>
          </FormField>
        </div>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Validation Message — Icon + Text + Color</h4>
          <FormField>
            <FieldLabel required>Email address</FieldLabel>
            <Input state="error" defaultValue="invalid-email" />
            <FieldError>Enter a valid email address.</FieldError>
          </FormField>
          <div style={{ marginTop: 10, fontSize: 11, color: "#9299A8" }}>Directly beneath field, not only border color, icon + text + color</div>
        </div>
      </div>

      {/* Leading Icon, Trailing Action, Prefix/Suffix */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Leading Icon / Trailing Action / Prefix / Suffix</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, maxWidth: 800 }}>
          <FormField>
            <FieldLabel>Search</FieldLabel>
            <Input leadingIcon={<span>⌕</span>} placeholder="Search leads..." />
          </FormField>
          <FormField>
            <FieldLabel>Email</FieldLabel>
            <Input leadingIcon={<span>✉</span>} placeholder="Email address" />
          </FormField>
          <FormField>
            <FieldLabel>Password</FieldLabel>
            <Input type={showPassword ? "text" : "password"} defaultValue="password123" trailingAction={<IconButton size="xs" variant="ghost" icon={<span>{showPassword ? "🙈" : "👁"}</span>} label={showPassword ? "Hide" : "Show"} onClick={() => setShowPassword(!showPassword)} />} />
          </FormField>
          <FormField>
            <FieldLabel>Search with clear</FieldLabel>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads" trailingAction={search ? <IconButton size="xs" variant="ghost" icon={<span>×</span>} label="Clear" onClick={() => setSearch("")} /> : undefined} />
          </FormField>
          <FormField>
            <FieldLabel>URL — Prefix / Suffix belong to field</FieldLabel>
            <Input prefix="https://" suffix=".com" placeholder="company" />
          </FormField>
          <FormField>
            <FieldLabel>Currency — configurable symbol</FieldLabel>
            <Input prefix="₹" placeholder="50,000" />
          </FormField>
          <FormField>
            <FieldLabel>Percentage</FieldLabel>
            <Input suffix="%" placeholder="24.8" />
          </FormField>
          <FormField>
            <FieldLabel>Domain</FieldLabel>
            <Input prefix="company" suffix=".com" placeholder="" />
          </FormField>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Professional line icons, NO emojis, prefix/suffix visually belong to field #FAF9F7 bg, trailing actions reuse IconButton</div>
      </div>

      {/* Phone, Password, Search, Number, Currency, OTP */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Phone Input — Country selector + code</h4>
          <FormField>
            <FieldLabel>Phone</FieldLabel>
            <Input prefix={<span>IN ▾ | +91</span>} placeholder="98765 43210" />
          </FormField>
          <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>Visual structure only — searchable country selection will use Select system later</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Password — Show/Hide + Requirements</h4>
          <FormField>
            <FieldLabel>Password</FieldLabel>
            <Input type={showPassword ? "text" : "password"} defaultValue="Password123" trailingAction={<IconButton size="xs" variant="ghost" icon={<span>{showPassword ? "🙈" : "👁"}</span>} label="Toggle" onClick={() => setShowPassword(!showPassword)} />} />
            <div style={{ fontSize: 11, color: "#60697A", marginTop: 8, lineHeight: 1.6 }}>
              <div>✓ 8+ characters</div><div>✓ one number</div><div style={{ color: "#9299A8" }}>○ one uppercase</div>
            </div>
          </FormField>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Search Input — Critical for CRM</h4>
          <div style={{ display: "grid", gap: 10 }}>
            <Input leadingIcon={<span>⌕</span>} placeholder="Search..." />
            <Input leadingIcon={<span>⌕</span>} placeholder="Search leads, companies or emails..." />
            <Input leadingIcon={<span>⌕</span>} placeholder="Search ClientForge..." suffix="⌘K" />
          </div>
          <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>States: empty, typing, results, no results, loading — overlay later</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Number / Currency / Stepper</h4>
          <div style={{ display: "grid", gap: 12 }}>
            <FormField>
              <FieldLabel>Employees — Stepper reuses Button</FieldLabel>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Button size="sm" variant="secondary">−</Button>
                <Input size="sm" style={{ width: 80, textAlign: "center" }} defaultValue="25" />
                <Button size="sm" variant="secondary">+</Button>
              </div>
            </FormField>
            <FormField>
              <FieldLabel>Estimated Deal Value — configurable</FieldLabel>
              <Input prefix="₹" defaultValue="50,000" />
            </FormField>
          </div>
        </div>
      </div>

      {/* OTP */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>OTP / PIN — Segmented code input 4/6 digit, paste support</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {otp.map((v, i) => (
            <input
              key={i}
              value={v}
              onChange={(e) => {
                const newOtp = [...otp];
                newOtp[i] = e.target.value.slice(-1);
                setOtp(newOtp);
                if (e.target.value && i < 5) {
                  const next = document.getElementById(`otp-${i + 1}`) as HTMLInputElement;
                  next?.focus();
                }
              }}
              id={`otp-${i}`}
              style={{ width: 44, height: 44, textAlign: "center", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 16, fontWeight: 500, fontFamily: "Poppins" }}
              maxLength={1}
            />
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>States: empty, filled, focus #49339A + #F0ECFA ring, error #EC6262, disabled • Allow paste behavior</div>
      </div>

      {/* Input Group */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Input Group — Grouped controls, do not overuse</h3>
        <div style={{ display: "grid", gap: 16, maxWidth: 600 }}>
          <div>
            <FieldLabel>Website — https:// | acme.com | .com</FieldLabel>
            <div style={{ display: "flex", marginTop: 6 }}>
              <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRight: "none", padding: "0 12px", height: 42, display: "flex", alignItems: "center", borderRadius: "8px 0 0 8px", fontSize: 13, color: "#60697A" }}>https://</div>
              <input placeholder="acme" style={{ flex: 1, height: 42, border: "1px solid #E5E3DF", borderRight: "none", padding: "0 12px", fontSize: 14, fontFamily: "Poppins" }} />
              <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", padding: "0 12px", height: 42, display: "flex", alignItems: "center", borderRadius: "0 8px 8px 0", fontSize: 13, color: "#60697A" }}>.com</div>
            </div>
          </div>
          <div>
            <FieldLabel>Search — [ Search leads... ][ Search ]</FieldLabel>
            <div style={{ display: "flex", marginTop: 6 }}>
              <input placeholder="Search leads..." style={{ flex: 1, height: 42, border: "1px solid #E5E3DF", borderRight: "none", borderRadius: "8px 0 0 8px", padding: "0 12px", fontSize: 14, fontFamily: "Poppins" }} />
              <Button style={{ borderRadius: "0 8px 8px 0" }}>Search</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

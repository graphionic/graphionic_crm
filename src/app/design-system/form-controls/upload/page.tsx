"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription, FieldError } from "@/components/ui/FormField";
import { DropZone, FileItem, AvatarUpload, ImageUpload } from "@/components/ui/FileUpload";

export default function FileUploadPage() {
  const [files, setFiles] = useState<{ name: string; size: string; progress: number; status: "uploading" | "success" | "error" }[]>([
    { name: "proposal.pdf", size: "2.4 MB", progress: 100, status: "success" },
    { name: "pricing.xlsx", size: "1.2 MB", progress: 72, status: "uploading" },
    { name: "company-logo.png", size: "0.8 MB", progress: 0, status: "error" },
  ]);

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>24 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>File Upload</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Complete upload system. Single, multiple, drag & drop, image, avatar, document, CSV import. Professional, not giant illustrations.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Standard File Input — improved ClientForge language</h4>
          <FormField>
            <FieldLabel>Attachment</FieldLabel>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E3DF", background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>Choose File</button>
              <span style={{ fontSize: 12, color: "#9299A8" }}>No file selected</span>
            </div>
          </FormField>

          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Drag & Drop — DropZone</h4>
            <DropZone label="Upload leads" description="Drag & drop your CSV file here" accept=".csv" maxSize="10 MB" />
          </div>

          <div style={{ marginTop: 16, background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#151927", marginBottom: 6 }}>DropZone States</div>
            <div style={{ fontSize: 11, color: "#60697A", lineHeight: 1.6 }}>Default / Hover / Dragging Over (indigo dashed + #F0ECFA bg) / Uploading / Success / Error / Disabled</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>File Item — After selection</h4>
            <div style={{ display: "grid", gap: 8 }}>
              <FileItem name="leads-september.csv" size="2.4 MB" progress={68} status="uploading" />
              <div style={{ fontSize: 11, color: "#9299A8", marginTop: 4 }}>Progress: ████████ 68% Actions: Cancel</div>
              <FileItem name="leads-september.csv" size="2.4 MB" status="success" onRemove={() => {}} />
              <div style={{ fontSize: 11, color: "#9299A8" }}>✓ Uploaded Actions: Remove Replace</div>
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Multiple Files — Upload Queue</h4>
            <div style={{ display: "grid", gap: 8 }}>
              {files.map((f, i) => (
                <FileItem key={i} name={f.name} size={f.size} progress={f.progress} status={f.status} onRemove={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} onRetry={() => setFiles(prev => prev.map((file, idx) => idx === i ? { ...file, status: "uploading" as const, progress: 20 } : file))} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>Actions: Retry Remove — per-file progress, not blocking entire page</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Image Upload — preview / replace / remove</h4>
          <ImageUpload />
          <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>Do not build full media manager yet</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Avatar Upload — Profile Photo</h4>
          <AvatarUpload />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>CSV Import — Important for ClientForge</h4>
          <div style={{ border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, background: "#FAF9F7", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8 }}>IMPORT LEADS — Step 1 Upload CSV</div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "white", border: "1px solid #E5E3DF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 18, color: "#49339A" }}>↑</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#151927", marginBottom: 4 }}>Drop leads.csv</div>
            <div style={{ fontSize: 11, color: "#9299A8" }}>Supported: CSV Maximum: 10 MB</div>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <FileItem name="leads.csv" size="1.8 MB" status="success" />
            <button style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>Continue to Column Mapping →</button>
            <div style={{ fontSize: 11, color: "#9299A8" }}>Do NOT build complete Import Wizard yet — only demonstrate upload component and transition point</div>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>File Validation — Wrong type / Too large / Failed / Network / Duplicate</h4>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", border: "1px solid #FBD5D5", borderRadius: 8, background: "#FDECEC" }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>📄</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>company.exe</div><div style={{ fontSize: 11, color: "#B93E3E" }}>! This file type is not supported.</div></div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", border: "1px solid #FBD5D5", borderRadius: 8, background: "#FDECEC" }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>📄</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>huge-file.csv</div><div style={{ fontSize: 11, color: "#B93E3E" }}>! File too large. Max 10 MB.</div></div>
            </div>
            <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>DO: Show progress and actionable errors. DON'T: Display only "Upload failed".</div>
          </div>
        </div>
      </div>
    </div>
  );
}

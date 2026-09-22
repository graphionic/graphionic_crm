"use client";
import React, { useState, useRef } from "react";

interface FileItemProps {
  name: string;
  size: string;
  progress?: number;
  status?: "uploading" | "success" | "error";
  error?: string;
  onRemove?: () => void;
  onRetry?: () => void;
}

export function FileItem({ name, size, progress = 100, status = "success", error, onRemove, onRetry }: FileItemProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid #E5E3DF", borderRadius: 8, background: "white" }}>
      <div style={{ width: 36, height: 36, borderRadius: 6, background: "#F0ECFA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#49339A" }}>📄</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#151927", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Poppins', sans-serif" }}>{name}</div>
        <div style={{ fontSize: 11, color: "#9299A8", display: "flex", gap: 8, alignItems: "center" }}>
          <span>{size}</span>
          {status === "uploading" && <span>{progress}%</span>}
          {status === "success" && <span style={{ color: "#4FAE91" }}>✓ Uploaded</span>}
          {status === "error" && <span style={{ color: "#EC6262" }}>{error || "Failed"}</span>}
        </div>
        {status === "uploading" && (
          <div style={{ height: 4, background: "#F0EEEA", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "#49339A", transition: "width 0.3s" }} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {status === "error" && onRetry && <button onClick={onRetry} style={{ fontSize: 11, color: "#49339A", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>Retry</button>}
        {onRemove && <button onClick={onRemove} style={{ fontSize: 11, color: "#60697A", background: "none", border: "none", cursor: "pointer" }}>Remove</button>}
      </div>
    </div>
  );
}

interface DropZoneProps {
  accept?: string;
  maxSize?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  label?: string;
  description?: string;
  style?: React.CSSProperties;
}

export function DropZone({ accept = ".csv", maxSize = "10 MB", multiple, onFiles, label = "Upload leads", description = "Drag & drop your CSV file here", style }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<{ name: string; size: string; progress: number; status: "uploading" | "success" | "error"; error?: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    handleFiles(dropped);
  };

  const handleFiles = (fileList: File[]) => {
    const mapped = fileList.map(f => ({ name: f.name, size: `${(f.size / 1024 / 1024).toFixed(1)} MB`, progress: 0, status: "uploading" as const }));
    setFiles(prev => [...prev, ...mapped]);
    // simulate upload
    mapped.forEach((_, idx) => {
      let prog = 0;
      const interval = setInterval(() => {
        prog += 20;
        if (prog >= 100) {
          prog = 100;
          clearInterval(interval);
          setFiles(prev => prev.map((file, i) => (i === files.length + idx ? { ...file, progress: 100, status: "success" as const } : file)));
        } else {
          setFiles(prev => prev.map((file, i) => (i === files.length + idx ? { ...file, progress: prog } : file)));
        }
      }, 200);
    });
    onFiles?.(fileList);
  };

  return (
    <div style={{ display: "grid", gap: 12, ...style }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1px dashed ${dragOver ? "#49339A" : "#E5E3DF"}`,
          borderRadius: 12,
          padding: "24px 20px",
          background: dragOver ? "#F0ECFA" : "#FAF9F7",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 8, background: "white", border: "1px solid #E5E3DF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 18, color: "#49339A" }}>↑</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#151927", fontFamily: "'Poppins', sans-serif", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: "#60697A", marginBottom: 8 }}>{description}</div>
        <div style={{ fontSize: 11, color: "#9299A8" }}>or <span style={{ color: "#49339A", fontWeight: 500 }}>Browse files</span></div>
        <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>{accept.toUpperCase()} up to {maxSize}</div>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} style={{ display: "none" }} onChange={(e) => { if (e.target.files) handleFiles(Array.from(e.target.files)); }} />
      </div>

      {files.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {files.map((f, idx) => (
            <FileItem key={idx} name={f.name} size={f.size} progress={f.progress} status={f.status} onRemove={() => setFiles(prev => prev.filter((_, i) => i !== idx))} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AvatarUpload({ size = 80 }: { size?: number }) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: preview ? `url(${preview}) center/cover` : "#F0ECFA", border: "1px solid #E5E3DF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#49339A", overflow: "hidden" }}>{!preview && "👤"}</div>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => inputRef.current?.click()} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>Change Photo</button>
          {preview && <button onClick={() => setPreview(null)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "none", fontSize: 12, color: "#60697A", cursor: "pointer" }}>Remove</button>}
        </div>
        <div style={{ fontSize: 11, color: "#9299A8" }}>JPG, PNG up to 2MB. Recommended 400×400px.</div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { const url = URL.createObjectURL(f); setPreview(url); } }} />
    </div>
  );
}

export function ImageUpload() {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {preview ? (
        <div style={{ position: "relative", border: "1px solid #E5E3DF", borderRadius: 10, overflow: "hidden", height: 180, background: `url(${preview}) center/cover` }}>
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
            <button onClick={() => inputRef.current?.click()} style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "white", fontSize: 11, fontWeight: 500, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>Replace</button>
            <button onClick={() => setPreview(null)} style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "#151927", color: "white", fontSize: 11, cursor: "pointer" }}>Remove</button>
          </div>
        </div>
      ) : (
        <div onClick={() => inputRef.current?.click()} style={{ border: "1px dashed #E5E3DF", borderRadius: 10, height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", background: "#FAF9F7" }}>
          <div style={{ fontSize: 20, color: "#9299A8" }}>🖼️</div>
          <div style={{ fontSize: 12, color: "#60697A" }}>Click to upload image</div>
          <div style={{ fontSize: 11, color: "#9299A8" }}>PNG, JPG up to 5MB</div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
    </div>
  );
}

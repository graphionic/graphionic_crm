import Link from "next/link";

export default function NotFound() {
  return (
    <div className="login-wrap">
      <div className="login-card" style={{ textAlign: "center" }}>
        <div className="logo">ClientForge</div>
        <h1>404</h1>
        <p className="sub">That page doesn&apos;t exist — or the lead was deleted.</p>
        <Link className="btn primary block" href="/dashboard">Back to dashboard</Link>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError || "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
        next: next || "/dashboard",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || "Sign in failed.");
      setPending(false);
      return;
    }
    window.location.href = data?.redirect || "/dashboard";
  }

  return (
    <form onSubmit={onSubmit}>
      {error ? <div className="toast err">{error}</div> : null}
      <label className="f">
        <span>Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          placeholder="you@yourdomain.com"
        />
      </label>
      <label className="f">
        <span>Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••••"
        />
      </label>
      <button className="btn primary block" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="small muted" style={{ marginTop: 16, marginBottom: 0 }}>
        Accounts are created by the seed script. There is no public sign-up.
      </p>
    </form>
  );
}

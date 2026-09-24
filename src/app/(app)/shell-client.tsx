"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function NavLink({
  href,
  icon,
  label,
  badge,
  tone,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  tone?: string;
}) {
  const pathname = usePathname();
  const exactOnly = href === "/dashboard" || href === "/collection" || href === "/settings";
  const active = exactOnly
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link href={href} className={active ? "active" : ""}>
      <span className="ico">{icon}</span>
      <span>{label}</span>
      {badge !== undefined && badge > 0 ? (
        <span
          className="badge"
          style={{
            marginLeft: "auto",
            background: tone === "amber" ? "var(--amber)" : "rgba(255,255,255,.16)",
            color: "#fff",
            borderColor: "transparent",
            fontSize: 11,
            padding: "1px 7px",
          }}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn sm block"
      style={{ background: "transparent", color: "#c7d2e8", borderColor: "rgba(255,255,255,.14)" }}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

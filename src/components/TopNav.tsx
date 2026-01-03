"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearApiKey } from "@/lib/auth";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: active ? "black" : "#444",
        fontWeight: active ? 650 : 450,
      }}
    >
      {label}
    </Link>
  );
}

export default function TopNav() {
  return (
    <header style={{ borderBottom: "1px solid #eee", background: "white", position: "sticky", top: 0, zIndex: 10 }}>
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/overview" style={{ textDecoration: "none", color: "black", fontWeight: 800 }}>
          OnceOnly
        </Link>

        <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <NavLink href="/overview" label="Overview" />
          <NavLink href="/events" label="Events" />
          <NavLink href="/metrics" label="Metrics" />
          <button
            onClick={() => {
              clearApiKey();
              window.location.href = "/login";
            }}
            style={{
              border: "1px solid #eee",
              background: "white",
              padding: "8px 10px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}

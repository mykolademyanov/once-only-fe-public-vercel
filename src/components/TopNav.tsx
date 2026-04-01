"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearApiKey } from "@/lib/auth";

function NavLink({ href, label, onNavigate }: { href: string; label: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="topnav-link"
      style={{
        textDecoration: "none",
        color: active ? "black" : "#444",
        fontWeight: active ? 650 : 450,
        fontSize: 14,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Link>
  );
}

export default function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header style={{ borderBottom: "1px solid #eee", background: "white", position: "sticky", top: 0, zIndex: 10 }}>
      <div
        className="topnav-inner"
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          rowGap: 10,
        }}
      >
        <Link href="/overview" className="topnav-brand" style={{ textDecoration: "none", color: "black", fontWeight: 800, whiteSpace: "nowrap" }}>
          OnceOnly
        </Link>

        <button
          type="button"
          className="topnav-toggle"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="topnav-mobile-menu"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          style={{
            border: "1px solid #eee",
            background: "white",
            padding: "7px 10px",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>

        <nav
          id="topnav-mobile-menu"
          className={`topnav-nav ${mobileMenuOpen ? "is-open" : ""}`}
          style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", flex: "1 1 560px", minWidth: 0, justifyContent: "flex-end" }}
        >
          <NavLink href="/overview" label="Overview" onNavigate={() => setMobileMenuOpen(false)} />
          <NavLink href="/events" label="Events" onNavigate={() => setMobileMenuOpen(false)} />
          <NavLink href="/run-debug" label="Run Debug" onNavigate={() => setMobileMenuOpen(false)} />
          <NavLink href="/governance" label="Governance" onNavigate={() => setMobileMenuOpen(false)} />
          <NavLink href="/metrics" label="Metrics" onNavigate={() => setMobileMenuOpen(false)} />

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              clearApiKey();
              window.location.href = "/login";
            }}
            className="topnav-logout"
            style={{
              border: "1px solid #eee",
              background: "white",
              padding: "7px 10px",
              borderRadius: 10,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontSize: 13,
            }}
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}

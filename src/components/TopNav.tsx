"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearApiKey } from "@/lib/auth";
import { useMe } from "@/lib/hooks";

function NavLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="topnav-menu-link"
      style={{
        textDecoration: "none",
        color: active ? "white" : "#111827",
        background: active ? "#111827" : "transparent",
        border: active ? "1px solid #111827" : "1px solid transparent",
        fontWeight: active ? 700 : 600,
      }}
    >
      {label}
    </Link>
  );
}

export default function TopNav() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const me = useMe();

  const handleNavigate = () => {
    setMenuOpen(false);
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (toggleRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const planRaw = (me.data?.plan || "free").toString().trim().toLowerCase();
  const planLabel = me.loading ? "..." : planRaw.toUpperCase();

  return (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(6px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        className="topnav-inner"
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "10px 16px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Link
            href="/overview"
            className="topnav-brand"
            style={{ textDecoration: "none", color: "#111827", fontWeight: 900, letterSpacing: "-0.01em" }}
          >
            OnceOnly
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "#1f2937",
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
                borderRadius: 999,
                padding: "6px 10px",
                whiteSpace: "nowrap",
              }}
            >
              Plan: {planLabel}
            </div>

            <button
              ref={toggleRef}
              type="button"
              className="topnav-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
              style={{
                border: "1px solid #d1d5db",
                background: "white",
                padding: "8px 11px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1,
                color: "#111827",
                whiteSpace: "nowrap",
              }}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div ref={menuRef} className="topnav-menu-panel">
            <div className="topnav-menu-links">
              <NavLink href="/overview" label="Overview" onNavigate={handleNavigate} />
              <NavLink href="/profile" label="Profile" onNavigate={handleNavigate} />
              <NavLink href="/events" label="Events" onNavigate={handleNavigate} />
              <NavLink href="/run-debug" label="Run Debug" onNavigate={handleNavigate} />
              <NavLink href="/governance" label="Governance" onNavigate={handleNavigate} />
              <NavLink href="/metrics" label="Metrics" onNavigate={handleNavigate} />
            </div>

            <div className="topnav-menu-footer">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  clearApiKey();
                  window.location.href = "/login";
                }}
                className="topnav-logout"
                style={{
                  width: "100%",
                  border: "1px solid #ef4444",
                  background: "#fef2f2",
                  color: "#991b1b",
                  padding: "9px 11px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: "left",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

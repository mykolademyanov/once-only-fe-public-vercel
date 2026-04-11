"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import TopNav from "./TopNav";
import PageSpinner from "./PageSpinner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const fallbackTimerRef = useRef<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const startRouteLoading = () => {
    setRouteLoading(true);
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
    }
    fallbackTimerRef.current = window.setTimeout(() => setRouteLoading(false), 1600);
  };

  useEffect(() => {
    if (!prevPathRef.current) {
      prevPathRef.current = pathname;
      return;
    }
    if (prevPathRef.current === pathname) return;

    prevPathRef.current = pathname;
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    const timer = window.setTimeout(() => setRouteLoading(false), 260);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      {routeLoading ? (
        <div
          style={{
            position: "fixed",
            top: 72,
            right: 16,
            zIndex: 60,
            background: "rgba(255,255,255,0.96)",
            border: "1px solid #e5e7eb",
            borderRadius: 999,
            padding: "8px 12px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            pointerEvents: "none",
          }}
        >
          <PageSpinner label="Loading page..." size={14} />
        </div>
      ) : null}
      <TopNav onStartNavigation={startRouteLoading} />
      <main className="app-main-shell" style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>{children}</main>
    </div>
  );
}

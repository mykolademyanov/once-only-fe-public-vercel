"use client";

import { usePathname } from "next/navigation";
import TopNav from "./TopNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <TopNav />
      <main className="app-main-shell" style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
        <div key={pathname} className="app-page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}

import TopNav from "./TopNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <TopNav />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>{children}</main>
    </div>
  );
}

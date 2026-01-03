import { ApiError } from "@/lib/api";

export default function UpgradeBanner({ reason }: { reason: "inactive" | "payment" | "rate" | "error"; error?: ApiError }) {
  const title =
    reason === "payment"
      ? "Payment required"
      : reason === "inactive"
        ? "Subscription inactive"
        : reason === "rate"
          ? "Rate limited"
          : "Something went wrong";

  const hint =
    reason === "payment"
      ? "Your plan needs upgrade or renewal."
      : reason === "inactive"
        ? "Your key is valid but the subscription is inactive."
        : reason === "rate"
          ? "Too many requests. Retry in a bit."
          : "Check API base + your key.";

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16, background: "#fafafa" }}>
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 6, color: "#444", fontSize: 14 }}>{hint}</div>
      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a
          href="https://onceonly.app"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            border: "1px solid #111",
            padding: "8px 10px",
            borderRadius: 12,
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Upgrade
        </a>
        <span style={{ fontSize: 12, color: "#666", alignSelf: "center" }}>
          (CTA placeholder — можна замінити на реальний billing link)
        </span>
      </div>
    </div>
  );
}

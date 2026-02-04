"use client";

import { getUpgradeUrl } from "@/lib/api";
import { useState } from "react";

export default function UpgradeBanner({
  reason,
  showButtons = true,
}: {
  reason: "inactive" | "payment" | "rate" | "upgrade";
  showButtons?: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function upgrade(plan: "starter" | "pro" | "agency") {
    setLoading(plan);
    const newWindow = window.open("about:blank", "_blank");

    try {
      const url = await getUpgradeUrl(plan);
      if (newWindow) newWindow.location.href = url;
    } catch (e) {
      console.error("Checkout redirect failed:", e);
      if (newWindow) newWindow.close();
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  let title = "Upgrade your plan";
  let description = "Unlock higher limits and premium features for your projects.";
  let bgColor = "#f0f9ff";
  let borderColor = "#bae6fd";

  if (reason === "rate") {
    title = "Rate limit exceeded";
    description = "You hit the request limit for your plan. Upgrade to continue.";
    bgColor = "#fff5f5";
    borderColor = "#feb2b2";
  } else if (reason === "payment") {
    title = "Payment required";
    description = "Please complete payment to restore full access.";
    bgColor = "#fff5f5";
    borderColor = "#feb2b2";
  } else if (reason === "inactive") {
    title = "Subscription inactive";
    description = "Your subscription is cancelled/expired. Renew to restore access.";
    bgColor = "#fff5f5";
    borderColor = "#feb2b2";
  }

  const danger = reason === "rate" || reason === "payment" || reason === "inactive";

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, background: bgColor }}>
      <div style={{ fontWeight: 800, fontSize: 16, color: danger ? "#b00020" : "#111" }}>{title}</div>
      <div style={{ marginTop: 4, color: "#444", fontSize: 14 }}>{description}</div>

      {showButtons && (
        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => upgrade("starter")}
            disabled={!!loading}
            style={{
              cursor: loading ? "default" : "pointer",
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid #ccc",
              background: "white",
              fontWeight: 700,
              fontSize: 13,
              opacity: loading && loading !== "starter" ? 0.5 : 1,
            }}
          >
            {loading === "starter" ? "Redirecting..." : "Starter ($29/mo)"}
          </button>

          <button
            onClick={() => upgrade("pro")}
            disabled={!!loading}
            style={{
              cursor: loading ? "default" : "pointer",
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid #3663eb",
              background: "#3663eb",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              opacity: loading && loading !== "pro" ? 0.5 : 1,
            }}
          >
            {loading === "pro" ? "Redirecting..." : "Pro ($149/mo)"}
          </button>

          <button
            onClick={() => upgrade("agency")}
            disabled={!!loading}
            style={{
              cursor: loading ? "default" : "pointer",
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              opacity: loading && loading !== "agency" ? 0.5 : 1,
            }}
          >
            {loading === "agency" ? "Redirecting..." : "Agency ($799/mo)"}
          </button>
        </div>
      )}
    </div>
  );
}

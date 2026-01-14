"use client";

import { getUpgradeUrl } from "@/lib/api";
import { useState } from "react";

/**
 * Banner component to prompt users to upgrade their plan.
 * Used for both errors (rate limit, payment) and general marketing (free to paid).
 */
export default function UpgradeBanner({ reason }: { reason: "inactive" | "payment" | "rate" | "upgrade" }) {
  const [loading, setLoading] = useState<string | null>(null);

  /**
   * Redirects the user to the Stripe checkout URL for the selected plan.
   */
  async function upgrade(plan: "starter" | "pro") {
    setLoading(plan);
    try {
      // Calls the API to get the specific checkout URL for the chosen plan
      const url = await getUpgradeUrl(plan);
      window.location.href = url;
    } catch (e) {
      console.error("Checkout redirect failed:", e);
      alert("Failed to start checkout. Please try again.");
      setLoading(null);
    }
  }

  // Default content for the "upgrade" suggestion
  let title = "Upgrade your plan";
  let description = "Unlock higher limits and premium features for your projects.";
  let bgColor = "#f0f9ff";
  let borderColor = "#bae6fd";

  // Override content based on specific error reasons
  if (reason === "rate") {
    title = "Rate limit exceeded";
    description = "You have hit the request limit for your plan. Upgrade to continue.";
    bgColor = "#fff5f5";
    borderColor = "#feb2b2";
  } else if (reason === "payment") {
    title = "Payment required";
    description = "Please settle your invoice to restore full access.";
    bgColor = "#fff5f5";
    borderColor = "#feb2b2";
  } else if (reason === "inactive") {
    title = "Account Inactive";
    description = "Your subscription has expired or been cancelled.";
    bgColor = "#fff5f5";
    borderColor = "#feb2b2";
  }

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, background: bgColor }}>
      <div style={{ fontWeight: 800, fontSize: 16, color: (reason === "rate" || reason === "payment") ? "#b00020" : "#111" }}>
        {title}
      </div>
      <div style={{ marginTop: 4, color: "#444", fontSize: 14 }}>
        {description}
      </div>

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
            opacity: loading && loading !== "starter" ? 0.5 : 1
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
            border: "1px solid #111",
            background: "#111",
            color: "white",
            fontWeight: 700,
            fontSize: 13,
            opacity: loading && loading !== "pro" ? 0.5 : 1
          }}
        >
          {loading === "pro" ? "Redirecting..." : "Pro ($99/mo)"}
        </button>
      </div>
    </div>
  );
}

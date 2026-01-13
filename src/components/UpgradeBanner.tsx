"use client";

import { getUpgradeUrl } from "@/lib/api";

// 1. Додаємо "rate" до дозволених типів
export default function UpgradeBanner({ reason }: { reason: "inactive" | "payment" | "rate" }) {
  
  async function upgrade(plan: "starter" | "pro" | "agency") {
    try {
      // 2. Виправлено: getUpgradeUrl повертає рядок, тому прибираємо деструктуризацію { url }
      const url = await getUpgradeUrl(plan);
      window.location.href = url;
    } catch (e) {
      console.error(e);
      alert("Failed to start checkout");
    }
  }

  // Визначаємо текст залежно від причини
  let title = "Upgrade required";
  let description = "Your current plan is Free.";

  if (reason === "rate") {
    title = "Rate limit exceeded";
    description = "You have hit the request limit for your plan.";
  } else if (reason === "payment") {
    title = "Payment required";
    description = "Please settle your invoice to continue.";
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16, background: "#fafafa" }}>
      <div style={{ fontWeight: 800, color: reason === "rate" ? "#b00020" : "inherit" }}>
        {title}
      </div>
      <div style={{ marginTop: 6, color: "#444", fontSize: 14 }}>
        {description}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button 
            onClick={() => upgrade("starter")}
            style={{ cursor: "pointer", padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", background: "white" }}
        >
            Upgrade to Starter
        </button>
        <button 
            onClick={() => upgrade("pro")}
            style={{ cursor: "pointer", padding: "8px 12px", borderRadius: 8, border: "1px solid #000", background: "#000", color: "white" }}
        >
            Upgrade to Pro
        </button>
      </div>
    </div>
  );
}

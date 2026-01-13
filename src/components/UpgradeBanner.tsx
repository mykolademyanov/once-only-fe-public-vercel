import { getUpgradeUrl } from "@/lib/api";

export default function UpgradeBanner({ reason }: { reason: "inactive" | "payment" }) {
  async function upgrade(plan: "starter" | "pro" | "agency") {
    try {
      const { url } = await getUpgradeUrl(plan);
      window.location.href = url;
    } catch (e) {
      alert("Failed to start checkout");
    }
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16, background: "#fafafa" }}>
      <div style={{ fontWeight: 800 }}>Upgrade required</div>
      <div style={{ marginTop: 6, color: "#444", fontSize: 14 }}>
        Your current plan is Free.
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={() => upgrade("starter")}>Upgrade to Starter</button>
        <button onClick={() => upgrade("pro")}>Upgrade to Pro</button>
      </div>
    </div>
  );
}

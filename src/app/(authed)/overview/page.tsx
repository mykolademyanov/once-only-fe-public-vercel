"use client";

import ProgressBar from "@/components/ProgressBar";
import StatCard from "@/components/StatCard";
import UpgradeBanner from "@/components/UpgradeBanner";
import { useMe, useUsage, useMetrics } from "@/lib/hooks";
import { toISODate } from "@/lib/date";

export default function OverviewPage() {
  const me = useMe();
  const usage = useUsage();

  const today = toISODate(new Date());
  const metrics = useMetrics(today, today);

  const paymentRequired = me.error?.status === 402 || usage.error?.status === 402 || metrics.error?.status === 402;
  const rateLimited = me.error?.status === 429 || usage.error?.status === 429 || metrics.error?.status === 429;

  const inactive = me.data ? !me.data.is_active : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>Overview</div>
        <div style={{ color: "#555", marginTop: 6, fontSize: 14 }}>Plan, usage, and today stats.</div>
      </div>

      {paymentRequired ? <UpgradeBanner reason="payment" /> : null}
      {!paymentRequired && inactive ? <UpgradeBanner reason="inactive" /> : null}
      {rateLimited ? <UpgradeBanner reason="rate" /> : null}

      <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, color: "#555" }}>Plan</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>
              {me.loading ? "…" : me.data?.plan ?? "unknown"}
            </div>
            <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>
              key: {me.loading ? "…" : me.data?.key_preview ?? "—"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#555" }}>Period ends</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>
              {me.loading ? "…" : me.data?.current_period_end ?? "—"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          {usage.data ? (
            <ProgressBar value={usage.data.usage} max={usage.data.limit} />
          ) : (
            <div style={{ color: "#666", fontSize: 14 }}>{usage.loading ? "Loading usage…" : "No usage data."}</div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <StatCard
          label="checks_total (today)"
          value={metrics.data?.[0]?.checks_total ?? (metrics.loading ? "…" : 0)}
        />
        <StatCard
          label="duplicates_blocked (today)"
          value={metrics.data?.[0]?.duplicates_blocked ?? (metrics.loading ? "…" : 0)}
        />
        <StatCard
          label="rate_limited (today)"
          value={metrics.data?.[0]?.rate_limited ?? (metrics.loading ? "…" : 0)}
        />
        <StatCard
          label="locks_created (today)"
          value={metrics.data?.[0]?.locks_created ?? (metrics.loading ? "…" : 0)}
        />
      </div>
    </div>
  );
}

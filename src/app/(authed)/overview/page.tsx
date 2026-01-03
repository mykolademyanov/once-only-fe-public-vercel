"use client";

import { useEffect, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import StatCard from "@/components/StatCard";
import UpgradeBanner from "@/components/UpgradeBanner";
import InfoTip from "@/components/InfoTip";
import { useMe, useUsage, useMetrics } from "@/lib/hooks";
import { toISODate } from "@/lib/date";

export default function OverviewPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setRefreshKey((x) => x + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const me = useMe(refreshKey);
  const usage = useUsage(refreshKey);

  const today = toISODate(new Date());
  const metrics = useMetrics(today, today, refreshKey);

  const paymentRequired =
    me.error?.status === 402 || usage.error?.status === 402 || metrics.error?.status === 402;

  const rateLimited =
    me.error?.status === 429 || usage.error?.status === 429 || metrics.error?.status === 429;

  const inactive = me.data ? !me.data.is_active : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>Overview</div>
        <div style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
          Your plan, limits, and request activity.
        </div>
      </div>

      {paymentRequired && <UpgradeBanner reason="payment" />}
      {!paymentRequired && inactive && <UpgradeBanner reason="inactive" />}
      {rateLimited && <UpgradeBanner reason="rate" />}

      {/* PLAN + USAGE */}
      <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "#555" }}>Plan</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              {me.loading ? "…" : me.data?.plan ?? "unknown"}
            </div>
            <div style={{ fontSize: 13, color: "#777" }}>
              key: {me.loading ? "…" : me.data?.key_preview ?? "—"}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#555" }}>Period ends</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {me.loading ? "…" : me.data?.current_period_end ?? "—"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          {usage.data ? (
            <ProgressBar value={usage.data.usage} max={usage.data.limit} />
          ) : (
            <div style={{ color: "#666", fontSize: 14 }}>
              {usage.loading ? "Loading usage…" : "No usage data."}
            </div>
          )}
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
        <StatCard
          label={
            <InfoTip
              label="Requests (today)"
              description="How many times your automation called OnceOnly today."
            />
          }
          value={metrics.data?.[0]?.checks_total ?? (metrics.loading ? "…" : 0)}
        />

        <StatCard
          label={
            <InfoTip
              label="Duplicates blocked (today)"
              description="Repeated requests that were stopped to prevent duplicate execution."
            />
          }
          value={metrics.data?.[0]?.duplicates_blocked ?? (metrics.loading ? "…" : 0)}
        />

        <StatCard
          label={
            <InfoTip
              label="First-time requests (today)"
              description="Requests that were accepted as the first occurrence for a given key."
            />
          }
          value={metrics.data?.[0]?.locks_created ?? (metrics.loading ? "…" : 0)}
        />

        <StatCard
          label={
            <InfoTip
              label="Rate limited (today)"
              description="Requests rejected because they were sent too frequently."
            />
          }
          value={metrics.data?.[0]?.rate_limited ?? (metrics.loading ? "…" : 0)}
        />

        <StatCard
          label={
            <InfoTip
              label="Requests (this month)"
              description="Total calls to OnceOnly in the current month."
            />
          }
          value={usage.data?.requests_total_month ?? (usage.loading ? "…" : 0)}
        />

        <StatCard
          label={
            <InfoTip
              label="Blocked (this month)"
              description="Requests stopped this month to prevent duplicates or over-usage."
            />
          }
          value={usage.data?.blocked_total_month ?? (usage.loading ? "…" : 0)}
        />
      </div>
    </div>
  );
}

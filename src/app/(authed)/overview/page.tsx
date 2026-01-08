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
  const todayDate = toISODate(new Date());
  const metrics = useMetrics(todayDate, todayDate, refreshKey);

  const paymentRequired = me.error?.status === 402 || usage.error?.status === 402;
  const inactive = me.data ? !me.data.is_active : false;
  const today = metrics.data?.[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
      {/* HEADER & NOTIFICATIONS */}
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>Overview</div>
        <div style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
          Comprehensive usage analytics for your automation and AI infrastructure.
        </div>
      </div>

      {paymentRequired && <UpgradeBanner reason="payment" />}
      {!paymentRequired && inactive && <UpgradeBanner reason="inactive" />}

      {/* PLAN & KEY INFO */}
      <div style={{ display: "flex", justifyContent: "space-between", background: "#f8f9fa", padding: 16, borderRadius: 16, alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 12, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>Plan: </span>
          <span style={{ fontWeight: 800, color: "#111" }}>{me.data?.plan ?? "—"}</span>
        </div>
        <div>
          <span style={{ fontSize: 12, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>Key Preview: </span>
          <code style={{ background: "#eee", padding: "2px 6px", borderRadius: 6 }}>{me.data?.key_preview ?? "—"}</code>
        </div>
      </div>

      {/* SECTION: AUTOMATION (MAKE/ZAPIER) */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 20, background: "#111", borderRadius: 2 }}></div>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Automation Activity</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {/* Monthly Progress */}
          <div style={{ gridColumn: "1 / -1", border: "1px solid #eee", borderRadius: 20, padding: 20 }}>
            <ProgressBar value={usage.data?.make.usage ?? 0} max={usage.data?.make.limit ?? 1} color="#111" />
          </div>

          <StatCard
            label="Today's Requests"
            value={today?.checks_total ?? 0}
            sub="24h activity"
          />
          <StatCard
            label="Monthly Total"
            value={usage.data?.make.requests_total_month ?? 0}
            sub="Current billing cycle"
          />
          <StatCard
            label="Lifetime Saved"
            value={me.data?.blocked_total_all_time ?? 0}
            color="#059669"
            sub="Duplicates blocked ever"
          />
          <StatCard
            label="Total Requests"
            value={me.data?.requests_total_all_time ?? 0}
            sub="Lifetime calls"
          />
        </div>
      </section>

      {/* SECTION: AI AGENTS */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 20, background: "#4f46e5", borderRadius: 2 }}></div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#4f46e5" }}>AI Agent Intelligence</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {/* Monthly Progress AI */}
          <div style={{ gridColumn: "1 / -1", border: "1px solid #e0e7ff", borderRadius: 20, padding: 20, background: "#fcfdff" }}>
            <ProgressBar value={usage.data?.ai.usage ?? 0} max={usage.data?.ai.limit ?? 1} color="#4f46e5" />
          </div>

          <StatCard
            label="AI Runs (Today)"
            value={today?.ai_acquired ?? 0}
            color="#4f46e5"
            sub="Active agent leases"
          />
          <StatCard
            label="AI Runs (Month)"
            value={usage.data?.ai.requests_total_month ?? 0}
            color="#4f46e5"
            sub="Total credits used"
          />
          <StatCard
            label="AI Failures (Today)"
            value={today?.ai_failed ?? 0}
            color={today?.ai_failed ? "#dc2626" : "#666"}
            sub="Check logs for errors"
          />
          <StatCard
            label="Efficiency Rate"
            value={today?.checks_total ? `${Math.round(((today.duplicates_blocked) / today.checks_total) * 100)}%` : "100%"}
            color="#4f46e5"
            sub="Resource optimization"
          />
        </div>
      </section>

      {/* FOOTER STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, borderTop: "1px solid #eee", paddingTop: 24 }}>
        <div style={{ textAlign: "center", padding: 16 }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 700 }}>MONTHLY BLOCKED</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{usage.data?.make.blocked_total_month ?? 0}</div>
        </div>
        <div style={{ textAlign: "center", padding: 16 }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 700 }}>AI SUCCESS RATE</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#059669" }}>
            {today?.ai_acquired ? `${Math.round(((today.ai_acquired - (today.ai_failed || 0)) / today.ai_acquired) * 100)}%` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

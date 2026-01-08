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

  // Авто-рефреш кожні 10 секунд для Real-time ефекту
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

  // Дані з бекенду (MetricsRow)
  const today = metrics.data?.[0];

  // Розрахунок ефективності
  const efficiency = today?.checks_total
    ? Math.round((today.duplicates_blocked / today.checks_total) * 100)
    : 0;

  // Розрахунок успішності AI (на основі ai_completed та ai_failed з твого коду)
  const aiSuccessRate = today?.ai_acquired
    ? Math.round(((today.ai_completed || 0) / today.ai_acquired) * 100)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
      {/* --- HEADER --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>Dashboard</div>
          <div style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
            Real-time monitoring of your infrastructure locks and AI agents.
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>System Status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#059669" }}>
            <span style={{ width: 8, height: 8, background: "#059669", borderRadius: "50%" }}></span>
            Operational
          </div>
        </div>
      </div>

      {paymentRequired && <UpgradeBanner reason="payment" />}
      {!paymentRequired && inactive && <UpgradeBanner reason="inactive" />}

      {/* --- ACCOUNT QUICK INFO --- */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        background: "#f8f9fa",
        padding: "16px 20px",
        borderRadius: 20,
        border: "1px solid #eee"
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>Active Plan</div>
          <div style={{ fontWeight: 800, color: "#111", fontSize: 18, textTransform: "capitalize" }}>
            {me.loading ? "···" : me.data?.plan ?? "Free"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>API Key Preview</div>
          <code style={{ background: "#eee", padding: "4px 8px", borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
            {me.loading ? "········" : me.data?.key_preview ?? "—"}
          </code>
        </div>
      </div>

      {/* --- SECTION 1: AUTOMATION (MAKE/ZAPIER) --- */}
      <section>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, background: "#111", borderRadius: 2 }}></div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Automation Locks</h2>
          </div>
          <p style={{ fontSize: 13, color: "#666", marginTop: 4, marginLeft: 14 }}>
            Deduplication stats for webhooks and standard integration workflows.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {/* Monthly Progress Bar */}
          <div style={{ gridColumn: "1 / -1", border: "1px solid #eee", borderRadius: 20, padding: 24, background: "white" }}>
            <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14 }}>Monthly Request Limit</div>
            <ProgressBar value={usage.data?.make.usage ?? 0} max={usage.data?.make.limit ?? 1} color="#111" />
          </div>

          <StatCard
            label={<InfoTip label="Today's Traffic" description="Total incoming requests processed in the last 24 hours." />}
            value={today?.checks_total ?? 0}
            sub="Requests handled"
          />
          <StatCard
            label={<InfoTip label="Duplicates Blocked" description="Total number of executions prevented today because they were identical." />}
            value={today?.duplicates_blocked ?? 0}
            color="#059669"
            sub="Operations saved today"
          />
          <StatCard
            label={<InfoTip label="Cycle Total" description="Total requests processed since the start of your current billing month." />}
            value={usage.data?.make.requests_total_month ?? 0}
            sub="Current month usage"
          />
          <StatCard
            label={<InfoTip label="Lifetime Saved" description="Total number of redundant operations blocked since you started." />}
            value={me.data?.blocked_total_all_time ?? 0}
            color="#059669"
            sub="Total value generated"
          />
        </div>
      </section>

      {/* --- SECTION 2: AI AGENTS --- */}
      <section>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, background: "#4f46e5", borderRadius: 2 }}></div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#4f46e5" }}>AI Agent Intelligence</h2>
          </div>
          <p style={{ fontSize: 13, color: "#666", marginTop: 4, marginLeft: 14 }}>
            Advanced lease management and credit tracking for autonomous agents.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {/* Monthly AI Credits Bar */}
          <div style={{
            gridColumn: "1 / -1",
            border: "1px solid #e0e7ff",
            borderRadius: 20,
            padding: 24,
            background: "linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)"
          }}>
            <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14, color: "#4f46e5" }}>AI Credit Consumption</div>
            <ProgressBar value={usage.data?.ai.usage ?? 0} max={usage.data?.ai.limit ?? 1} color="#4f46e5" />
          </div>

          <StatCard
            label={<InfoTip label="AI Tasks" description="Number of agent tasks initiated today (acquired leases)." />}
            value={today?.ai_acquired ?? 0}
            color="#4f46e5"
            sub="Today's agent runs"
          />
          <StatCard
            label={<InfoTip label="Success Rate" description="Percentage of AI tasks that called the /complete endpoint successfully." />}
            value={today?.ai_acquired ? `${aiSuccessRate}%` : "—"}
            color={aiSuccessRate > 90 ? "#059669" : "#4f46e5"}
            sub="Task reliability"
          />
          <StatCard
            label={<InfoTip label="Agent Errors" description="Number of AI tasks that explicitly failed (called /fail endpoint) today." />}
            value={today?.ai_failed ?? 0}
            color={today?.ai_failed ? "#dc2626" : "#666"}
            sub="Check logs for errors"
          />
          <StatCard
            label={<InfoTip label="Optimization" description="The percentage of your total infrastructure traffic that OnceOnly successfully optimized." />}
            value={`${efficiency}%`}
            color="#4f46e5"
            sub="Traffic overhead saved"
          />
        </div>
      </section>

      {/* --- FOOTER ANALYTICS --- */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16,
        borderTop: "1px solid #eee",
        paddingTop: 32
      }}>
        <div style={{ textAlign: "center", padding: 24, background: "#f9f9f9", borderRadius: 20 }}>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Lifetime Requests</div>
          <div style={{ fontSize: 32, fontWeight: 900, marginTop: 8 }}>{me.data?.requests_total_all_time?.toLocaleString() ?? 0}</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Total processed volume</div>
        </div>
        <div style={{ textAlign: "center", padding: 24, background: "#f0fdf4", borderRadius: 20, border: "1px solid #dcfce7" }}>
          <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Saved Costs</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#059669", marginTop: 8 }}>
            ${((me.data?.blocked_total_all_time ?? 0) * 0.01).toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>Estimated at $0.01/op</div>
        </div>
      </div>
    </div>
  );
}

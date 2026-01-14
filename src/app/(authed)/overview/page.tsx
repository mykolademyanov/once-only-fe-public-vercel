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

  // Auto-refresh data every 10 seconds
  useEffect(() => {
    const id = window.setInterval(() => setRefreshKey((x) => x + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const me = useMe(refreshKey);
  const usage = useUsage(refreshKey);
  const todayDate = toISODate(new Date());
  const metrics = useMetrics(todayDate, todayDate, refreshKey);

  // Status checks
  const paymentRequired = me.error?.status === 402 || usage.error?.status === 402;
  const rateLimited = me.error?.status === 429 || usage.error?.status === 429;
  const inactive = me.data ? !me.data.is_active : false;
  const isFreePlan = (me.data?.plan ?? "free") === "free";

  // show upgrade buttons only when user is on free and not blocked by errors
  const showUpgradeButtons =
      !me.loading && isFreePlan && !paymentRequired && !inactive && !rateLimited;

  const today = metrics.data?.[0];

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

      {/* --- ALERTS & UPGRADE BANNER --- */}
      {me.loading ? (
        <div style={{
          height: 108,
          background: "#f3f4f6",
          borderRadius: 16,
          border: "1px solid #eee"
        }} />
      ) : (
        <>
          {paymentRequired && <UpgradeBanner reason="payment" showButtons={false} />}
          {!paymentRequired && inactive && <UpgradeBanner reason="inactive" showButtons={false} />}
          {!paymentRequired && !inactive && rateLimited && <UpgradeBanner reason="rate" showButtons={false} />}
          {showUpgradeButtons && <UpgradeBanner reason="upgrade" showButtons={true} />}
        </>
      )}

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
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Automation Locks (MAKE/ZAPIER)</h2>
          </div>
          <p style={{ fontSize: 13, color: "#666", marginTop: 4, marginLeft: 14 }}>
            Deduplication stats for webhooks and standard integration workflows.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {/* Monthly Progress Bar */}
          <div style={{ gridColumn: "1 / -1", border: "1px solid #eee", borderRadius: 20, padding: 24, background: "white" }}>
            <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14 }}>Monthly Duplicates Blocked</div>
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
            Charged tasks vs free polling, plus reliability signals.
          </p>
        </div>

        {/* AI Metrics Calculation Block */}
        {(() => {
          const ai = usage.data?.ai;
          const charged = ai?.charged_total_month ?? ai?.usage ?? 0;
          const polling = ai?.polling_total_month ?? 0;
          const limit = ai?.limit ?? 1;
          const leaseCalls = ai?.requests_total_month ?? 0;
          const blocked = ai?.blocked_total_month ?? 0;

          const aiSuccessRate =
            today?.ai_acquired ? Math.round(((today.ai_completed || 0) / today.ai_acquired) * 100) : 0;

          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div
                style={{
                  gridColumn: "1 / -1",
                  border: "1px solid #e0e7ff",
                  borderRadius: 20,
                  padding: 24,
                  background: "linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)",
                }}
              >
                <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14, color: "#4f46e5" }}>
                  AI Credits Used (Charged)
                </div>
                <ProgressBar value={charged} max={limit} color="#4f46e5" />
                <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                  Charged: <b>{charged.toLocaleString()}</b> / {limit.toLocaleString()} • Free polling:{" "}
                  <b>{polling.toLocaleString()}</b> • Over-limit blocks: <b>{blocked.toLocaleString()}</b>
                </div>
              </div>

              <StatCard
                label={<InfoTip label="Charged Tasks (Month)" description="How many unique AI runs were billed (acquired leases)." />}
                value={charged}
                color="#4f46e5"
                sub="Billed agent starts"
              />

              <StatCard
                label={<InfoTip label="Free Polling (Month)" description="How many /ai/lease calls were free polls on existing keys." />}
                value={polling}
                color="#4f46e5"
                sub="Non-billed status checks"
              />

              <StatCard
                label={<InfoTip label="AI Lease Calls (Month)" description="All /ai/lease calls in the month (charged + polling)." />}
                value={leaseCalls}
                color="#4f46e5"
                sub="Total lease requests"
              />

              <StatCard
                label={<InfoTip label="AI Tasks (Today)" description="Number of tasks initiated today (acquired leases)." />}
                value={today?.ai_acquired ?? 0}
                color="#4f46e5"
                sub="Today's agent runs"
              />

              <StatCard
                label={<InfoTip label="Success Rate" description="Completed vs acquired tasks (today)." />}
                value={today?.ai_acquired ? `${aiSuccessRate}%` : "—"}
                color={aiSuccessRate > 90 ? "#059669" : "#4f46e5"}
                sub="Task reliability"
              />

              <StatCard
                label={<InfoTip label="Agent Errors (Today)" description="Tasks that failed today (via /fail or timeout)." />}
                value={today?.ai_failed ?? 0}
                color={today?.ai_failed ? "#dc2626" : "#666"}
                sub="Check logs for errors"
              />
            </div>
          );
        })()}
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
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import StatCard from "@/components/StatCard";
import UpgradeBanner from "@/components/UpgradeBanner";
import InfoTip from "@/components/InfoTip";
import PageSpinner from "@/components/PageSpinner";
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
  const isPaidPlan = !isFreePlan;

  // show upgrade buttons only when user is on free and not blocked by errors
  const showUpgradeButtons =
      !me.loading && isFreePlan && !paymentRequired && !inactive && !rateLimited;

  const today = metrics.data?.[0];

  const makeUsageValue = usage.data?.make.usage ?? 0;
  const aiUsageValue = usage.data?.ai?.charged_total_month ?? usage.data?.ai?.usage ?? 0;
  const makeLimitValue = usage.data?.make.limit ?? 0;
  const aiLimitValue = usage.data?.ai?.limit ?? 0;
  const makeProgressMax = makeLimitValue > 0 ? makeLimitValue : Math.max(1, makeUsageValue);
  const aiProgressMax = aiLimitValue > 0 ? aiLimitValue : Math.max(1, aiUsageValue);
  const makeDelta = makeLimitValue - makeUsageValue;
  const aiDelta = aiLimitValue - aiUsageValue;
  const isMakeSoftOverLimit = makeLimitValue > 0 && makeUsageValue > makeLimitValue;
  const isAiSoftOverLimit = aiLimitValue > 0 && aiUsageValue > aiLimitValue;
  const showSoftOverLimitBadge =
    !me.loading && !usage.loading && isPaidPlan && (isMakeSoftOverLimit || isAiSoftOverLimit);
  const showAccountEntrypoint = isFreePlan || paymentRequired || inactive;

  const showMakeFirst = makeUsageValue > aiUsageValue;
  const initialLoading =
    (me.loading && !me.data) ||
    (usage.loading && !usage.data) ||
    (metrics.loading && !metrics.data);

  if (initialLoading) {
    return <PageSpinner fullScreen label="Loading overview..." />;
  }

  const automationSection = (
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
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Monthly Duplicates Blocked</div>
            <div style={{ fontSize: 12, color: "#4b5563", fontWeight: 700 }}>
              {makeUsageValue.toLocaleString()} / {makeLimitValue > 0 ? makeLimitValue.toLocaleString() : "∞"}
            </div>
          </div>
          <ProgressBar value={makeUsageValue} max={makeProgressMax} color="#111" />
          <div style={{ marginTop: 8, fontSize: 12, color: makeLimitValue > 0 ? (makeDelta >= 0 ? "#166534" : "#991b1b") : "#4b5563", fontWeight: 700 }}>
            {makeLimitValue > 0
              ? (makeDelta >= 0
                ? `${makeDelta.toLocaleString()} left`
                : `${Math.abs(makeDelta).toLocaleString()} over`)
              : "No cap on this plan"}
          </div>
        </div>

        <StatCard
          align="center"
          label={<InfoTip label="Today's Traffic" description="Total incoming requests processed in the last 24 hours." />}
          value={today?.checks_total ?? 0}
          sub="Requests handled"
        />
        <StatCard
          align="center"
          label={<InfoTip label="Duplicates Blocked" description="Total number of executions prevented today because they were identical." />}
          value={today?.duplicates_blocked ?? 0}
          color="#059669"
          sub="Operations saved today"
        />
        <StatCard
          align="center"
          label={<InfoTip label="Cycle Total" description="Total requests processed since the start of your current billing month." />}
          value={usage.data?.make.requests_total_month ?? 0}
          sub="Current month usage"
        />
        <StatCard
          align="center"
          label={<InfoTip label="Lifetime Saved" description="Total number of redundant operations blocked since you started." />}
          value={me.data?.blocked_total_all_time ?? 0}
          color="#059669"
          sub="Total value generated"
        />
      </div>
    </section>
  );

  const aiSection = (
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
              <ProgressBar value={charged} max={aiProgressMax} color="#4f46e5" />
              <div style={{ marginTop: 10, fontSize: 12, color: "#4b5563", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700 }}>
                  {charged.toLocaleString()} / {aiLimitValue > 0 ? aiLimitValue.toLocaleString() : "∞"}
                </span>
                <span style={{ color: aiLimitValue > 0 ? (aiDelta >= 0 ? "#166534" : "#991b1b") : "#4b5563", fontWeight: 700 }}>
                  {aiLimitValue > 0
                    ? (aiDelta >= 0
                      ? `${aiDelta.toLocaleString()} left`
                      : `${Math.abs(aiDelta).toLocaleString()} over`)
                    : "No cap on this plan"}
                </span>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 999, padding: "4px 8px" }}>
                  Polling: {polling.toLocaleString()}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: blocked > 0 ? "#9a3412" : "#4b5563", background: blocked > 0 ? "#fff7ed" : "#f3f4f6", border: blocked > 0 ? "1px solid #fdba74" : "1px solid #e5e7eb", borderRadius: 999, padding: "4px 8px" }}>
                  Over-limit blocks: {blocked.toLocaleString()}
                </span>
              </div>
            </div>

            <StatCard
              align="center"
              label={<InfoTip label="Charged Tasks (Month)" description="How many unique AI runs were billed (acquired leases)." />}
              value={charged}
              color="#4f46e5"
              sub="Billed agent starts"
            />

            <StatCard
              align="center"
              label={<InfoTip label="Free Polling (Month)" description="How many /ai/lease calls were free polls on existing keys." />}
              value={polling}
              color="#4f46e5"
              sub="Non-billed status checks"
            />

            <StatCard
              align="center"
              label={<InfoTip label="AI Lease Calls (Month)" description="All /ai/lease calls in the month (charged + polling)." />}
              value={leaseCalls}
              color="#4f46e5"
              sub="Total lease requests"
            />

            <StatCard
              align="center"
              label={<InfoTip label="AI Tasks (Today)" description="Number of tasks initiated today (acquired leases)." />}
              value={today?.ai_acquired ?? 0}
              color="#4f46e5"
              sub="Today's agent runs"
            />

            <StatCard
              align="center"
              label={<InfoTip label="Success Rate (Today)" description="Completed vs acquired tasks (today)." />}
              value={today?.ai_acquired ? `${aiSuccessRate}%` : "—"}
              color={aiSuccessRate > 90 ? "#059669" : "#4f46e5"}
              sub="Task reliability today"
            />

            <StatCard
              align="center"
              label={<InfoTip label="Agent Errors (Today)" description="Tasks that failed today (via /fail or timeout)." />}
              value={today?.ai_failed ?? 0}
              color={today?.ai_failed ? "#dc2626" : "#666"}
              sub="Check logs for errors"
            />
          </div>
        );
      })()}
    </section>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
      {/* --- HEADER --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
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

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Limits Snapshot
          </div>
          {showSoftOverLimitBadge ? (
            <div
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid #fcd34d",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Plan limit exceeded, protection still active.
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 10 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "white", padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>Automation</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4b5563" }}>
                {makeUsageValue.toLocaleString()} / {makeLimitValue > 0 ? makeLimitValue.toLocaleString() : "∞"}
              </div>
            </div>
            <ProgressBar value={makeUsageValue} max={makeProgressMax} color="#111" />
          </div>

          <div style={{ border: "1px solid #e0e7ff", borderRadius: 12, background: "white", padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#4f46e5" }}>AI</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4b5563" }}>
                {aiUsageValue.toLocaleString()} / {aiLimitValue > 0 ? aiLimitValue.toLocaleString() : "∞"}
              </div>
            </div>
            <ProgressBar value={aiUsageValue} max={aiProgressMax} color="#4f46e5" />
          </div>
        </div>
      </section>

      {/* --- ACCOUNT ENTRYPOINT (FREE/EXPIRED ONLY) --- */}
      {showAccountEntrypoint ? (
      <section
        style={{
          border: "1px solid #eee",
          borderRadius: 16,
          background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
              Account & Notifications
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
              {paymentRequired || inactive
                ? "Plan is expired or inactive. Check billing and alert settings in Profile."
                : "You are on Free plan. API key preview and email alerts are in Profile."}
            </div>
          </div>
          <Link
            href="/profile"
            style={{
              textDecoration: "none",
              border: "1px solid #111",
              background: "#111",
              color: "white",
              padding: "9px 12px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Open Profile
          </Link>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <div
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              background: "#eef2ff",
              color: "#3730a3",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "capitalize",
            }}
          >
            Plan: {me.loading ? "..." : me.data?.plan ?? "free"}
          </div>
        </div>
      </section>
      ) : null}

      {showMakeFirst ? (
        <>
          {automationSection}
          {aiSection}
        </>
      ) : (
        <>
          {aiSection}
          {automationSection}
        </>
      )}

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

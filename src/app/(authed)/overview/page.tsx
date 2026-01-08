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

  // Автоматичне оновлення даних кожні 10 секунд
  useEffect(() => {
    const id = window.setInterval(() => setRefreshKey((x) => x + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const me = useMe(refreshKey);
  const usage = useUsage(refreshKey);

  const todayDate = toISODate(new Date());
  const metrics = useMetrics(todayDate, todayDate, refreshKey);

  // Обробка помилок
  const paymentRequired =
    me.error?.status === 402 || usage.error?.status === 402 || metrics.error?.status === 402;

  const rateLimited =
    me.error?.status === 429 || usage.error?.status === 429 || metrics.error?.status === 429;

  const inactive = me.data ? !me.data.is_active : false;

  // Дані за сьогодні з масиву метрик
  const today = metrics.data?.[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* HEADER */}
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>Overview</div>
        <div style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
          Monitoring your automation limits and AI agent performance.
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {paymentRequired && <UpgradeBanner reason="payment" />}
      {!paymentRequired && inactive && <UpgradeBanner reason="inactive" />}
      {rateLimited && <UpgradeBanner reason="rate" />}

      {/* PLAN DETAILS */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #eee",
        paddingBottom: 16
      }}>
        <div>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Current Plan</div>
          <div style={{ fontSize: 20, fontWeight: 900, textTransform: "capitalize", color: "#111" }}>
            {me.loading ? "···" : me.data?.plan ?? "Free"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>API Key Preview</div>
          <code style={{
            fontSize: 13,
            fontWeight: 700,
            background: "#f0f0f0",
            padding: "4px 8px",
            borderRadius: 8,
            fontFamily: "monospace"
          }}>
            {me.loading ? "········" : me.data?.key_preview ?? "—"}
          </code>
        </div>
      </div>

      {/* MAIN USAGE CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* AUTOMATION CARD */}
        <div style={{ border: "1px solid #eee", borderRadius: 20, padding: 24, background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Automation (Make/Zapier)</div>
            <div style={{ fontSize: 11, background: "#f5f5f5", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>MONTHLY</div>
          </div>
          {usage.loading ? (
            <div style={{ height: 60, display: "flex", alignItems: "center", color: "#999" }}>Loading usage...</div>
          ) : usage.data ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
                {usage.data.make.usage.toLocaleString()}
                <span style={{ fontSize: 16, color: "#aaa", fontWeight: 400 }}> / {usage.data.make.limit.toLocaleString()}</span>
              </div>
              <ProgressBar value={usage.data.make.usage} max={usage.data.make.limit} color="#111" />
            </>
          ) : <div style={{ color: "#ff4444" }}>Error loading data</div>}
        </div>

        {/* AI AGENTS CARD */}
        <div style={{
          border: "1px solid #e0e7ff",
          borderRadius: 20,
          padding: 24,
          background: "linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)",
          boxShadow: "0 2px 10px rgba(79, 70, 229, 0.05)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#4f46e5" }}>AI Agent Credits</div>
            <div style={{ fontSize: 11, background: "#eef2ff", color: "#4f46e5", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>PREMIUM</div>
          </div>
          {usage.loading ? (
            <div style={{ height: 60, display: "flex", alignItems: "center", color: "#999" }}>Loading usage...</div>
          ) : usage.data ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#4f46e5", marginBottom: 12 }}>
                {usage.data.ai.usage.toLocaleString()}
                <span style={{ fontSize: 16, color: "#a5b4fc", fontWeight: 400 }}> / {usage.data.ai.limit.toLocaleString()}</span>
              </div>
              <ProgressBar value={usage.data.ai.usage} max={usage.data.ai.limit} color="#4f46e5" />
            </>
          ) : <div style={{ color: "#ff4444" }}>Error loading data</div>}
        </div>
      </div>

      {/* DETAILED STATS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <StatCard
          label={<InfoTip label="Total Checks (Today)" description="Total requests processed for deduplication." />}
          value={today?.checks_total ?? (metrics.loading ? "···" : 0)}
        />
        <StatCard
          label={<InfoTip label="AI Tasks Started" description="Successful AI lease acquisitions." />}
          value={today?.ai_acquired ?? (metrics.loading ? "···" : 0)}
          color="#4f46e5"
        />
        <StatCard
          label={<InfoTip label="Duplicates Blocked" description="Requests prevented from running twice." />}
          value={today?.duplicates_blocked ?? (metrics.loading ? "···" : 0)}
        />
        <StatCard
          label={<InfoTip label="Efficiency" description="Percentage of requests that were blocked as duplicates." />}
          value={today?.checks_total ? `${Math.round((today.duplicates_blocked / today.checks_total) * 100)}%` : "0%"}
          color="#059669"
        />
      </div>
    </div>
  );
}

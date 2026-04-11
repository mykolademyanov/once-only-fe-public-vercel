"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import UpgradeBanner from "@/components/UpgradeBanner";
import PageSpinner from "@/components/PageSpinner";
import { apiPost } from "@/lib/api";
import { useMe, useUsage } from "@/lib/hooks";

export default function ProfilePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifyEnabled, setNotifyEnabled] = useState<boolean | null>(null);
  const [toolNotifyEnabled, setToolNotifyEnabled] = useState<boolean | null>(null);
  const [runNotifyEnabled, setRunNotifyEnabled] = useState<boolean | null>(null);
  const [notifySavingKey, setNotifySavingKey] = useState<"all" | "tool" | "run" | null>(null);
  const [notifyError, setNotifyError] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setRefreshKey((x) => x + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const me = useMe(refreshKey);
  const usage = useUsage(refreshKey);

  useEffect(() => {
    if (!me.loading && me.data) {
      const globalEnabled = me.data.email_notifications_enabled ?? true;
      setNotifyEnabled(globalEnabled);
      setToolNotifyEnabled(me.data.tool_error_notifications_enabled ?? globalEnabled);
      setRunNotifyEnabled(me.data.run_failure_notifications_enabled ?? globalEnabled);
    }
  }, [
    me.loading,
    me.data,
    me.data?.email_notifications_enabled,
    me.data?.tool_error_notifications_enabled,
    me.data?.run_failure_notifications_enabled,
  ]);

  const handleToggleAllNotifications = async () => {
    if (notifyEnabled === null || notifySavingKey) return;
    const prevGlobal = notifyEnabled;
    const prevTool = toolNotifyEnabled ?? prevGlobal;
    const prevRun = runNotifyEnabled ?? prevGlobal;
    const next = !prevGlobal;
    setNotifyEnabled(next);
    setToolNotifyEnabled(next);
    setRunNotifyEnabled(next);
    setNotifySavingKey("all");
    setNotifyError("");
    try {
      await apiPost("/v1/me/notifications", { email_notifications_enabled: next });
      setRefreshKey((x) => x + 1);
    } catch {
      setNotifyEnabled(prevGlobal);
      setToolNotifyEnabled(prevTool);
      setRunNotifyEnabled(prevRun);
      setNotifyError("Failed to update email alerts. Please try again.");
    } finally {
      setNotifySavingKey(null);
    }
  };

  const handleToggleToolNotifications = async () => {
    if (toolNotifyEnabled === null || notifySavingKey || !notifyEnabled) return;
    const prev = toolNotifyEnabled;
    const next = !prev;
    setToolNotifyEnabled(next);
    setNotifySavingKey("tool");
    setNotifyError("");
    try {
      await apiPost("/v1/me/notifications", { tool_error_notifications_enabled: next });
      setRefreshKey((x) => x + 1);
    } catch {
      setToolNotifyEnabled(prev);
      setNotifyError("Failed to update tool error alerts. Please try again.");
    } finally {
      setNotifySavingKey(null);
    }
  };

  const handleToggleRunNotifications = async () => {
    if (runNotifyEnabled === null || notifySavingKey || !notifyEnabled) return;
    const prev = runNotifyEnabled;
    const next = !prev;
    setRunNotifyEnabled(next);
    setNotifySavingKey("run");
    setNotifyError("");
    try {
      await apiPost("/v1/me/notifications", { run_failure_notifications_enabled: next });
      setRefreshKey((x) => x + 1);
    } catch {
      setRunNotifyEnabled(prev);
      setNotifyError("Failed to update run failure alerts. Please try again.");
    } finally {
      setNotifySavingKey(null);
    }
  };

  const paymentRequired = me.error?.status === 402 || usage.error?.status === 402;
  const rateLimited = me.error?.status === 429 || usage.error?.status === 429;
  const inactive = me.data ? !me.data.is_active : false;
  const isFreePlan = (me.data?.plan ?? "free") === "free";
  const isPaidPlan = !isFreePlan;

  const makeUsageValue = usage.data?.make.usage ?? 0;
  const aiUsageValue = usage.data?.ai?.charged_total_month ?? usage.data?.ai?.usage ?? 0;
  const makeLimitValue = usage.data?.make.limit ?? 0;
  const aiLimitValue = usage.data?.ai?.limit ?? 0;
  const isMakeSoftOverLimit = makeLimitValue > 0 && makeUsageValue > makeLimitValue;
  const isAiSoftOverLimit = aiLimitValue > 0 && aiUsageValue > aiLimitValue;
  const showSoftOverLimitBadge =
    !me.loading && !usage.loading && isPaidPlan && (isMakeSoftOverLimit || isAiSoftOverLimit);

  const globalToggleOn = !!notifyEnabled;
  const toolToggleOn = !!toolNotifyEnabled;
  const runToggleOn = !!runNotifyEnabled;
  const globalToggleDisabled = notifyEnabled === null || notifySavingKey !== null || me.loading;
  const channelToggleDisabled = !notifyEnabled || notifySavingKey !== null || me.loading;
  const initialLoading = (me.loading && !me.data) || (usage.loading && !usage.data);

  if (initialLoading) {
    return <PageSpinner fullScreen label="Loading profile..." />;
  }

  const renderNotifyToggle = (
    label: string,
    on: boolean,
    disabled: boolean,
    saving: boolean,
    onClick: () => void,
  ) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: on ? "#059669" : "#9ca3af" }}>
          {on ? (saving ? "Saving..." : "On") : (saving ? "Saving..." : "Off")}
        </div>
        <button
          onClick={onClick}
          disabled={disabled}
          aria-pressed={on}
          style={{
            width: 44,
            height: 24,
            borderRadius: 999,
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            background: on ? "#111" : "#e5e7eb",
            position: "relative",
            transition: "background 0.2s",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: on ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "white",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              transition: "left 0.2s",
            }}
          />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>Profile</div>
          <div style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
            Account, API key preview, and email alert controls.
          </div>
        </div>
        <Link
          href="/overview"
          style={{
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 700,
            color: "#111",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "8px 12px",
            background: "white",
          }}
        >
          Back to Overview
        </Link>
      </div>

      {paymentRequired ? <UpgradeBanner reason="payment" showButtons={false} /> : null}
      {!paymentRequired && inactive ? <UpgradeBanner reason="inactive" showButtons={false} /> : null}
      {!paymentRequired && !inactive && rateLimited ? <UpgradeBanner reason="rate" showButtons={false} /> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        <section style={{ border: "1px solid #eee", borderRadius: 16, background: "white", padding: 16 }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Plan</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111", textTransform: "capitalize" }}>
            {me.loading ? "Loading..." : me.data?.plan ?? "Free"}
          </div>
          {showSoftOverLimitBadge ? (
            <div
              style={{
                display: "inline-flex",
                marginTop: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid #fcd34d",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Plan limit exceeded, protection still active.
            </div>
          ) : null}

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>API Key Preview</div>
              <code
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  background: "#f3f4f6",
                  padding: "6px 9px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  wordBreak: "break-all",
                }}
              >
                {me.loading ? "········" : me.data?.key_preview ?? "—"}
              </code>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>Account Email</div>
              <div style={{ fontSize: 14, color: "#374151", marginTop: 4, wordBreak: "break-all" }}>
                {me.loading ? "······@······" : me.data?.email ?? "—"}
              </div>
            </div>
          </div>
        </section>

        <section style={{ border: "1px solid #eee", borderRadius: 16, background: "white", padding: 16 }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Email Alerts
          </div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            Monthly 80% usage warnings plus separate alerts for tool errors and run failures.
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {renderNotifyToggle(
              "All Email Alerts",
              globalToggleOn,
              globalToggleDisabled,
              notifySavingKey === "all",
              handleToggleAllNotifications,
            )}
            {renderNotifyToggle(
              "Tool Errors",
              toolToggleOn,
              channelToggleDisabled,
              notifySavingKey === "tool",
              handleToggleToolNotifications,
            )}
            {renderNotifyToggle(
              "Run Failures",
              runToggleOn,
              channelToggleDisabled,
              notifySavingKey === "run",
              handleToggleRunNotifications,
            )}
          </div>

          {!globalToggleOn ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#92400e", fontWeight: 600 }}>
              Channel toggles are paused until &quot;All Email Alerts&quot; is enabled.
            </div>
          ) : null}

          {notifyError ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>
              {notifyError}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

"use client";

import InfoTip from "@/components/InfoTip";
import { EventItem } from "@/lib/hooks";

function formatWhen(e: EventItem) {
  // Use ts (epoch) or first_seen_at / done_at for the timestamp
  const raw = e.ts || e.first_seen_at || e.done_at;
  if (!raw) return "";
  const d = typeof raw === "number" ? new Date(raw * 1000) : new Date(raw);
  return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString();
}

/**
 * Mapping event types for display labels
 */
const TYPE_LABELS: Record<string, string> = {
  duplicate: "Duplicate Blocked",
  over_limit: "Limit Reached",
  locked: "New Lock Created",
  ai_acquired: "AI Lease Acquired",
  ai_in_progress: "AI In Progress",
  ai_completed: "AI Task Completed",
  ai_failed: "AI Task Failed",
  ai_extended: "AI Lease Extended",
  ai_canceled: "AI Canceled",
  ai_over_limit: "AI Limit Reached",
};

export default function EventsList({ items }: { items: EventItem[] }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 16, overflow: "hidden", background: "white" }}>
      {/* --- LIST HEADER --- */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid #eee",
        fontWeight: 800,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span>Latest Activity</span>
        <span style={{
          fontSize: 11,
          color: "#059669",
          background: "#ecfdf5",
          padding: "2px 8px",
          borderRadius: 99,
          fontWeight: 700
        }}>
          LIVE
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#999", fontSize: 14 }}>
          No events found for this period.
        </div>
      ) : (
        items.map((e, idx) => {
          // Determine if this is an AI-related event
          const isAi = !!e.lease_id || e.type.startsWith("ai_");
          const displayType = TYPE_LABELS[e.type] || e.type;

          return (
            <div
              key={`${e.req_id || e.ts}-${idx}`}
              style={{
                padding: "16px",
                borderBottom: idx === items.length - 1 ? "none" : "1px solid #f9f9f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {/* Category Badge */}
                  <span style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    background: isAi ? "#eef2ff" : "#f5f5f5",
                    color: isAi ? "#4f46e5" : "#666",
                    border: `1px solid ${isAi ? "#e0e7ff" : "#eee"}`
                  }}>
                    {isAi ? "AI Agent" : "Automation"}
                  </span>

                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
                    {displayType}
                  </div>
                </div>

                {/* Metadata Row */}
                <div style={{ fontSize: 12, color: "#666", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  {e.key && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "#aaa" }}>key:</span>
                      <code style={{ background: "#f8f8f8", padding: "1px 4px", borderRadius: 4, color: "#444" }}>{e.key}</code>
                    </span>
                  )}

                  {e.req_id && (
                    <span style={{ color: "#999" }}>id:{e.req_id.slice(0, 8)}...</span>
                  )}

                  {e.error_code && (
                    <span style={{ color: "#dc2626", fontWeight: 600 }}>
                      error: {e.error_code}
                    </span>
                  )}

                  {e.charged === 1 && (
                    <span style={{
                      color: "#059669",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3
                    }}>
                      <span style={{ fontSize: 14 }}>•</span> 1 Credit
                    </span>
                  )}
                </div>
              </div>

              {/* Time Column */}
              <div style={{
                whiteSpace: "nowrap",
                fontSize: 12,
                color: "#999",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums"
              }}>
                {formatWhen(e)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

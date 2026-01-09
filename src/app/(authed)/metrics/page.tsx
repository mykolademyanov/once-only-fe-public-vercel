"use client";

import UpgradeBanner from "@/components/UpgradeBanner";
import { useMetrics } from "@/lib/hooks";
import { addDays, toISODate } from "@/lib/date";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const dateStyle = {
  border: "none",
  background: "transparent",
  fontSize: 13,
  padding: "6px 8px",
  outline: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 600
};

export default function MetricsPage() {
  const today = new Date();
  const [fromDay, setFromDay] = useState(toISODate(addDays(today, -13)));
  const [toDay, setToDay] = useState(toISODate(today));

  const metrics = useMetrics(fromDay, toDay);

  // Memoize data to prevent chart flickering during state updates
  const data = useMemo(() => {
    if (!metrics.data) return [];
    return metrics.data;
  }, [metrics.data]);

  const isEmpty = data.length === 0 && !metrics.loading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>Metrics</div>
          <div style={{ color: "#666", fontSize: 14, marginTop: 4 }}>Performance and usage trends for your keys.</div>
        </div>

        {/* DATE PICKER */}
        <div style={{
          display: "flex",
          gap: 4,
          background: "#f5f5f5",
          padding: "4px 8px",
          borderRadius: 12,
          alignItems: "center",
          border: "1px solid #eee"
        }}>
           <input type="date" value={fromDay} onChange={e => setFromDay(e.target.value)} style={dateStyle} />
           <span style={{ color: "#aaa", fontWeight: 900 }}>→</span>
           <input type="date" value={toDay} onChange={e => setToDay(e.target.value)} style={dateStyle} />
        </div>
      </div>

      {/* ERROR HANDLING */}
      {metrics.error?.status === 402 && <UpgradeBanner reason="payment" />}

      {/* CHART CONTAINER */}
      <div style={{
        border: "1px solid #eee",
        borderRadius: 20,
        padding: "32px 16px 16px 16px",
        background: "white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        position: "relative",
        minHeight: 450
      }}>
        {/* LOADING STATE OVERLAY */}
        {metrics.loading && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#999", fontSize: 14, fontWeight: 500, zIndex: 1 }}>
            Loading charts...
          </div>
        )}

        {/* EMPTY STATE OVERLAY */}
        {isEmpty && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#999", fontSize: 14, zIndex: 1 }}>
            No data for this period.
          </div>
        )}

        <div style={{ width: "100%", height: 400, opacity: metrics.loading ? 0.3 : 1, transition: "opacity 0.2s" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{fontSize: 11, fill: "#999", fontWeight: 500}}
                dy={12}
                // Show dates selectively if the dataset is large
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{fontSize: 11, fill: "#999", fontWeight: 500}}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  fontSize: 13,
                  fontWeight: 600
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{paddingBottom: 30, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em"}}
              />

              {/* Automation Traffic - BLACK */}
              <Line
                name="Automation"
                type="monotone"
                dataKey="checks_total"
                stroke="#111"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />

              {/* AI Agent Traffic - INDIGO */}
              <Line
                name="AI Agent Runs"
                type="monotone"
                dataKey="ai_acquired"
                stroke="#4f46e5"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />

              {/* Blocked Duplicates - DASHED GRAY */}
              <Line
                name="Blocked"
                type="monotone"
                dataKey="duplicates_blocked"
                stroke="#cbd5e1"
                strokeDasharray="6 6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

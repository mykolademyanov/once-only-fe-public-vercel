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

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ border: "1px solid #ddd", borderRadius: 12, padding: "8px 10px", fontSize: 14 }}
    />
  );
}

export default function MetricsPage() {
  const today = new Date();
  const defaultFrom = toISODate(addDays(today, -13)); // 14 days inclusive feel
  const defaultTo = toISODate(today);

  const [fromDay, setFromDay] = useState(defaultFrom);
  const [toDay, setToDay] = useState(defaultTo);

  const metrics = useMetrics(fromDay, toDay);

  const paymentRequired = metrics.error?.status === 402;
  const rateLimited = metrics.error?.status === 429;

  const data = useMemo(() => metrics.data ?? [], [metrics.data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>Metrics</div>
        <div style={{ color: "#555", marginTop: 6, fontSize: 14 }}>Daily counters (select range).</div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#555" }}>From</span>
        <DateInput value={fromDay} onChange={setFromDay} />
        <span style={{ fontSize: 13, color: "#555" }}>To</span>
        <DateInput value={toDay} onChange={setToDay} />
      </div>

      {paymentRequired ? <UpgradeBanner reason="payment" /> : null}
      {rateLimited ? <UpgradeBanner reason="rate" /> : null}

      <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
        {metrics.loading ? (
          <div style={{ color: "#555" }}>Loading metrics…</div>
        ) : metrics.data ? (
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="checks_total" dot={false} />
                <Line type="monotone" dataKey="duplicates_blocked" dot={false} />
                <Line type="monotone" dataKey="rate_limited" dot={false} />
                <Line type="monotone" dataKey="locks_created" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ color: "#555" }}>No metrics data.</div>
        )}
      </div>
    </div>
  );
}

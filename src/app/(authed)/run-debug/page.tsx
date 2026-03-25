"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";

type RunTimelineEvent = {
  id: number;
  run_id: string;
  ts: number;
  type: string;
  status?: string | null;
  duration_ms?: number | null;
  step?: string | null;
  tool?: string | null;
  req_id?: string | null;
  lease_id?: string | null;
  agent_id?: string | null;
  message?: string | null;
  data?: Record<string, unknown> | null;
};

type RunTimelineResp = {
  run_id: string;
  total: number;
  events: RunTimelineEvent[];
};

function formatTs(ts?: number | null) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
}

export default function RunDebugPage() {
  const params = useSearchParams();
  const runIdFromQuery = (params.get("run_id") || "").trim();

  const [runIdInput, setRunIdInput] = useState(runIdFromQuery);
  const [runLookupLoading, setRunLookupLoading] = useState(false);
  const [runLookupError, setRunLookupError] = useState("");
  const [timeline, setTimeline] = useState<RunTimelineResp | null>(null);

  useEffect(() => {
    setRunIdInput(runIdFromQuery);
    if (runIdFromQuery) {
      void lookupRunTimeline(runIdFromQuery);
    } else {
      setTimeline(null);
      setRunLookupError("");
    }
  }, [runIdFromQuery]);

  async function lookupRunTimeline(runIdRaw: string) {
    const runId = runIdRaw.trim();
    if (!runId) {
      setRunLookupError("Enter run_id first.");
      setTimeline(null);
      return;
    }
    setRunLookupLoading(true);
    setRunLookupError("");
    try {
      const data = await apiGet<RunTimelineResp>(`/v1/runs/${encodeURIComponent(runId)}?limit=500`);
      setTimeline(data);
      setRunIdInput(runId);
      if (!data.events.length) {
        setRunLookupError("Run found, but timeline is empty.");
      }
    } catch {
      setTimeline(null);
      setRunLookupError("Failed to load run timeline. Check run_id and try again.");
    } finally {
      setRunLookupLoading(false);
    }
  }

  function onRunSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void lookupRunTimeline(runIdInput);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>Run Debug</div>
        <div style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
          Inspect full run timeline: steps, tool calls, results, and final status.
        </div>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 16, background: "white", padding: 16 }}>
        <form onSubmit={onRunSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={runIdInput}
            onChange={(e) => setRunIdInput(e.target.value)}
            placeholder="run_123"
            style={{
              flex: "1 1 300px",
              minWidth: 240,
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            disabled={runLookupLoading}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              fontWeight: 700,
              cursor: runLookupLoading ? "default" : "pointer",
              opacity: runLookupLoading ? 0.7 : 1,
            }}
          >
            {runLookupLoading ? "Loading..." : "Load Timeline"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimeline(null);
              setRunLookupError("");
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              color: "#333",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </form>

        {runLookupError ? (
          <div style={{ marginTop: 10, color: "#b00020", fontSize: 13 }}>{runLookupError}</div>
        ) : null}
      </div>

      {timeline ? (
        <div style={{ border: "1px solid #eee", borderRadius: 16, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #f0f0f0", background: "#fafafa", fontSize: 13 }}>
            <b>run_id:</b> <code>{timeline.run_id}</code> · <b>events:</b> {timeline.total}
          </div>
          <div style={{ maxHeight: 600, overflow: "auto" }}>
            {timeline.events.map((event, idx) => (
              <div
                key={`${event.id}-${idx}`}
                style={{
                  padding: "12px 14px",
                  borderBottom: idx === timeline.events.length - 1 ? "none" : "1px solid #f6f6f6",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#111", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span>{idx + 1}.</span>
                    <span>{event.type}</span>
                    {event.tool ? <span style={{ color: "#555" }}>→ {event.tool}</span> : null}
                    {event.status ? <span style={{ color: "#4f46e5", fontWeight: 600 }}>[{event.status}]</span> : null}
                    {typeof event.duration_ms === "number" ? <span style={{ color: "#777" }}>({event.duration_ms}ms)</span> : null}
                  </div>
                  {event.message ? <div style={{ marginTop: 4, color: "#555", fontSize: 12 }}>{event.message}</div> : null}
                </div>
                <div style={{ whiteSpace: "nowrap", color: "#999", fontSize: 12 }}>{formatTs(event.ts)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ border: "1px dashed #ddd", borderRadius: 16, padding: 18, color: "#666", background: "#fff" }}>
          Enter <code>run_id</code> and click <b>Load Timeline</b>.
        </div>
      )}
    </div>
  );
}

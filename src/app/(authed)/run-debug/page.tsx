"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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

type RunListItem = {
  run_id: string;
  last_ts: number;
  last_type?: string | null;
  last_status?: string | null;
  events_count: number;
};

type RunListResp = {
  total: number;
  items: RunListItem[];
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
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState("");
  const [runs, setRuns] = useState<RunListItem[]>([]);

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    setRunsError("");
    try {
      const data = await apiGet<RunListResp>("/v1/runs?limit=100");
      setRuns(data.items || []);
    } catch {
      setRunsError("Failed to load recent runs.");
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const lookupRunTimeline = useCallback(async (runIdRaw: string) => {
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
      await loadRuns();
    } catch {
      setTimeline(null);
      setRunLookupError("Failed to load run timeline. Check run_id and try again.");
    } finally {
      setRunLookupLoading(false);
    }
  }, [loadRuns]);

  useEffect(() => {
    setRunIdInput(runIdFromQuery);
    if (runIdFromQuery) {
      void lookupRunTimeline(runIdFromQuery);
    } else {
      setTimeline(null);
      setRunLookupError("");
    }
  }, [runIdFromQuery, lookupRunTimeline]);

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

      <div style={{ border: "1px solid #eee", borderRadius: 16, background: "white", overflow: "hidden" }}>
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid #f0f0f0",
            background: "#fafafa",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800 }}>Recent Runs</div>
          <button
            type="button"
            onClick={() => void loadRuns()}
            disabled={runsLoading}
            style={{
              border: "1px solid #ddd",
              background: "white",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              cursor: runsLoading ? "default" : "pointer",
              opacity: runsLoading ? 0.7 : 1,
            }}
          >
            {runsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {runsError ? (
          <div style={{ padding: 12, color: "#b00020", fontSize: 13 }}>{runsError}</div>
        ) : null}
        {runs.length === 0 ? (
          <div style={{ padding: 14, color: "#666", fontSize: 13 }}>{runsLoading ? "Loading runs..." : "No runs yet."}</div>
        ) : (
          <div style={{ maxHeight: 260, overflow: "auto" }}>
            {runs.map((run, idx) => {
              const s = (run.last_status || "").toLowerCase();
              const isError = s === "failed" || s === "blocked" || s === "error";
              return (
                <button
                  key={`${run.run_id}-${idx}`}
                  onClick={() => {
                    setRunIdInput(run.run_id);
                    void lookupRunTimeline(run.run_id);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    borderBottom: idx === runs.length - 1 ? "none" : "1px solid #f5f5f5",
                    background: "white",
                    padding: "10px 12px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#111", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <code>{run.run_id}</code>
                      {run.last_status ? (
                        <span
                          style={{
                            color: isError ? "#a23d3d" : "#4f46e5",
                            background: isError ? "#fdecec" : "#eef2ff",
                            padding: "1px 6px",
                            borderRadius: 999,
                            fontWeight: 600,
                          }}
                        >
                          {run.last_status}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ marginTop: 3, color: "#777", fontSize: 12 }}>
                      {run.last_type || "—"} · {run.events_count} events
                    </div>
                  </div>
                  <div style={{ color: "#999", fontSize: 12, whiteSpace: "nowrap" }}>{formatTs(run.last_ts)}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {timeline ? (
        <div style={{ border: "1px solid #eee", borderRadius: 16, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #f0f0f0", background: "#fafafa", fontSize: 13 }}>
            <b>run_id:</b> <code>{timeline.run_id}</code> · <b>events:</b> {timeline.total}
          </div>
          <div style={{ maxHeight: 600, overflow: "auto" }}>
            {timeline.events.map((event, idx) => (
              (() => {
                const statusNorm = (event.status || "").toLowerCase();
                const typeNorm = (event.type || "").toLowerCase();
                const isError =
                  statusNorm === "failed" ||
                  statusNorm === "error" ||
                  statusNorm === "blocked" ||
                  typeNorm.includes("failed") ||
                  typeNorm.includes("error");

                return (
              <div
                key={`${event.id}-${idx}`}
                style={{
                  padding: "12px 14px",
                  borderBottom: idx === timeline.events.length - 1 ? "none" : "1px solid #f6f6f6",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  background: isError ? "#fff7f7" : "white",
                  borderLeft: isError ? "3px solid #efc9c9" : "3px solid transparent",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#111", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span>{idx + 1}.</span>
                    <span>{event.type}</span>
                    {event.tool ? <span style={{ color: "#555" }}>→ {event.tool}</span> : null}
                    {event.status ? (
                      <span
                        style={{
                          color: isError ? "#a23d3d" : "#4f46e5",
                          background: isError ? "#fdecec" : "#eef2ff",
                          padding: "1px 6px",
                          borderRadius: 999,
                          fontWeight: 600,
                        }}
                      >
                        [{event.status}]
                      </span>
                    ) : null}
                    {typeof event.duration_ms === "number" ? <span style={{ color: "#777" }}>({event.duration_ms}ms)</span> : null}
                  </div>
                  {event.message ? (
                    <div style={{ marginTop: 4, color: isError ? "#7d3a3a" : "#555", fontSize: 12 }}>
                      {event.message}
                    </div>
                  ) : null}
                </div>
                <div style={{ whiteSpace: "nowrap", color: "#999", fontSize: 12 }}>{formatTs(event.ts)}</div>
              </div>
                );
              })()
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

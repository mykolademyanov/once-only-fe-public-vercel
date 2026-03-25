"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import EventsList from "@/components/EventsList";
import UpgradeBanner from "@/components/UpgradeBanner";
import { apiGet } from "@/lib/api";
import { useEvents, EventItem } from "@/lib/hooks";

const PAGE_SIZE = 50;

function eventKey(e: EventItem): string {
  if (e.req_id) return e.req_id;
  return `${e.ts}|${e.type}|${e.key ?? ""}|${e.lease_id ?? ""}|${e.result_hash ?? ""}|${e.error_code ?? ""}`;
}

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

export default function EventsPage() {
  const events = useEvents(PAGE_SIZE, 7000);
  const [extra, setExtra] = useState<EventItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [runIdInput, setRunIdInput] = useState("");
  const [runLookupLoading, setRunLookupLoading] = useState(false);
  const [runLookupError, setRunLookupError] = useState("");
  const [timeline, setTimeline] = useState<RunTimelineResp | null>(null);

  useEffect(() => {
    if (events.data && events.data.length < PAGE_SIZE && extra.length === 0) {
      setHasMore(false);
    }
  }, [events.data, events.data?.length, extra.length]);

  const combined = useMemo(() => {
    const base = events.data ?? [];
    const seen = new Set<string>();
    const out: EventItem[] = [];

    for (const item of base) {
      const k = eventKey(item);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(item);
      }
    }
    for (const item of extra) {
      const k = eventKey(item);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(item);
      }
    }
    return out;
  }, [events.data, extra]);

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
      const data = await apiGet<RunTimelineResp>(`/v1/runs/${encodeURIComponent(runId)}?limit=200`);
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

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadError("");
    try {
      const offset = (events.data?.length ?? 0) + extra.length;
      const data = await apiGet<EventItem[]>(`/v1/events?limit=${PAGE_SIZE}&offset=${offset}`);
      if (data.length < PAGE_SIZE) setHasMore(false);

      const existing = new Set(combined.map(eventKey));
      const fresh = data.filter((item) => !existing.has(eventKey(item)));
      setExtra((prev) => [...prev, ...fresh]);
    } catch {
      setLoadError("Failed to load more events. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const paymentRequired = events.error?.status === 402;
  const rateLimited = events.error?.status === 429;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>Events</div>
        <div style={{ color: "#555", marginTop: 6, fontSize: 14 }}>Auto-refresh every ~7s.</div>
      </div>

      {paymentRequired ? <UpgradeBanner reason="payment" /> : null}
      {rateLimited ? <UpgradeBanner reason="rate" /> : null}

      <div style={{ border: "1px solid #eee", borderRadius: 16, background: "white", padding: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Run Debug (timeline)</div>
        <div style={{ color: "#666", fontSize: 13, marginBottom: 12 }}>
          Enter a <code>run_id</code> to inspect agent steps, tool calls, and final status.
        </div>
        <form onSubmit={onRunSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={runIdInput}
            onChange={(e) => setRunIdInput(e.target.value)}
            placeholder="run_123"
            style={{
              flex: "1 1 260px",
              minWidth: 220,
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
            {runLookupLoading ? "Loading..." : "Open Run"}
          </button>
          {timeline ? (
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
          ) : null}
        </form>

        {runLookupError ? (
          <div style={{ marginTop: 10, color: "#b00020", fontSize: 13 }}>{runLookupError}</div>
        ) : null}

        {timeline ? (
          <div style={{ marginTop: 14, border: "1px solid #f0f0f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #f0f0f0", background: "#fafafa", fontSize: 13 }}>
              <b>run_id:</b> <code>{timeline.run_id}</code> · <b>events:</b> {timeline.total}
            </div>
            <div style={{ maxHeight: 320, overflow: "auto" }}>
              {timeline.events.map((event, idx) => (
                <div
                  key={`${event.id}-${idx}`}
                  style={{
                    padding: "10px 12px",
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
                      {event.status ? (
                        <span style={{ color: "#4f46e5", fontWeight: 600 }}>[{event.status}]</span>
                      ) : null}
                      {typeof event.duration_ms === "number" ? (
                        <span style={{ color: "#777" }}>({event.duration_ms}ms)</span>
                      ) : null}
                    </div>
                    {event.message ? (
                      <div style={{ marginTop: 4, color: "#555", fontSize: 12 }}>{event.message}</div>
                    ) : null}
                  </div>
                  <div style={{ whiteSpace: "nowrap", color: "#999", fontSize: 12 }}>{formatTs(event.ts)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {combined.length > 0 ? (
        <EventsList items={combined} />
      ) : (
        <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16, color: "#555" }}>
          {events.loading ? "Loading events…" : "No events data."}
        </div>
      )}

      {loadError ? (
        <div style={{ color: "#b00020", fontSize: 13 }}>{loadError}</div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={loadMore}
          disabled={loadingMore || !hasMore || events.loading}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #111",
            background: hasMore ? "#111" : "#eee",
            color: hasMore ? "white" : "#777",
            fontWeight: 700,
            cursor: loadingMore || !hasMore ? "default" : "pointer",
            opacity: loadingMore ? 0.7 : 1,
          }}
        >
          {loadingMore ? "Loading..." : hasMore ? "Load more" : "No more events"}
        </button>
      </div>
    </div>
  );
}

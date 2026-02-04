"use client";

import { useEffect, useMemo, useState } from "react";
import EventsList from "@/components/EventsList";
import UpgradeBanner from "@/components/UpgradeBanner";
import { apiGet } from "@/lib/api";
import { useEvents, EventItem } from "@/lib/hooks";

const PAGE_SIZE = 50;

function eventKey(e: EventItem): string {
  if (e.req_id) return e.req_id;
  return `${e.ts}|${e.type}|${e.key ?? ""}|${e.lease_id ?? ""}|${e.result_hash ?? ""}|${e.error_code ?? ""}`;
}

export default function EventsPage() {
  const events = useEvents(PAGE_SIZE, 7000);
  const [extra, setExtra] = useState<EventItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (events.data && events.data.length < PAGE_SIZE && extra.length === 0) {
      setHasMore(false);
    }
  }, [events.data?.length, extra.length]);

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
    } catch (e) {
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

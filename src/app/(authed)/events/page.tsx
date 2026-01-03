"use client";

import EventsList from "@/components/EventsList";
import UpgradeBanner from "@/components/UpgradeBanner";
import { useEvents } from "@/lib/hooks";

export default function EventsPage() {
  const events = useEvents(50, 7000);

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

      {events.data ? (
        <EventsList items={events.data} />
      ) : (
        <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16, color: "#555" }}>
          {events.loading ? "Loading events…" : "No events data."}
        </div>
      )}
    </div>
  );
}

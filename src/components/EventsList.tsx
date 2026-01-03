import { EventItem } from "@/lib/hooks";

function formatWhen(e: EventItem) {
  const raw = e.ts || e.created_at;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

export default function EventsList({ items }: { items: EventItem[] }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 800 }}>Latest events</div>
      <div>
        {items.length === 0 ? (
          <div style={{ padding: 16, color: "#555" }}>No events yet.</div>
        ) : (
          items.map((e, idx) => (
            <div
              key={e.id ?? `${e.type}-${idx}`}
              style={{
                padding: 12,
                borderBottom: idx === items.length - 1 ? "none" : "1px solid #f0f0f0",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>
                  {e.type === "duplicate" ? "duplicate" : e.type === "over_limit" ? "over_limit" : e.type}
                </div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 4, wordBreak: "break-word" }}>
                  {e.method ? `${e.method} ` : ""}
                  {e.path ?? ""}
                  {e.dedupe_key ? ` • key=${e.dedupe_key}` : ""}
                  {e.request_id ? ` • req=${e.request_id}` : ""}
                </div>
              </div>
              <div style={{ whiteSpace: "nowrap", fontSize: 13, color: "#666" }}>{formatWhen(e)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

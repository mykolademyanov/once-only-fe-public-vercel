"use client";

export default function ProgressBar({
  value,
  max,
  color = "#111",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  // Calculate percentage with bounds restricted between 0 and 100
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div style={{ width: "100%" }}>
      {/* Metrics labels above the bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          fontWeight: 600,
          color: "#666",
          marginBottom: 8,
        }}
      >
        <span>{value.toLocaleString()} used</span>
        <span>{max.toLocaleString()} limit</span>
      </div>

      {/* Progress bar background container */}
      <div
        style={{
          height: 10,
          background: "#f0f0f0",
          borderRadius: 999,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Filled portion of the bar */}
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 999,
            // Smooth transition animation for value changes
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {/* Percentage indicator for better UX */}
      <div style={{ textAlign: "right", marginTop: 4, fontSize: 10, color: "#999", fontWeight: 700 }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}

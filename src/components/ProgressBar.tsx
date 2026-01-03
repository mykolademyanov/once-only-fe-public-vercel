export default function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444" }}>
        <span>{value.toLocaleString()} used</span>
        <span>{max.toLocaleString()} limit</span>
      </div>
      <div style={{ height: 10, background: "#f2f2f2", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
        <div style={{ height: 10, width: `${pct}%`, background: "#111" }} />
      </div>
    </div>
  );
}

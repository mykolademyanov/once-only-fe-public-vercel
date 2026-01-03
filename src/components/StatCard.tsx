export default function StatCard({
  label,
  value,
  sub,
}: {
  label: React.ReactNode;
  value: string | number;
  sub?: string;
}) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 13, color: "#555" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
      {sub ? <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

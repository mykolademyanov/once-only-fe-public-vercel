type PageSpinnerProps = {
  label?: string;
  size?: number;
  fullScreen?: boolean;
};

export default function PageSpinner({ label = "Loading...", size = 18, fullScreen = false }: PageSpinnerProps) {
  const body = (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span
        className="page-spinner-ring"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "2px solid #d1d5db",
          borderTopColor: "#111",
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 13, color: "#4b5563", fontWeight: 600 }}>{label}</span>
    </div>
  );

  if (!fullScreen) return body;

  return (
    <div
      style={{
        minHeight: "40vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      {body}
    </div>
  );
}

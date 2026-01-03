"use client";

import { useState } from "react";

export default function InfoTip({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span>{label}</span>

      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          border: "1px solid #ddd",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: "#555",
          cursor: "help",
          userSelect: "none",
        }}
        aria-label="info"
      >
        i
      </span>

      {open ? (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 50,
            width: 280,
            padding: 10,
            borderRadius: 12,
            border: "1px solid #eee",
            background: "white",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            fontSize: 13,
            color: "#333",
            lineHeight: 1.35,
          }}
        >
          {description}
        </div>
      ) : null}
    </span>
  );
}

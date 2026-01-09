"use client";

import React from "react";

export default function StatCard({
  label,
  value,
  sub,
  color = "#000", // Default color is set to black
}: {
  label: React.ReactNode;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 16,
        background: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: 100,
        // Adding a subtle shadow for depth
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
      }}
    >
      {/* Label section */}
      <div style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>
        {label}
      </div>

      {/* Primary Value section */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          marginTop: 4,
          color: color, // Applying custom color here
          letterSpacing: "-0.02em"
        }}
      >
        {value}
      </div>

      {/* Optional Subtext section */}
      {sub ? (
        <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

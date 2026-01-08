"use client";

import React from "react";

export default function StatCard({
  label,
  value,
  sub,
  color = "#000", // Додаємо колір за замовчуванням (чорний)
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
        // Додаємо легку тінь для об'єму
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
      }}
    >
      {/* Мітка (Label) */}
      <div style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>
        {label}
      </div>

      {/* Значення (Value) */}
      <div 
        style={{ 
          fontSize: 28, 
          fontWeight: 900, 
          marginTop: 4,
          color: color, // Використовуємо кастомний колір тут
          letterSpacing: "-0.02em"
        }}
      >
        {value}
      </div>

      {/* Додаткова інформація (Sub) */}
      {sub ? (
        <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

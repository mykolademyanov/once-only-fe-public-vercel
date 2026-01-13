"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost, ApiError } from "@/lib/api";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValidEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setErr("Please enter a valid email address.");
      return;
    }

    setErr(null);
    setBusy(true);

    try {
      await apiPost("/v1/recover", { email });
      setSuccess(true);
    } catch (e) {
      const ae = e instanceof ApiError ? e : null;
      if (ae?.status === 429) {
        setErr("Too many attempts. Please wait a few minutes.");
      } else {
        setErr("Failed to process recovery. Check email or try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>📬</div>
        <div style={{ fontWeight: 900, fontSize: 24, marginTop: 16 }}>Check your email</div>
        <div style={{ color: "#555", marginTop: 12, lineHeight: 1.5 }}>
          If an account exists for <strong>{email}</strong>, we've sent instructions to recover your API key.
        </div>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            marginTop: 24,
            color: "#111",
            fontWeight: 600,
            textDecoration: "underline"
          }}
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 16px" }}>
      <Link href="/login" style={{ fontSize: 13, color: "#666", textDecoration: "none" }}>
        ← Back
      </Link>

      <div style={{ fontWeight: 900, fontSize: 28, marginTop: 16 }}>Recover API Key</div>
      <div style={{ color: "#555", marginTop: 8 }}>
        Enter your email address to receive a new API key.
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 20 }}>
        <label style={{ display: "block", fontSize: 13, color: "#444", marginBottom: 6 }}>
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          style={{
            width: "100%",
            padding: "12px 12px",
            borderRadius: 12,
            border: "1px solid #ddd",
            outline: "none",
            fontSize: 14,
          }}
        />

        <button
          disabled={busy || !email}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "12px 12px",
            borderRadius: 12,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            fontWeight: 800,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Sending..." : "Send Recovery Email"}
        </button>
      </form>

      {err ? (
        <div style={{ marginTop: 12, color: "#b00020", fontSize: 14 }}>
          {err}
        </div>
      ) : null}
    </div>
  );
}
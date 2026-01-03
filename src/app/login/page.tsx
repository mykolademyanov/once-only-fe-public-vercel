"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiKey, setApiKey } from "@/lib/auth";
import { apiGet, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const existing = getApiKey();
    if (existing) router.replace("/overview");
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      setApiKey(key);
      // quick verify
      await apiGet("/v1/me");
      router.replace("/overview");
    } catch (e) {
      const ae = e instanceof ApiError ? e : null;
      setErr(ae?.status === 401 ? "Invalid API key (401)" : "Login failed. Check API base + key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 16px" }}>
      <div style={{ fontWeight: 900, fontSize: 28 }}>OnceOnly</div>
      <div style={{ color: "#555", marginTop: 8 }}>Enter your API key to continue.</div>

      <form onSubmit={onSubmit} style={{ marginTop: 20 }}>
        <label style={{ display: "block", fontSize: 13, color: "#444", marginBottom: 6 }}>API key</label>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="oo_live_..."
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
          disabled={busy || key.trim().length < 8}
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
          {busy ? "Checking..." : "Save & Continue"}
        </button>
      </form>

      {err ? <div style={{ marginTop: 12, color: "#b00020", fontSize: 14 }}>{err}</div> : null}

      <div style={{ marginTop: 16, fontSize: 12, color: "#777" }}>
        Stored in <code>localStorage</code> (MVP). No cookies, no OAuth.
      </div>
    </div>
  );
}

import { clearApiKey, getApiKey } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export type ApiErrorCode = "UNAUTHORIZED" | "PAYMENT_REQUIRED" | "RATE_LIMITED" | "UNKNOWN";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  body?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

function inferCode(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 402) return "PAYMENT_REQUIRED";
  if (status === 429) return "RATE_LIMITED";
  return "UNKNOWN";
}

export async function apiGet<T>(path: string): Promise<T> {
  if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE");

  const key = getApiKey();
  if (!key) throw new ApiError(401, "UNAUTHORIZED", "Missing API key");

  const res = await fetch(`/api/proxy${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    // dashboard => no need cache
    cache: "no-store",
  });

  let body: unknown = undefined;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
  } else {
    try {
      body = await res.text();
    } catch {
      body = undefined;
    }
  }

  if (!res.ok) {
    const code = inferCode(res.status);

    // UX: auto-logout on 401
    if (res.status === 401 && typeof window !== "undefined") {
      clearApiKey();
    }

    throw new ApiError(res.status, code, `API error ${res.status} on ${path}`, body);
  }

  return body as T;
}

export async function getUpgradeUrl(plan: "starter" | "pro" | "agency") {
  return apiGet<{ url: string }>(`/v1/billing/paypro/checkout-url?plan=${plan}`);
}

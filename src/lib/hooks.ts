"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, ApiError } from "./api";

/* ---------- TYPES ---------- */

export type Plan = string;

export type Me = {
  plan: Plan;
  key_preview: string;
  is_active: boolean;
  current_period_end: string | null;
  requests_total_all_time?: number;
  blocked_total_all_time?: number;
  email_notifications_enabled?: boolean;
};

// New structure for split usage
export type UsageKind = {
  usage: number;
  limit: number;
  requests_total_month: number;
  blocked_total_month: number;
  charged_total_month?: number;
  polling_total_month?: number;
};

export type UsageAll = {
  plan: Plan;
  month: string;
  make: UsageKind; // Automation (Make/Zapier)
  ai: UsageKind;   // AI Agents
};

export type EventItem = {
  id?: string;
  ts: number;
  type: string;
  req_id?: string;
  key?: string;
  first_seen_at?: string;
  plan?: string | null;
  usage?: number | null;
  limit?: number | null;
  charged?: number;     // 1|0
  version?: number;
  lease_id?: string;    // Presence of this field indicates an AI event
  done_at?: string;
  result_hash?: string;
  error_code?: string;
};

export type MetricsRow = {
  day: string; // YYYY-MM-DD
  checks_total: number;
  locks_created: number;
  duplicates_blocked: number;
  rate_limited: number;
  // New fields for AI metrics
  ai_acquired?: number;
  ai_completed?: number;
  ai_failed?: number;
};

// Tools & Policies
export type ToolListItem = {
  name: string;
  scope_id: string;
  url: string;
  enabled: boolean;
  timeout_ms: number;
  max_retries: number;
  description?: string | null;
  has_secret: boolean;
  secret_id?: string | null;
  secret_mask?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ToolCreatePayload = {
  name: string;
  url: string;
  scope_id?: string;
  auth: {
    type: "hmac_sha256";
    secret?: string;
  };
  timeout_ms?: number;
  max_retries?: number;
  enabled?: boolean;
  description?: string;
};

export type ToolResp = {
  name: string;
  url: string;
  scope_id: string;
  enabled: boolean;
  timeout_ms: number;
  max_retries: number;
  description?: string | null;
  has_secret: boolean;
  secret_id?: string | null;
  secret_mask?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PolicyResp = {
  agent_id: string;
  policy: Record<string, any>;
};

export type PolicyUpsertPayload = {
  agent_id: string;
  max_actions_per_hour?: number;
  max_spend_usd_per_day?: number;
  max_calls_per_tool?: Record<string, number>;
  allowed_tools?: string[];
  blocked_tools?: string[];
  pricing_rules?: Array<{
    tool: string;
    price_usd: number;
  }>;
};

type State<T> = {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
};

function normalizeApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError(0, "UNKNOWN", "Unknown error", e);
}

/* ---------- HOOKS ---------- */

export function useMe(refreshKey = 0) {
  const [st, setSt] = useState<State<Me>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    apiGet<Me>("/v1/me")
      .then((data) => alive && setSt({ data, loading: false, error: null }))
      .catch((e) => alive && setSt({ data: null, loading: false, error: normalizeApiError(e) }));
    return () => { alive = false; };
  }, [refreshKey]);

  return st;
}

/**
 * Updated hook for retrieving all limits (Make + AI)
 */
export function useUsage(refreshKey = 0) {
  const [st, setSt] = useState<State<UsageAll>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    // Calling the new /all endpoint
    apiGet<UsageAll>("/v1/usage/all")
      .then((data) => alive && setSt({ data, loading: false, error: null }))
      .catch((e) => alive && setSt({ data: null, loading: false, error: normalizeApiError(e) }));
    return () => { alive = false; };
  }, [refreshKey]);

  return st;
}

export function useEvents(limit = 50, pollMs = 7000) {
  const [st, setSt] = useState<State<EventItem[]>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;

    async function load(isInitial: boolean) {
      if (isInitial) setSt((x) => ({ ...x, loading: true, error: null }));
      try {
        const data = await apiGet<EventItem[]>(`/v1/events?limit=${limit}`);
        if (!alive) return;
        setSt({ data, loading: false, error: null });
      } catch (e) {
        if (!alive) return;
        setSt((prev) => ({ data: prev.data, loading: false, error: normalizeApiError(e) }));
      }
    }

    load(true);
    const id = window.setInterval(() => load(false), pollMs);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [limit, pollMs]);

  return useMemo(() => st, [st]);
}

export function useMetrics(fromDay: string, toDay: string, refreshKey = 0) {
  const [st, setSt] = useState<State<MetricsRow[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    setSt((x) => ({ ...x, loading: true, error: null }));
    apiGet<MetricsRow[]>(`/v1/metrics?from_day=${fromDay}&to_day=${toDay}`)
      .then((data) => alive && setSt({ data, loading: false, error: null }))
      .catch((e) => alive && setSt({ data: null, loading: false, error: normalizeApiError(e) }));
    return () => { alive = false; };
  }, [fromDay, toDay, refreshKey]);

  return st;
}

// ==================== TOOLS HOOKS ====================

export function useToolsList(scopeId = "global", refreshKey = 0) {
  const [st, setSt] = useState<State<ToolListItem[]>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    apiGet<ToolListItem[]>(`/v1/tools?scope_id=${encodeURIComponent(scopeId)}`)
      .then((data) => alive && setSt({ data, loading: false, error: null }))
      .catch((e) => alive && setSt({ data: null, loading: false, error: normalizeApiError(e) }));
    return () => { alive = false; };
  }, [scopeId, refreshKey]);

  return st;
}

export function useToolsGroupedByScope(refreshKey = 0) {
  const [st, setSt] = useState<State<Record<string, ToolListItem[]>>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let alive = true;

    // Fetch all tools across scopes
    apiGet<ToolListItem[]>("/v1/tools?scope_id=all")
      .then(async (allTools) => {
        if (!alive) return;

        const grouped: Record<string, ToolListItem[]> = {};

        allTools.forEach(tool => {
          const scopeId = tool.scope_id || "global";
          if (!grouped[scopeId]) grouped[scopeId] = [];
          grouped[scopeId].push(tool);
        });

        setSt({ data: grouped, loading: false, error: null });
      })
      .catch((e) => alive && setSt({ data: null, loading: false, error: normalizeApiError(e) }));

    return () => { alive = false; };
  }, [refreshKey]);

  return st;
}

// ==================== POLICIES HOOKS ====================

export function usePolicy(agentId: string, refreshKey = 0) {
  const [st, setSt] = useState<State<PolicyResp>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    apiGet<PolicyResp>(`/v1/policies/${encodeURIComponent(agentId)}`)
      .then((data) => alive && setSt({ data, loading: false, error: null }))
      .catch((e) => alive && setSt({ data: null, loading: false, error: normalizeApiError(e) }));
    return () => { alive = false; };
  }, [agentId, refreshKey]);

  return st;
}

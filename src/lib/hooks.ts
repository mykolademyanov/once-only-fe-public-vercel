"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, ApiError } from "./api";

export type Plan = "free" | "starter" | "pro" | "business" | string;

export type Me = {
  plan: Plan;
  key_preview: string;
  is_active: boolean;
  current_period_end: string | null;
};

export type Usage = {
  plan: Plan;
  month: string;
  usage: number;
  limit: number;
};

export type EventItem = {
  id?: string;
  type: "duplicate" | "over_limit" | string;
  ts?: string;
  created_at?: string;
  request_id?: string;
  dedupe_key?: string;
  path?: string;
  method?: string;
  meta?: Record<string, unknown>;
};

export type MetricsRow = {
  day: string; // YYYY-MM-DD
  checks_total: number;
  locks_created: number;
  duplicates_blocked: number;
  rate_limited: number;
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

export function useMe() {
  const [st, setSt] = useState<State<Me>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    setSt((x) => ({ ...x, loading: true, error: null }));
    apiGet<Me>("/v1/me")
      .then((data) => alive && setSt({ data, loading: false, error: null }))
      .catch((e) => alive && setSt({ data: null, loading: false, error: normalizeApiError(e) }));
    return () => {
      alive = false;
    };
  }, []);

  return st;
}

export function useUsage() {
  const [st, setSt] = useState<State<Usage>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    setSt((x) => ({ ...x, loading: true, error: null }));
    apiGet<Usage>("/v1/usage")
      .then((data) => alive && setSt({ data, loading: false, error: null }))
      .catch((e) => alive && setSt({ data: null, loading: false, error: normalizeApiError(e) }));
    return () => {
      alive = false;
    };
  }, []);

  return st;
}

export function useEvents(limit = 50, pollMs = 7000) {
  const [st, setSt] = useState<State<EventItem[]>>({ data: null, loading: true, error: null });
  const tick = useRef(0);

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

    const id = window.setInterval(() => {
      tick.current += 1;
      load(false);
    }, pollMs);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [limit, pollMs]);

  return useMemo(() => st, [st]);
}

export function useMetrics(fromDay: string, toDay: string) {
  const [st, setSt] = useState<State<MetricsRow[]>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    setSt((x) => ({ ...x, loading: true, error: null }));
    apiGet<MetricsRow[]>(`/v1/metrics?from_day=${fromDay}&to_day=${toDay}`)
      .then((data) => alive && setSt({ data, loading: false, error: null }))
      .catch((e) => alive && setSt({ data: null, loading: false, error: normalizeApiError(e) }));
    return () => {
      alive = false;
    };
  }, [fromDay, toDay]);

  return st;
}

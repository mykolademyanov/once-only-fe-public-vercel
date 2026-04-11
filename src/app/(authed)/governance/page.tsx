"use client";

import { useEffect, useState } from "react";
import { useMe, useToolsGroupedByScope, ToolListItem } from "@/lib/hooks";
import PageSpinner from "@/components/PageSpinner";
import {
  upsertTool,
  deleteTool,
  toggleTool,
  upsertPolicy,
  getPolicy,
  listPolicies,
  createPolicyFromTemplate,
  getAgentLogs,
  getAgentMetrics,
} from "@/lib/gov-api-client";

type PlanTier = "free" | "starter" | "pro" | "agency";
type PolicyTemplate = "custom" | "strict" | "moderate" | "permissive" | "read_only" | "support_bot";
type PricingRule = { tool: string; price_usd: number };
type PolicyFormData = {
  allowed_tools: string[];
  blocked_tools: string[];
  max_actions_per_hour: number;
  max_spend_usd_per_day: number;
  max_calls_per_tool_text: string;
  pricing_rules_text: string;
};
type MetricsPeriod = "hour" | "day" | "week";
type AgentLogRecord = {
  ts: number | string;
  agent_id: string;
  tool?: string | null;
  allowed: boolean;
  reason?: string | null;
  decision?: string | null;
  policy_reason?: string | null;
  risk_level?: string | null;
  args_hash?: string | null;
  spend_usd?: number | null;
};
type AgentMetricsRecord = {
  agent_id: string;
  period: string;
  total_actions: number;
  blocked_actions: number;
  total_spend_usd: number;
  top_tools: Array<{ tool: string; count: number }>;
};

const POLICY_TEMPLATE_DEFAULTS: Record<
  Exclude<PolicyTemplate, "custom">,
  Pick<PolicyFormData, "max_actions_per_hour" | "max_spend_usd_per_day">
> = {
  strict: { max_actions_per_hour: 50, max_spend_usd_per_day: 2 },
  moderate: { max_actions_per_hour: 200, max_spend_usd_per_day: 10 },
  permissive: { max_actions_per_hour: 1000, max_spend_usd_per_day: 50 },
  read_only: { max_actions_per_hour: 200, max_spend_usd_per_day: 0 },
  support_bot: { max_actions_per_hour: 500, max_spend_usd_per_day: 10 },
};

const TOOL_LIMITS_BY_PLAN: Record<PlanTier, number> = {
  free: 1,
  starter: 20,
  pro: 100,
  agency: 1000,
};

function normalizePlan(plan: string | null | undefined): PlanTier {
  const p = String(plan || "free").trim().toLowerCase();
  if (p === "starter" || p === "pro" || p === "agency") return p;
  return "free";
}

function serializeMaxCallsPerTool(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  return Object.entries(value)
    .map(([tool, cap]) => `${String(tool)}:${Number(cap)}`)
    .join("\n");
}

function serializePricingRules(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .filter((rule) => rule && typeof rule === "object" && rule.tool)
    .map((rule) => `${String(rule.tool)}:${Number(rule.price_usd ?? 0)}`)
    .join("\n");
}

function parseMaxCallsPerToolText(text: string): { value?: Record<string, number>; error?: string } {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return {};

  const out: Record<string, number> = {};
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0 || idx === line.length - 1) {
      return { error: `Invalid max_calls_per_tool line "${line}". Use format tool:count` };
    }
    const tool = line.slice(0, idx).trim();
    const capRaw = line.slice(idx + 1).trim();
    const cap = Number.parseInt(capRaw, 10);
    if (!tool || !Number.isFinite(cap) || cap <= 0) {
      return { error: `Invalid cap in line "${line}". Count must be a positive integer` };
    }
    out[tool] = cap;
  }
  return { value: out };
}

function parsePricingRulesText(text: string): { value?: PricingRule[]; error?: string } {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return {};

  const out: PricingRule[] = [];
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0 || idx === line.length - 1) {
      return { error: `Invalid pricing rule line "${line}". Use format tool:price` };
    }
    const tool = line.slice(0, idx).trim();
    const priceRaw = line.slice(idx + 1).trim();
    const price = Number.parseFloat(priceRaw);
    if (!tool || !Number.isFinite(price) || price < 0) {
      return { error: `Invalid price in line "${line}". Price must be a number >= 0` };
    }
    out.push({ tool, price_usd: price });
  }
  return { value: out };
}

function formatLogTimestamp(value: number | string | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const dt = new Date(value > 1e12 ? value : value * 1000);
    return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "—";
    if (/^\d+$/.test(raw)) {
      const parsedEpoch = Number.parseInt(raw, 10);
      if (Number.isFinite(parsedEpoch)) {
        const dt = new Date(parsedEpoch > 1e12 ? parsedEpoch : parsedEpoch * 1000);
        return Number.isNaN(dt.getTime()) ? raw : dt.toLocaleString();
      }
    }
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return new Date(parsed).toLocaleString();
    return raw;
  }
  return "—";
}

function normalizeDecision(log: AgentLogRecord): string {
  const decision = String(log.decision || "").trim().toLowerCase();
  if (decision) return decision;
  return log.allowed ? "executed" : "blocked";
}

function decisionColors(decision: string): { bg: string; border: string; color: string } {
  const d = String(decision || "").toLowerCase();
  if (d === "blocked") return { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" };
  if (d === "executed") return { bg: "#ecfdf5", border: "#bbf7d0", color: "#166534" };
  if (d === "dedup") return { bg: "#fffbeb", border: "#fde68a", color: "#92400e" };
  if (d === "failed") return { bg: "#f9fafb", border: "#e5e7eb", color: "#374151" };
  return { bg: "#f3f4f6", border: "#d1d5db", color: "#374151" };
}

export default function GovPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"tools" | "policies" | "observability">("tools");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolListItem | null>(null);
  const [globalError, setGlobalError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ tool: ToolListItem; scopeId: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Policies state
  const [agentId, setAgentId] = useState("");
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyFormData, setPolicyFormData] = useState<PolicyFormData>({
    allowed_tools: [] as string[],
    blocked_tools: [] as string[],
    max_actions_per_hour: 0,
    max_spend_usd_per_day: 0,
    max_calls_per_tool_text: "",
    pricing_rules_text: "",
  });
  const [policyTemplate, setPolicyTemplate] = useState<PolicyTemplate>("custom");
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState("");

  // Display existing policy
  const [currentPolicy, setCurrentPolicy] = useState<any | null>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [searchAgentId, setSearchAgentId] = useState("");

  // Policies list state
  const [policiesList, setPoliciesList] = useState<any[]>([]);
  const [loadingPoliciesList, setLoadingPoliciesList] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);

  // Agent observability state
  const [observabilityAgentId, setObservabilityAgentId] = useState("");
  const [observabilityPeriod, setObservabilityPeriod] = useState<MetricsPeriod>("day");
  const [observabilityLimit, setObservabilityLimit] = useState(100);
  const [observabilityLoading, setObservabilityLoading] = useState(false);
  const [observabilityError, setObservabilityError] = useState("");
  const [agentLogs, setAgentLogs] = useState<AgentLogRecord[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetricsRecord | null>(null);

  const me = useMe(refreshKey);
  const toolsGrouped = useToolsGroupedByScope(refreshKey);

  // Status checks
  const paymentRequired = me.error?.status === 402;
  const rateLimited = me.error?.status === 429;
  const inactive = me.data ? !me.data.is_active : false;
  const planTier = normalizePlan(me.data?.plan);
  const isStarterPlus = planTier !== "free";
  const isProPlus = planTier === "pro" || planTier === "agency";

  // Show content for all plans (feature-level limits are enforced in forms/API)
  const showContent = !me.loading && !paymentRequired && !inactive && !rateLimited;
  const initialLoading = (me.loading && !me.data) || (toolsGrouped.loading && !toolsGrouped.data);

  // Auto-refresh data every 45 seconds
  useEffect(() => {
    const id = window.setInterval(() => setRefreshKey((x) => x + 1), 45_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isProPlus && policyTemplate !== "custom") {
      setPolicyTemplate("custom");
    }
  }, [isProPlus, policyTemplate]);

  // Load all policies when tab is active
  useEffect(() => {
    if (activeTab === "policies" && showContent) {
      const loadAllPolicies = async () => {
        setLoadingPoliciesList(true);
        try {
          const policies = await listPolicies();
          setPoliciesList(policies || []);
        } catch (err: any) {
          console.error("Failed to load policies:", err);
          setPoliciesList([]);
        } finally {
          setLoadingPoliciesList(false);
        }
      };
      loadAllPolicies();
    }
  }, [activeTab, showContent, refreshKey]);

  const handleToolCreated = () => {
    setShowCreateModal(false);
    setRefreshKey(x => x + 1);
    setGlobalError("");
  };

  const handleToolUpdated = () => {
    setEditingTool(null);
    setRefreshKey(x => x + 1);
    setGlobalError("");
  };

  // Get all tools for policy selection
  const allTools = Object.values(toolsGrouped.data || {}).flat();
  const toolsLimit = TOOL_LIMITS_BY_PLAN[planTier];
  const toolsUsed = allTools.length;
  const toolsRemaining = Math.max(0, toolsLimit - toolsUsed);
  const toolsLimitReached = toolsUsed >= toolsLimit;
  const toolsUsagePercent = toolsLimit > 0 ? Math.min(100, Math.round((toolsUsed / toolsLimit) * 100)) : 0;

  const loadPolicy = async (id: string) => {
    if (!id) return;
    setLoadingPolicy(true);
    try {
      const policy = await getPolicy(id);
      setCurrentPolicy(policy);
    } catch (err: any) {
      setCurrentPolicy(null);
      alert(`Policy not found for agent: ${id}`);
    } finally {
      setLoadingPolicy(false);
    }
  };

  const loadObservability = async (explicitAgentId?: string) => {
    const targetAgentId = String(explicitAgentId ?? observabilityAgentId).trim();
    if (!targetAgentId) {
      setObservabilityError("Enter agent_id to load logs and metrics.");
      return;
    }

    const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(Number(observabilityLimit) || 100)));

    setObservabilityLoading(true);
    setObservabilityError("");
    try {
      const [logsResp, metricsResp] = await Promise.all([
        getAgentLogs(targetAgentId, normalizedLimit),
        getAgentMetrics(targetAgentId, observabilityPeriod),
      ]);

      const logs = Array.isArray(logsResp) ? logsResp as AgentLogRecord[] : [];
      setAgentLogs(logs);
      setAgentMetrics(metricsResp);
      setObservabilityAgentId(targetAgentId);
      setObservabilityLimit(normalizedLimit);
    } catch (err: any) {
      setAgentLogs([]);
      setAgentMetrics(null);
      setObservabilityError(err?.details?.message || err?.message || "Failed to load agent observability.");
    } finally {
      setObservabilityLoading(false);
    }
  };

  const toolsSection = (
    <section>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, background: "#111", borderRadius: 2 }}></div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Tools Registry</h2>
          </div>
          <p style={{ fontSize: 13, color: "#666", marginTop: 4, marginLeft: 14 }}>
            Manage custom tools for your agents. Tools are grouped by scope.
          </p>
          <div style={{
            marginTop: 10,
            marginLeft: 14,
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "10px 12px",
            background: toolsLimitReached ? "#fffbeb" : "#f8fafc",
            maxWidth: 420
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
                Tools Limit
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: toolsLimitReached ? "#92400e" : "#111827" }}>
                {toolsUsed} / {toolsLimit} used
              </div>
            </div>
            <div style={{ height: 7, borderRadius: 999, background: "#e5e7eb", overflow: "hidden", marginBottom: 6 }}>
              <div
                style={{
                  width: `${toolsUsagePercent}%`,
                  height: "100%",
                  background: toolsLimitReached ? "#f59e0b" : "#111827",
                  transition: "width 0.2s ease"
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: toolsLimitReached ? "#92400e" : "#475569" }}>
              {toolsLimitReached
                ? "Plan tool limit reached. Upgrade plan to add more tools."
                : `${toolsRemaining} tool ${toolsRemaining === 1 ? "slot" : "slots"} remaining in this plan.`}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={toolsLimitReached}
          title={toolsLimitReached ? `Tool limit reached (${toolsUsed}/${toolsLimit}). Upgrade plan to add more.` : undefined}
          style={{
            padding: "10px 16px",
            background: toolsLimitReached ? "#9ca3af" : "#111",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: toolsLimitReached ? "not-allowed" : "pointer",
            opacity: toolsLimitReached ? 0.85 : 1,
            transition: "background 0.2s"
          }} onMouseOver={(e) => {
            if (toolsLimitReached) return;
            (e.target as HTMLButtonElement).style.background = "#333";
          }} onMouseOut={(e) => {
            if (toolsLimitReached) return;
            (e.target as HTMLButtonElement).style.background = "#111";
          }}>
          + Create Tool
        </button>
      </div>

      {globalError && (
        <div style={{
          border: "1px solid #fca5a5",
          borderRadius: 12,
          padding: 16,
          background: "#fef2f2",
          color: "#991b1b",
          marginBottom: 16,
          fontSize: 13
        }}>
          {globalError}
          <button
            onClick={() => setGlobalError("")}
            style={{
              marginLeft: 12,
              background: "transparent",
              border: "none",
              color: "#991b1b",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            ✕
          </button>
        </div>
      )}

      {toolsGrouped.loading ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16
        }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 200,
                background: "#f3f4f6",
                borderRadius: 12,
                border: "1px solid #eee",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
              }}
            />
          ))}
        </div>
      ) : toolsGrouped.error ? (
        <div style={{
          border: "1px solid #fcd34d",
          borderRadius: 12,
          padding: 16,
          background: "#fefce8",
          color: "#78350f"
        }}>
          <strong>Error loading tools:</strong> {toolsGrouped.error.message}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          {Object.entries(toolsGrouped.data || {}).map(([scopeId, tools]) => (
            <div key={scopeId}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#666",
                textTransform: "uppercase",
                marginBottom: 12,
                padding: "0 4px"
              }}>
                Scope: {scopeId}
              </div>

              {tools.length === 0 ? (
                <div style={{
                  padding: 24,
                  background: "#f9f9f9",
                  borderRadius: 12,
                  border: "1px solid #eee",
                  textAlign: "center",
                  color: "#666"
                }}>
                  No tools in this scope yet
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 16
                }}>
                  {tools.map((tool) => (
                    <ToolCard
                      key={`${scopeId}-${tool.name}`}
                      tool={tool}
                      scopeId={scopeId}
                      onEdit={() => setEditingTool(tool)}
                      onDelete={() => {
                        setDeleteError("");
                        setDeleteTarget({ tool, scopeId });
                      }}
                      onToggle={async () => {
                        try {
                          await toggleTool(tool.name, !tool.enabled, scopeId);
                          setRefreshKey(x => x + 1);
                        } catch (err: any) {
                          setGlobalError(`Failed to toggle tool: ${err.message}`);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {(!toolsGrouped.data || Object.keys(toolsGrouped.data).length === 0) && (
            <div style={{
              padding: 32,
              background: "#f9f9f9",
              borderRadius: 12,
              border: "1px dashed #ddd",
              textAlign: "center"
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#666", marginBottom: 8 }}>
                No tools registered yet
              </div>
              <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
                Create your first tool to get started
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={toolsLimitReached}
                title={toolsLimitReached ? `Tool limit reached (${toolsUsed}/${toolsLimit}). Upgrade plan to add more.` : undefined}
                style={{
                  padding: "10px 16px",
                  background: toolsLimitReached ? "#9ca3af" : "#111",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: toolsLimitReached ? "not-allowed" : "pointer",
                  opacity: toolsLimitReached ? 0.85 : 1
                }}>
                {toolsLimitReached ? "Tool Limit Reached" : "Create First Tool"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );

  const policiesSection = (
    <section>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, background: "#4f46e5", borderRadius: 2 }}></div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#4f46e5" }}>Agent Policies</h2>
          </div>
          <p style={{ fontSize: 13, color: "#666", marginTop: 4, marginLeft: 14 }}>
            View and manage governance rules for all your agents.
          </p>
        </div>
        <button
          onClick={() => {
            setAgentId("");
            setPolicyFormData({
              allowed_tools: [],
              blocked_tools: [],
              max_actions_per_hour: 0,
              max_spend_usd_per_day: 0,
              max_calls_per_tool_text: "",
              pricing_rules_text: "",
            });
            setPolicyTemplate("custom");
            setShowPolicyModal(true);
          }}
          style={{
            padding: "10px 16px",
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.2s"
          }} onMouseOver={(e) => { (e.target as HTMLButtonElement).style.background = "#4338ca"; }} onMouseOut={(e) => { (e.target as HTMLButtonElement).style.background = "#4f46e5"; }}>
          + Create Policy
        </button>
      </div>

      {loadingPoliciesList ? (
        <div style={{
          padding: 32,
          textAlign: "center",
          color: "#666"
        }}>
          Loading policies...
        </div>
      ) : policiesList.length === 0 ? (
        <div style={{
          padding: 32,
          background: "linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)",
          borderRadius: 12,
          border: "1px solid #e0e7ff",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
            No policies created yet.
          </div>
          <button
            onClick={() => setShowPolicyModal(true)}
            style={{
              padding: "10px 16px",
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}>
            Create Your First Policy
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {/* All Agents List */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 12 }}>
              All Agents ({policiesList.length})
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {policiesList.map((p) => (
                <button
                  key={p.agent_id}
                  onClick={() => setSelectedPolicy(p)}
                  style={{
                    padding: 12,
                    background: selectedPolicy?.agent_id === p.agent_id ? "#4f46e5" : "#f3f4f6",
                    color: selectedPolicy?.agent_id === p.agent_id ? "white" : "#111",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s"
                  }}>
                  <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {p.agent_id}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                    Tools: {(p.policy?.allowed_tools?.length || 0) + (p.policy?.blocked_tools?.length || 0)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Policy Details */}
          {selectedPolicy ? (
            <div style={{
              padding: 20,
              background: "linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)",
              borderRadius: 12,
              border: "2px solid #4f46e5"
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#4f46e5", marginBottom: 16 }}>
                Policy Details: <span style={{ fontFamily: "monospace", color: "#111" }}>{selectedPolicy.agent_id}</span>
              </div>

              {/* Allowed Tools */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>
                  ✓ Allowed Tools ({selectedPolicy.policy?.allowed_tools?.length || 0})
                </div>
                {selectedPolicy.policy?.allowed_tools?.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedPolicy.policy.allowed_tools.map((tool: string) => (
                      <div
                        key={tool}
                        style={{
                          padding: "6px 10px",
                          background: "#d1fae5",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "#065f46",
                          fontWeight: 600
                        }}
                      >
                        {tool}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>No restrictions</div>
                )}
              </div>

              {/* Blocked Tools */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>
                  ✗ Blocked Tools ({selectedPolicy.policy?.blocked_tools?.length || 0})
                </div>
                {selectedPolicy.policy?.blocked_tools?.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedPolicy.policy.blocked_tools.map((tool: string) => (
                      <div
                        key={tool}
                        style={{
                          padding: "6px 10px",
                          background: "#fee2e2",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "#991b1b",
                          fontWeight: 600
                        }}
                      >
                        {tool}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>None</div>
                )}
              </div>

              {/* Limits */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 12,
                padding: "12px 0",
                borderTop: "1px solid #e0e7ff",
                borderBottom: "1px solid #e0e7ff",
                marginBottom: 16
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#666", marginBottom: 4 }}>
                    Max Actions/Hour
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                    {selectedPolicy.policy?.max_actions_per_hour || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#666", marginBottom: 4 }}>
                    Max Spend/Day
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                    ${(selectedPolicy.policy?.max_spend_usd_per_day || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#666", marginBottom: 4 }}>
                    Calls Per Tool Caps
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                    {selectedPolicy.policy?.max_calls_per_tool
                      ? Object.keys(selectedPolicy.policy.max_calls_per_tool || {}).length
                      : "—"}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>
                  Pricing Rules ({selectedPolicy.policy?.pricing_rules?.length || 0})
                </div>
                {selectedPolicy.policy?.pricing_rules?.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedPolicy.policy.pricing_rules.map((rule: { tool?: string; price_usd?: number }, idx: number) => (
                      <div
                        key={`${rule?.tool || "rule"}-${idx}`}
                        style={{
                          padding: "6px 10px",
                          background: "#dcfce7",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "#166534",
                          fontWeight: 600
                        }}
                      >
                        {rule?.tool}: ${Number(rule?.price_usd || 0).toFixed(2)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>None</div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setAgentId(selectedPolicy.agent_id);
                    setPolicyFormData({
                      allowed_tools: selectedPolicy.policy?.allowed_tools || [],
                      blocked_tools: selectedPolicy.policy?.blocked_tools || [],
                      max_actions_per_hour: selectedPolicy.policy?.max_actions_per_hour || 0,
                      max_spend_usd_per_day: selectedPolicy.policy?.max_spend_usd_per_day || 0,
                      max_calls_per_tool_text: serializeMaxCallsPerTool(selectedPolicy.policy?.max_calls_per_tool),
                      pricing_rules_text: serializePricingRules(selectedPolicy.policy?.pricing_rules),
                    });
                    setPolicyTemplate("custom");
                    setShowPolicyModal(true);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#fef3c7",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#92400e",
                    cursor: "pointer"
                  }}>
                  ✏️ Edit
                </button>
                <button
                  onClick={() => {
                    setObservabilityAgentId(selectedPolicy.agent_id);
                    setActiveTab("observability");
                    if (isProPlus) {
                      void loadObservability(selectedPolicy.agent_id);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#dcfce7",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#166534",
                    cursor: "pointer"
                  }}>
                  📊 View Logs & Metrics
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: 20,
              background: "linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)",
              borderRadius: 12,
              border: "1px dashed #e0e7ff",
              textAlign: "center",
              color: "#666"
            }}>
              Select an agent to view policy details
            </div>
          )}
        </div>
      )}
    </section>
  );

  const blockedPct = agentMetrics && agentMetrics.total_actions > 0
    ? Math.round((agentMetrics.blocked_actions / agentMetrics.total_actions) * 100)
    : 0;

  const observabilitySection = (
    <section>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, background: "#0f766e", borderRadius: 2 }}></div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f766e" }}>Agent Observability</h2>
          </div>
          <p style={{ fontSize: 13, color: "#666", marginTop: 4, marginLeft: 14 }}>
            Decision history for allowed, blocked, and deduped calls plus run-level tool usage metrics.
          </p>
        </div>
      </div>

      {!isProPlus ? (
        <div style={{
          border: "1px solid #fcd34d",
          borderRadius: 12,
          padding: 16,
          background: "#fffbeb",
          color: "#92400e"
        }}>
          Agent Logs and Agent Metrics are available on Pro and Agency plans.
        </div>
      ) : (
        <>
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 14,
            background: "#f9fafb",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            alignItems: "end",
            marginBottom: 16
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                Agent ID
              </div>
              <input
                value={observabilityAgentId}
                onChange={(e) => setObservabilityAgentId(e.target.value)}
                placeholder="e.g. support-agent"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 13
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                Period
              </div>
              <select
                value={observabilityPeriod}
                onChange={(e) => setObservabilityPeriod(e.target.value as MetricsPeriod)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "white"
                }}
              >
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="week">Week</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                Logs Limit
              </div>
              <input
                type="number"
                min={1}
                max={500}
                value={observabilityLimit}
                onChange={(e) => setObservabilityLimit(Number.parseInt(e.target.value || "100", 10) || 100)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 13
                }}
              />
            </div>

            <button
              onClick={() => { void loadObservability(); }}
              disabled={observabilityLoading}
              style={{
                padding: "10px 16px",
                background: "#0f766e",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: observabilityLoading ? "not-allowed" : "pointer",
                opacity: observabilityLoading ? 0.7 : 1,
                height: 40
              }}
            >
              {observabilityLoading ? "Loading..." : "Load"}
            </button>
          </div>

          {observabilityError && (
            <div style={{
              border: "1px solid #fca5a5",
              borderRadius: 12,
              padding: 12,
              background: "#fef2f2",
              color: "#991b1b",
              fontSize: 13,
              marginBottom: 16
            }}>
              {observabilityError}
            </div>
          )}

          {agentMetrics && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 16
            }}>
              <MetricCard label="Total Actions" value={String(agentMetrics.total_actions)} />
              <MetricCard label="Blocked" value={`${agentMetrics.blocked_actions} (${blockedPct}%)`} />
              <MetricCard label="Spend (USD)" value={`$${Number(agentMetrics.total_spend_usd || 0).toFixed(2)}`} />
              <MetricCard label="Period" value={String(agentMetrics.period || "").toUpperCase()} />
            </div>
          )}

          {agentMetrics?.top_tools && agentMetrics.top_tools.length > 0 && (
            <div style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 14,
              background: "white",
              marginBottom: 16
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 10 }}>
                Top Tools
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {agentMetrics.top_tools.map((item) => (
                  <div
                    key={`${item.tool}-${item.count}`}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "#ecfeff",
                      border: "1px solid #a5f3fc",
                      color: "#155e75",
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    {item.tool}: {item.count}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "white",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "12px 14px",
              borderBottom: "1px solid #e5e7eb",
              fontSize: 12,
              fontWeight: 700,
              color: "#666",
              textTransform: "uppercase"
            }}>
              Agent Logs ({agentLogs.length})
            </div>

            {agentLogs.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: "#6b7280" }}>
                {observabilityLoading ? "Loading logs..." : "No logs yet for this agent."}
              </div>
            ) : (
              <div style={{ display: "grid" }}>
                {agentLogs.map((log, idx) => {
                  const decision = normalizeDecision(log);
                  const c = decisionColors(decision);
                  return (
                    <div
                      key={`${String(log.ts)}-${idx}-${log.tool || "unknown"}`}
                      style={{
                        padding: "12px 14px",
                        borderBottom: idx === agentLogs.length - 1 ? "none" : "1px solid #f3f4f6",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 10
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>
                            {log.tool || "unknown_tool"}
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: c.bg,
                              border: `1px solid ${c.border}`,
                              color: c.color,
                              fontSize: 11,
                              fontWeight: 700
                            }}
                          >
                            {decision}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.45 }}>
                          <strong>Reason:</strong> {log.policy_reason || log.reason || "—"}
                          {log.args_hash ? <> · <strong>Args:</strong> <code>{log.args_hash}</code></> : null}
                          {typeof log.spend_usd === "number" ? <> · <strong>Spend:</strong> ${log.spend_usd.toFixed(4)}</> : null}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", whiteSpace: "normal", wordBreak: "break-word" }}>
                        {formatLogTimestamp(log.ts)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );

  if (initialLoading) {
    return <PageSpinner fullScreen label="Loading governance..." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
      {/* --- HEADER --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>Governance</div>
          <div style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
            Manage tools, policies, and agent access controls.
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Plan</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111", textTransform: "capitalize" }}>
            {me.loading ? "•••" : me.data?.plan ?? "Free"}
          </div>
        </div>
      </div>

      {/* --- TABS --- */}
      {showContent && (
        <>
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #eee", flexWrap: "wrap" }}>
            {["tools", "policies", "observability"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "tools" | "policies" | "observability")}
                style={{
                  padding: "10px 14px",
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tab ? "3px solid #111" : "none",
                  color: activeTab === tab ? "#111" : "#999",
                  fontWeight: activeTab === tab ? 600 : 400,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textTransform: "capitalize"
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* --- CONTENT --- */}
          <div style={{ paddingTop: 20 }}>
            {activeTab === "tools" && toolsSection}
            {activeTab === "policies" && policiesSection}
            {activeTab === "observability" && observabilitySection}
          </div>
        </>
      )}

      {/* --- MODALS --- */}
      {showCreateModal && (
        <CreateToolModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleToolCreated}
          onError={(msg) => setGlobalError(msg)}
        />
      )}

      {editingTool && (
        <EditToolModal
          tool={editingTool}
          onClose={() => setEditingTool(null)}
          onSuccess={handleToolUpdated}
          onError={(msg) => setGlobalError(msg)}
        />
      )}

      {deleteTarget && (
        <Modal
          title={`Delete Tool: ${deleteTarget.tool.name}`}
          onClose={() => {
            if (!deleteLoading) {
              setDeleteTarget(null);
              setDeleteError("");
            }
          }}
        >
          <div style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>
            This will permanently delete the tool and remove it from all scopes.
            Policies that reference this tool may fail validation until updated.
          </div>

          {deleteError && (
            <div style={{
              marginTop: 12,
              padding: 10,
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              color: "#991b1b",
              fontSize: 12
            }}>
              {deleteError}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              onClick={async () => {
                if (!deleteTarget) return;
                setDeleteLoading(true);
                setDeleteError("");
                try {
                  await deleteTool(deleteTarget.tool.name, deleteTarget.scopeId);
                  setRefreshKey(x => x + 1);
                  setDeleteTarget(null);
                } catch (err: any) {
                  setDeleteError(err.details?.message || err.message || "Failed to delete tool");
                } finally {
                  setDeleteLoading(false);
                }
              }}
              disabled={deleteLoading}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: deleteLoading ? "not-allowed" : "pointer",
                opacity: deleteLoading ? 0.7 : 1
              }}
            >
              {deleteLoading ? "Deleting..." : "Delete Tool"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteLoading) return;
                setDeleteTarget(null);
                setDeleteError("");
              }}
              style={{
                padding: "10px 16px",
                background: "#f3f4f6",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {showPolicyModal && (
        <CreatePolicyModal
          agentId={agentId}
          onAgentIdChange={setAgentId}
          formData={policyFormData}
          onFormDataChange={setPolicyFormData}
          allTools={allTools}
          planTier={planTier}
          canUseCaps={isStarterPlus}
          canUseTemplates={isProPlus}
          canUsePricingRules={isProPlus}
          template={policyTemplate}
          onTemplateChange={setPolicyTemplate}
          loading={policyLoading}
          error={policyError}
          onClose={() => setShowPolicyModal(false)}
          onSubmit={async () => {
            setPolicyLoading(true);
            setPolicyError("");
            try {
              const callsCapsParsed = parseMaxCallsPerToolText(policyFormData.max_calls_per_tool_text);
              if (callsCapsParsed.error) {
                setPolicyError(callsCapsParsed.error);
                return;
              }
              const pricingRulesParsed = parsePricingRulesText(policyFormData.pricing_rules_text);
              if (pricingRulesParsed.error) {
                setPolicyError(pricingRulesParsed.error);
                return;
              }

              const overrides = {
                allowed_tools: policyFormData.allowed_tools.length > 0 ? policyFormData.allowed_tools : undefined,
                blocked_tools: policyFormData.blocked_tools.length > 0 ? policyFormData.blocked_tools : undefined,
                max_actions_per_hour:
                  isStarterPlus && policyFormData.max_actions_per_hour > 0
                    ? policyFormData.max_actions_per_hour
                    : undefined,
                max_spend_usd_per_day:
                  isStarterPlus && policyFormData.max_spend_usd_per_day > 0
                    ? policyFormData.max_spend_usd_per_day
                    : undefined,
                max_calls_per_tool: isStarterPlus ? callsCapsParsed.value : undefined,
                pricing_rules: isProPlus ? pricingRulesParsed.value : undefined,
              };

              if (isProPlus && policyTemplate !== "custom") {
                await createPolicyFromTemplate(agentId, policyTemplate, overrides);
              } else {
                await upsertPolicy(agentId, {
                  agent_id: agentId,
                  ...overrides,
                });
              }
              setShowPolicyModal(false);
              alert("Policy created/updated successfully!");
              setRefreshKey(x => x + 1);
            } catch (err: any) {
              const message = err.details?.message || err.message || "Failed to create policy";
              setPolicyError(message);
            } finally {
              setPolicyLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}

// ==================== COMPONENTS ====================

function ToolCard({
  tool,
  scopeId,
  onEdit,
  onDelete,
  onToggle
}: {
  tool: ToolListItem;
  scopeId: string;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  onToggle: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await Promise.resolve(onDelete());
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      await Promise.resolve(onToggle());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: "1px solid #eee",
      borderRadius: 12,
      padding: 16,
      background: "white",
      transition: "all 0.2s"
    }} onMouseOver={(e) => {
      const el = e.currentTarget as HTMLDivElement;
      el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
      el.style.borderColor = "#ddd";
    }} onMouseOut={(e) => {
      const el = e.currentTarget as HTMLDivElement;
      el.style.boxShadow = "none";
      el.style.borderColor = "#eee";
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>
            {tool.name}
          </div>
          <div style={{ fontSize: 12, color: "#666", fontFamily: "monospace", wordBreak: "break-all" }}>
            {truncateUrl(tool.url)}
          </div>
        </div>
        <div style={{
          padding: "4px 8px",
          background: tool.enabled ? "#dcfce7" : "#f3f4f6",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          color: tool.enabled ? "#166534" : "#6b7280",
          whiteSpace: "nowrap",
          marginLeft: 8
        }}>
          {tool.enabled ? "Enabled" : "Disabled"}
        </div>
      </div>

      {/* Description */}
      {tool.description && (
        <div style={{ fontSize: 12, color: "#666", marginBottom: 12, lineHeight: 1.4 }}>
          {tool.description}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 8,
        marginBottom: 12,
        padding: "12px 0",
        borderTop: "1px solid #f3f4f6",
        borderBottom: "1px solid #f3f4f6"
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>Timeout</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginTop: 2 }}>
            {Number.isFinite(tool.timeout_ms) ? `${tool.timeout_ms}ms` : "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>Max Retries</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginTop: 2 }}>
            {Number.isFinite(tool.max_retries) ? tool.max_retries : "—"}
          </div>
        </div>
      </div>

      {/* Secret Info */}
      {tool.has_secret && (
        <div style={{ fontSize: 11, color: "#666", marginBottom: 12, padding: "8px", background: "#f9f9f9", borderRadius: 6 }}>
          <span style={{ fontWeight: 600 }}>Secret:</span> {tool.secret_mask}
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        paddingTop: 12,
        borderTop: "1px solid #f3f4f6"
      }}>
        <button
          onClick={handleToggle}
          disabled={loading}
          style={{
            padding: "6px 12px",
            background: tool.enabled ? "#fee2e2" : "#d1fae5",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            color: tool.enabled ? "#991b1b" : "#065f46",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity 0.2s",
            opacity: loading ? 0.6 : 1
          }}>
          {tool.enabled ? "Disable" : "Enable"}
        </button>

        <button
          onClick={onEdit}
          disabled={loading}
          style={{
            padding: "6px 12px",
            background: "#fef3c7",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "#92400e",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity 0.2s",
            opacity: loading ? 0.6 : 1
          }}>
          Edit
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          style={{
            padding: "6px 12px",
            background: "#fee2e2",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "#991b1b",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity 0.2s",
            opacity: loading ? 0.6 : 1
          }}>
          Delete
        </button>
      </div>
    </div>
  );
}

function truncateUrl(url: string): string {
  if (url.length > 50) {
    return url.substring(0, 47) + "...";
  }
  return url;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 12,
        background: "white"
      }}
    >
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
        {value}
      </div>
    </div>
  );
}

// ==================== MODALS ====================

function CreateToolModal({
  onClose,
  onSuccess,
  onError
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    scope_id: "global",
    secret: "",
    timeout_ms: 15000,
    max_retries: 2,
    enabled: true,
    description: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await upsertTool({
        name: formData.name.trim(),
        url: formData.url.trim(),
        scope_id: (formData.scope_id || "global").trim(),
        auth: {
          type: "hmac_sha256",
          secret: formData.secret
        },
        timeout_ms: formData.timeout_ms,
        max_retries: formData.max_retries,
        enabled: formData.enabled,
        description: formData.description || undefined
      });
      onSuccess();
    } catch (err: any) {
      const message = err.details?.message || err.message || "Failed to create tool";
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Create New Tool">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {error && (
          <div style={{
            padding: 12,
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: 8,
            color: "#991b1b",
            fontSize: 13
          }}>
            {error}
          </div>
        )}

        <FormField
          label="Tool Name"
          value={formData.name}
          onChange={(name) => setFormData({ ...formData, name })}
          placeholder="e.g., my_webhook_tool"
          required
        />

        <FormField
          label="URL"
          value={formData.url}
          onChange={(url) => setFormData({ ...formData, url })}
          placeholder="https://your-api.example.com/webhook"
          required
          type="url"
        />

        <FormField
          label="Scope ID"
          value={formData.scope_id}
          onChange={(scope_id) => setFormData({ ...formData, scope_id })}
          placeholder="global"
        />

        <FormField
          label="HMAC Secret"
          value={formData.secret}
          onChange={(secret) => setFormData({ ...formData, secret })}
          placeholder="Your shared secret (min 8 chars)"
          required
          type="password"
        />

        <FormField
          label="Timeout (ms)"
          value={String(formData.timeout_ms)}
          onChange={(timeout_ms) => setFormData({ ...formData, timeout_ms: parseInt(timeout_ms) })}
          type="number"
          min="250"
          max="120000"
        />

        <FormField
          label="Max Retries"
          value={String(formData.max_retries)}
          onChange={(max_retries) => setFormData({ ...formData, max_retries: parseInt(max_retries) })}
          type="number"
          min="0"
          max="10"
        />

        <FormField
          label="Description (optional)"
          value={formData.description}
          onChange={(description) => setFormData({ ...formData, description })}
          placeholder="What does this tool do?"
          as="textarea"
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "#111",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Creating..." : "Create Tool"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              background: "#f3f4f6",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditToolModal({
  tool,
  onClose,
  onSuccess,
  onError
}: {
  tool: ToolListItem;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [formData, setFormData] = useState({
    url: tool.url,
    timeout_ms: tool.timeout_ms,
    max_retries: tool.max_retries,
    enabled: tool.enabled,
    description: tool.description || "",
    secret: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await upsertTool({
        name: tool.name,
        url: formData.url.trim(),
        scope_id: tool.scope_id,
        auth: {
          type: "hmac_sha256",
          secret: formData.secret.trim() || undefined
        },
        timeout_ms: formData.timeout_ms,
        max_retries: formData.max_retries,
        enabled: formData.enabled,
        description: formData.description || undefined
      });
      onSuccess();
    } catch (err: any) {
      const message = err.details?.message || err.message || "Failed to update tool";
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title={`Edit Tool: ${tool.name}`}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {error && (
          <div style={{
            padding: 12,
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: 8,
            color: "#991b1b",
            fontSize: 13
          }}>
            {error}
          </div>
        )}

        <FormField label="Tool Name" value={tool.name} disabled />

        <FormField
          label="URL"
          value={formData.url}
          onChange={(url) => setFormData({ ...formData, url })}
          required
          type="url"
        />

        <FormField
          label="Timeout (ms)"
          value={String(formData.timeout_ms)}
          onChange={(timeout_ms) => setFormData({ ...formData, timeout_ms: parseInt(timeout_ms) })}
          type="number"
          min="250"
          max="120000"
        />

        <FormField
          label="Max Retries"
          value={String(formData.max_retries)}
          onChange={(max_retries) => setFormData({ ...formData, max_retries: parseInt(max_retries) })}
          type="number"
          min="0"
          max="10"
        />

        <FormField
          label="Description"
          value={formData.description}
          onChange={(description) => setFormData({ ...formData, description })}
          as="textarea"
        />

        <FormField
          label="HMAC Secret (leave blank to keep current)"
          value={formData.secret}
          onChange={(secret) => setFormData({ ...formData, secret })}
          type="password"
          placeholder="Leave empty to keep existing secret"
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "#111",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              background: "#f3f4f6",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreatePolicyModal({
  agentId,
  onAgentIdChange,
  formData,
  onFormDataChange,
  allTools,
  planTier,
  canUseCaps,
  canUseTemplates,
  canUsePricingRules,
  template,
  onTemplateChange,
  loading,
  error,
  onClose,
  onSubmit
}: {
  agentId: string;
  onAgentIdChange: (value: string) => void;
  formData: PolicyFormData;
  onFormDataChange: (value: PolicyFormData) => void;
  allTools: ToolListItem[];
  planTier: PlanTier;
  canUseCaps: boolean;
  canUseTemplates: boolean;
  canUsePricingRules: boolean;
  template: PolicyTemplate;
  onTemplateChange: (value: PolicyTemplate) => void;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const lockedFeatures: string[] = [];
  if (!canUseCaps) lockedFeatures.push("Action / spend / per-tool caps");
  if (!canUseTemplates) lockedFeatures.push("Policy templates");
  if (!canUsePricingRules) lockedFeatures.push("Pricing rules");

  const handleTemplateChange = (nextTemplate: PolicyTemplate) => {
    onTemplateChange(nextTemplate);
    if (nextTemplate === "custom") return;
    const preset = POLICY_TEMPLATE_DEFAULTS[nextTemplate];
    if (!preset) return;
    onFormDataChange({
      ...formData,
      max_actions_per_hour: preset.max_actions_per_hour,
      max_spend_usd_per_day: preset.max_spend_usd_per_day,
    });
  };

  const renderToolSelector = (
    title: string,
    selected: string[],
    onToggle: (toolName: string, checked: boolean) => void
  ) => (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {title}
      </label>
      <div style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 12,
        maxHeight: 150,
        overflowY: "auto",
        background: "#f9f9f9"
      }}>
        {allTools.length === 0 ? (
          <div style={{ fontSize: 12, color: "#999" }}>No tools available</div>
        ) : (
          allTools.map((tool) => (
            <label key={`${title}-${tool.name}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={selected.includes(tool.name)}
                onChange={(e) => onToggle(tool.name, e.target.checked)}
              />
              <span style={{ fontSize: 12 }}>{tool.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Modal onClose={onClose} title="Create Agent Policy">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {error && (
          <div style={{
            padding: 12,
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: 8,
            color: "#991b1b",
            fontSize: 13
          }}>
            {error}
          </div>
        )}

        <FormField
          label="Agent ID"
          value={agentId}
          onChange={onAgentIdChange}
          placeholder="e.g., agent_123"
          required
        />

        {!canUseTemplates && (
          <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "#f8fafc",
            padding: 12
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{
                padding: "4px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.02em",
                background: "#e2e8f0",
                color: "#0f172a",
                textTransform: "uppercase"
              }}>
                Current plan: {planTier.toUpperCase()}
              </span>
              <span style={{
                padding: "4px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.02em",
                background: "#fef3c7",
                color: "#92400e",
                textTransform: "uppercase"
              }}>
                Pro+ unlocks templates & pricing
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
              Configure what this agent can do right now. Locked controls are grouped below.
            </div>
          </div>
        )}

        <div style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 12,
          background: "white"
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", textTransform: "uppercase", marginBottom: 10 }}>
            Available on your plan
          </div>

          {canUseTemplates && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Template
              </label>
              <select
                value={template}
                onChange={(e) => handleTemplateChange(e.target.value as PolicyTemplate)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "white",
                  color: "#111",
                  cursor: "pointer",
                }}
              >
                <option value="custom">Custom (no template)</option>
                <option value="strict">Strict</option>
                <option value="moderate">Moderate</option>
                <option value="permissive">Permissive</option>
                <option value="read_only">Read Only</option>
                <option value="support_bot">Support Bot</option>
              </select>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                Selecting a template pre-fills action and spend caps.
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 14 }}>
            {renderToolSelector(
              "Allowed Tools",
              formData.allowed_tools,
              (toolName, checked) => {
                const next = checked
                  ? [...formData.allowed_tools, toolName]
                  : formData.allowed_tools.filter((t: string) => t !== toolName);
                onFormDataChange({ ...formData, allowed_tools: next });
              }
            )}

            {renderToolSelector(
              "Blocked Tools",
              formData.blocked_tools,
              (toolName, checked) => {
                const next = checked
                  ? [...formData.blocked_tools, toolName]
                  : formData.blocked_tools.filter((t: string) => t !== toolName);
                onFormDataChange({ ...formData, blocked_tools: next });
              }
            )}

            {canUseCaps && (
              <>
                <FormField
                  label="Max Actions Per Hour"
                  value={String(formData.max_actions_per_hour || "")}
                  onChange={(value) => onFormDataChange({ ...formData, max_actions_per_hour: parseInt(value) || 0 })}
                  type="number"
                  min="0"
                  placeholder="e.g., 1000"
                />

                <FormField
                  label="Max Spend USD Per Day"
                  value={String(formData.max_spend_usd_per_day || "")}
                  onChange={(value) => onFormDataChange({ ...formData, max_spend_usd_per_day: parseFloat(value) || 0 })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 100.00"
                />

                <FormField
                  label="Max Calls Per Tool (one per line: tool:count)"
                  value={formData.max_calls_per_tool_text}
                  onChange={(value) => onFormDataChange({ ...formData, max_calls_per_tool_text: value })}
                  as="textarea"
                  placeholder={"search_docs:20\nsend_email:5"}
                />
              </>
            )}

            {canUsePricingRules && (
              <FormField
                label="Pricing Rules (one per line: tool:price)"
                value={formData.pricing_rules_text}
                onChange={(value) => onFormDataChange({ ...formData, pricing_rules_text: value })}
                as="textarea"
                placeholder={"search_docs:0.01\nsend_email:0.03"}
              />
            )}
          </div>
        </div>

        {lockedFeatures.length > 0 && (
          <div style={{
            border: "1px solid #fcd34d",
            borderRadius: 10,
            padding: 12,
            background: "#fffbeb"
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase", marginBottom: 6 }}>
              Locked on current plan
            </div>
            <div style={{ fontSize: 12, color: "#92400e", marginBottom: 10, lineHeight: 1.45 }}>
              {lockedFeatures.join(" • ")}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {!canUseTemplates && (
                <div>
                  <FormField
                    label="Template"
                    value={template}
                    disabled
                  />
                  <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>
                    Available in Pro+
                  </div>
                </div>
              )}

              {!canUseCaps && (
                <>
                  <FormField
                    label="Max Actions Per Hour"
                    value={String(formData.max_actions_per_hour || "")}
                    disabled
                  />
                  <FormField
                    label="Max Spend USD Per Day"
                    value={String(formData.max_spend_usd_per_day || "")}
                    disabled
                  />
                  <FormField
                    label="Max Calls Per Tool (one per line: tool:count)"
                    value={formData.max_calls_per_tool_text}
                    as="textarea"
                    disabled
                  />
                  <div style={{ fontSize: 11, color: "#92400e", marginTop: -4 }}>
                    Available in Starter+
                  </div>
                </>
              )}

              {!canUsePricingRules && (
                <div>
                  <FormField
                    label="Pricing Rules (one per line: tool:price)"
                    value={formData.pricing_rules_text}
                    as="textarea"
                    disabled
                  />
                  <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>
                    Available in Pro+
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onSubmit}
            disabled={loading || !agentId}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading || !agentId ? "not-allowed" : "pointer",
              opacity: loading || !agentId ? 0.6 : 1
            }}
          >
            {loading ? "Creating..." : "Create Policy"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              background: "#f3f4f6",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1000
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          borderRadius: 16,
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
          maxWidth: 500,
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          zIndex: 1001,
          padding: 24
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          {title}
        </div>
        {children}
      </div>
    </>
  );
}

function FormField({
  label,
  value,
  onChange,
  disabled,
  ...props
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  [key: string]: any;
}) {
  const { as, ...inputProps } = props;
  const isTextarea = as === "textarea";
  const InputComponent = isTextarea ? "textarea" : "input";

  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {label}
      </label>
      <InputComponent
        value={value}
        onChange={(e: any) => onChange?.(e.target.value)}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #ddd",
          borderRadius: 8,
          fontSize: 13,
          fontFamily: isTextarea ? "inherit" : "monospace",
          minHeight: isTextarea ? 100 : "auto",
          background: disabled ? "#f9f9f9" : "white",
          color: disabled ? "#999" : "#111",
          cursor: disabled ? "not-allowed" : "text",
          resize: isTextarea ? "vertical" : "none"
        }}
        {...inputProps}
      />
    </div>
  );
}

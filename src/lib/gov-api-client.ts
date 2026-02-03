/**
 * API client functions for Tools & Policies governance endpoints
 * Wraps the base apiGet/apiPost/apiDelete functions with proper typing
 */

import { ToolCreatePayload, ToolResp, ToolListItem, PolicyResp, PolicyUpsertPayload } from "./hooks";
import { apiGet, apiPost, apiDelete } from "./api";

// ==================== TOOLS API ====================

/**
 * Get a single tool from registry
 */
export async function getTool(
  toolName: string,
  scopeId: string = "global"
): Promise<ToolResp> {
  return apiGet<ToolResp>(
    `/v1/tools/${encodeURIComponent(toolName)}?scope_id=${encodeURIComponent(scopeId)}`
  );
}

/**
 * List all tools in a scope
 */
export async function listTools(scopeId: string = "global"): Promise<ToolListItem[]> {
  return apiGet<ToolListItem[]>(`/v1/tools?scope_id=${encodeURIComponent(scopeId)}`);
}

/**
 * Create or update a tool
 */
export async function upsertTool(payload: ToolCreatePayload): Promise<ToolResp> {
  // Ensure scope_id defaults to "global"
  const data = {
    ...payload,
    scope_id: payload.scope_id || "global",
    auth: {
      type: "hmac_sha256" as const,
      secret: payload.auth.secret
    }
  };

  return apiPost<ToolResp>("/v1/tools", data);
}

/**
 * Toggle tool enabled/disabled state
 */
export async function toggleTool(
  toolName: string,
  enabled: boolean,
  scopeId: string = "global"
): Promise<{ name: string; enabled: boolean }> {
  return apiPost(
    `/v1/tools/${encodeURIComponent(toolName)}/toggle?scope_id=${encodeURIComponent(scopeId)}`,
    { enabled }
  );
}

/**
 * Delete a tool from registry
 */
export async function deleteTool(
  toolName: string,
  scopeId: string = "global"
): Promise<{ ok: boolean; deleted: string; scope_id: string }> {
  return apiDelete(
    `/v1/tools/${encodeURIComponent(toolName)}?scope_id=${encodeURIComponent(scopeId)}`
  );
}

// ==================== POLICIES API ====================

/**
 * Get policy for an agent
 */
export async function getPolicy(agentId: string): Promise<PolicyResp> {
  return apiGet<PolicyResp>(`/v1/policies/${encodeURIComponent(agentId)}`);
}

/**
 * List all policies for the user
 */
export async function listPolicies(): Promise<PolicyResp[]> {
  return apiGet<PolicyResp[]>(`/v1/policies`);
}

/**
 * Create or update agent policy
 */
export async function upsertPolicy(
  agentId: string,
  payload: Partial<PolicyUpsertPayload>
): Promise<PolicyResp> {
  return apiPost<PolicyResp>(`/v1/policies/${encodeURIComponent(agentId)}`, {
    agent_id: agentId,
    ...payload
  });
}

/**
 * Create policy from template
 */
export async function createPolicyFromTemplate(
  agentId: string,
  template: "strict" | "moderate" | "permissive" | "read_only" | "support_bot",
  overrides?: Record<string, any>
): Promise<PolicyResp> {
  return apiPost<PolicyResp>(`/v1/policies/${encodeURIComponent(agentId)}/from-template`, {
    agent_id: agentId,
    template,
    overrides
  });
}

// ==================== AGENT LIFECYCLE API ====================

/**
 * Disable an agent (kill switch)
 */
export async function disableAgent(
  agentId: string,
  reason?: string
): Promise<{ agent_id: string; is_enabled: boolean; disabled_reason?: string; disabled_at?: string }> {
  return apiPost(
    `/v1/agents/${encodeURIComponent(agentId)}/disable`,
    { reason }
  );
}

/**
 * Enable a previously disabled agent
 */
export async function enableAgent(
  agentId: string
): Promise<{ agent_id: string; is_enabled: boolean }> {
  return apiPost(
    `/v1/agents/${encodeURIComponent(agentId)}/enable`,
    {}
  );
}

/**
 * Get agent audit logs
 */
export async function getAgentLogs(
  agentId: string,
  limit: number = 100
): Promise<Array<any>> {
  return apiGet(`/v1/agents/${encodeURIComponent(agentId)}/logs?limit=${limit}`);
}

/**
 * Get agent metrics
 */
export async function getAgentMetrics(
  agentId: string,
  period: "hour" | "day" | "week" = "day"
): Promise<{
  agent_id: string;
  period: string;
  total_actions: number;
  blocked_actions: number;
  total_spend_usd: number;
  top_tools: Array<{ tool: string; count: number }>;
}> {
  return apiGet(
    `/v1/agents/${encodeURIComponent(agentId)}/metrics?period=${period}`
  );
}

// ==================== ERROR HANDLING ====================

export class GovApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "GovApiError";
  }
}

/**
 * Parse error response and throw GovApiError
 */
export async function handleGovApiError(response: Response): Promise<never> {
  let data: any = {};
  try {
    data = await response.json();
  } catch (e) {
    // Response is not JSON
  }

  const message = data.detail?.message || data.message || response.statusText;
  const code = data.detail?.error || "UNKNOWN_ERROR";

  throw new GovApiError(response.status, code, message, data.detail);
}

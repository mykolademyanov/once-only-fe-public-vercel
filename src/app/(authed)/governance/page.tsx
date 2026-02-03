"use client";

import { useEffect, useState } from "react";
import { useMe, useToolsGroupedByScope, ToolListItem } from "@/lib/hooks";
import { upsertTool, deleteTool, toggleTool, upsertPolicy, getPolicy } from "@/lib/gov-api-client";

export default function GovPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"tools" | "policies">("tools");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolListItem | null>(null);
  const [globalError, setGlobalError] = useState("");

  // Policies state
  const [agentId, setAgentId] = useState("");
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyFormData, setPolicyFormData] = useState({
    allowed_tools: [] as string[],
    blocked_tools: [] as string[],
    max_actions_per_hour: 0,
    max_spend_usd_per_day: 0,
  });
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState("");

  // Display existing policy
  const [currentPolicy, setCurrentPolicy] = useState<any | null>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [searchAgentId, setSearchAgentId] = useState("");

  // Auto-refresh data every 10 seconds
  useEffect(() => {
    const id = window.setInterval(() => setRefreshKey((x) => x + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const me = useMe(refreshKey);
  const toolsGrouped = useToolsGroupedByScope(refreshKey);

  // Status checks
  const paymentRequired = me.error?.status === 402;
  const rateLimited = me.error?.status === 429;
  const inactive = me.data ? !me.data.is_active : false;
  const isPro = (me.data?.plan ?? "free") === "pro" || (me.data?.plan ?? "free") === "agency";

  // Show content only for pro/agency plans
  const showContent = !me.loading && isPro && !paymentRequired && !inactive && !rateLimited;

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
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "10px 16px",
            background: "#111",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.2s"
          }} onMouseOver={(e) => { (e.target as HTMLButtonElement).style.background = "#333"; }} onMouseOut={(e) => { (e.target as HTMLButtonElement).style.background = "#111"; }}>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
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
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 16
                }}>
                  {tools.map((tool) => (
                    <ToolCard
                      key={`${scopeId}-${tool.name}`}
                      tool={tool}
                      scopeId={scopeId}
                      onEdit={() => setEditingTool(tool)}
                      onDelete={async () => {
                        if (!confirm(`Delete tool "${tool.name}"?`)) return;
                        try {
                          await deleteTool(tool.name, scopeId);
                          setRefreshKey(x => x + 1);
                        } catch (err: any) {
                          setGlobalError(`Failed to delete tool: ${err.message}`);
                        }
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
                style={{
                  padding: "10px 16px",
                  background: "#111",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}>
                Create First Tool
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
            Define governance rules and tool access controls for your agents.
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
            });
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

      {/* Search existing policy */}
      <div style={{
        padding: 20,
        background: "linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)",
        borderRadius: 12,
        border: "1px solid #e0e7ff",
        marginBottom: 24
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4f46e5", marginBottom: 12 }}>
          📋 View Existing Policy
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Enter agent ID (e.g., agent_123)"
            value={searchAgentId}
            onChange={(e) => setSearchAgentId(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                loadPolicy(searchAgentId);
              }
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <button
            onClick={() => loadPolicy(searchAgentId)}
            disabled={loadingPolicy || !searchAgentId}
            style={{
              padding: "10px 16px",
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: loadingPolicy ? "not-allowed" : "pointer",
              opacity: loadingPolicy || !searchAgentId ? 0.6 : 1
            }}>
            {loadingPolicy ? "Loading..." : "Search"}
          </button>
        </div>
      </div>

      {/* Display current policy */}
      {currentPolicy && (
        <div style={{
          padding: 20,
          background: "linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)",
          borderRadius: 12,
          border: "2px solid #4f46e5",
          marginBottom: 24
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#4f46e5", marginBottom: 16 }}>
            ✅ Policy Found: <span style={{ fontFamily: "monospace", color: "#111" }}>{currentPolicy.agent_id}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Allowed Tools */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>
                ✓ Allowed Tools
              </div>
              {currentPolicy.policy?.allowed_tools?.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {currentPolicy.policy.allowed_tools.map((tool: string) => (
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
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>
                ✗ Blocked Tools
              </div>
              {currentPolicy.policy?.blocked_tools?.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {currentPolicy.policy.blocked_tools.map((tool: string) => (
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
                <div style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>None blocked</div>
              )}
            </div>
          </div>

          {/* Limits */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            padding: "12px 0",
            borderTop: "1px solid #e0e7ff",
            marginBottom: 16
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4 }}>
                Max Actions Per Hour
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>
                {currentPolicy.policy?.max_actions_per_hour ? `${currentPolicy.policy.max_actions_per_hour.toLocaleString()}` : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4 }}>
                Max Spend Per Day
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>
                ${(currentPolicy.policy?.max_spend_usd_per_day || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setAgentId(currentPolicy.agent_id);
                setPolicyFormData({
                  allowed_tools: currentPolicy.policy?.allowed_tools || [],
                  blocked_tools: currentPolicy.policy?.blocked_tools || [],
                  max_actions_per_hour: currentPolicy.policy?.max_actions_per_hour || 0,
                  max_spend_usd_per_day: currentPolicy.policy?.max_spend_usd_per_day || 0,
                });
                setShowPolicyModal(true);
              }}
              style={{
                padding: "8px 16px",
                background: "#fef3c7",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "#92400e",
                cursor: "pointer",
                transition: "opacity 0.2s"
              }} onMouseOver={(e) => { (e.target as HTMLButtonElement).style.opacity = "0.8"; }} onMouseOut={(e) => { (e.target as HTMLButtonElement).style.opacity = "1"; }}>
              ✏️ Edit Policy
            </button>
            <button
              onClick={() => {
                setCurrentPolicy(null);
                setSearchAgentId("");
              }}
              style={{
                padding: "8px 16px",
                background: "#f3f4f6",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "#666",
                cursor: "pointer"
              }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loadingPolicy && !currentPolicy && (
        <div style={{
          padding: 24,
          background: "linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)",
          borderRadius: 12,
          border: "1px solid #e0e7ff",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
            Create a new policy to manage tool access and spending limits for your agents.
          </div>

          <button
            onClick={() => {
              setAgentId("");
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
              cursor: "pointer"
            }}>
            Create Your First Policy
          </button>
        </div>
      )}
    </section>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
      {/* --- HEADER --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
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

      {/* --- PLAN CHECK --- */}
      {me.loading ? (
        <div style={{
          height: 80,
          background: "#f3f4f6",
          borderRadius: 16,
          border: "1px solid #eee"
        }} />
      ) : !isPro ? (
        <div style={{
          border: "1px solid #fca5a5",
          borderRadius: 16,
          padding: 20,
          background: "#fef2f2"
        }}>
          <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>
            Governance Features Require Pro Plan
          </div>
          <div style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 12 }}>
            Tools registry and agent policies are only available for Pro and Agency plans.
          </div>
          <button style={{
            padding: "8px 16px",
            background: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.2s"
          }} onMouseOver={(e) => { (e.target as HTMLButtonElement).style.background = "#b91c1c"; }} onMouseOut={(e) => { (e.target as HTMLButtonElement).style.background = "#dc2626"; }}>
            Upgrade to Pro
          </button>
        </div>
      ) : null}

      {/* --- TABS --- */}
      {showContent && (
        <>
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #eee" }}>
            {["tools", "policies"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "tools" | "policies")}
                style={{
                  padding: "12px 20px",
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

      {showPolicyModal && (
        <CreatePolicyModal
          agentId={agentId}
          onAgentIdChange={setAgentId}
          formData={policyFormData}
          onFormDataChange={setPolicyFormData}
          allTools={allTools}
          loading={policyLoading}
          error={policyError}
          onClose={() => setShowPolicyModal(false)}
          onSubmit={async () => {
            setPolicyLoading(true);
            setPolicyError("");
            try {
              await upsertPolicy(agentId, {
                agent_id: agentId,
                allowed_tools: policyFormData.allowed_tools.length > 0 ? policyFormData.allowed_tools : undefined,
                blocked_tools: policyFormData.blocked_tools.length > 0 ? policyFormData.blocked_tools : undefined,
                max_actions_per_hour: policyFormData.max_actions_per_hour > 0 ? policyFormData.max_actions_per_hour : undefined,
                max_spend_usd_per_day: policyFormData.max_spend_usd_per_day > 0 ? policyFormData.max_spend_usd_per_day : undefined,
              });
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
  onDelete: () => Promise<void>;
  onToggle: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      await onToggle();
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
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: 12,
        padding: "12px 0",
        borderTop: "1px solid #f3f4f6",
        borderBottom: "1px solid #f3f4f6"
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>Timeout</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginTop: 2 }}>
            {tool.timeout_ms}ms
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>Max Retries</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginTop: 2 }}>
            {tool.max_retries}
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

        <div style={{ display: "flex", gap: 8 }}>
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
    description: tool.description || ""
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
          secret: ""
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

        <div style={{ display: "flex", gap: 8 }}>
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
  loading,
  error,
  onClose,
  onSubmit
}: {
  agentId: string;
  onAgentIdChange: (value: string) => void;
  formData: any;
  onFormDataChange: (value: any) => void;
  allTools: ToolListItem[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
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

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Allowed Tools (select tools this agent CAN use)
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
                <label key={tool.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.allowed_tools.includes(tool.name)}
                    onChange={(e) => {
                      const newAllowed = e.target.checked
                        ? [...formData.allowed_tools, tool.name]
                        : formData.allowed_tools.filter((t: string) => t !== tool.name);
                      onFormDataChange({ ...formData, allowed_tools: newAllowed });
                    }}
                  />
                  <span style={{ fontSize: 12 }}>{tool.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Blocked Tools (select tools this agent CANNOT use)
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
                <label key={`blocked-${tool.name}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.blocked_tools.includes(tool.name)}
                    onChange={(e) => {
                      const newBlocked = e.target.checked
                        ? [...formData.blocked_tools, tool.name]
                        : formData.blocked_tools.filter((t: string) => t !== tool.name);
                      onFormDataChange({ ...formData, blocked_tools: newBlocked });
                    }}
                  />
                  <span style={{ fontSize: 12 }}>{tool.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <FormField
          label="Max Actions Per Hour (optional)"
          value={String(formData.max_actions_per_hour || "")}
          onChange={(value) => onFormDataChange({ ...formData, max_actions_per_hour: parseInt(value) || 0 })}
          type="number"
          min="0"
          placeholder="e.g., 1000"
        />

        <FormField
          label="Max Spend USD Per Day (optional)"
          value={String(formData.max_spend_usd_per_day || "")}
          onChange={(value) => onFormDataChange({ ...formData, max_spend_usd_per_day: parseFloat(value) || 0 })}
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g., 100.00"
        />

        <div style={{ display: "flex", gap: 8 }}>
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
  const isTextarea = props.as === "textarea";
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
        {...(isTextarea ? {} : props)}
      />
    </div>
  );
}

export type AgentLabel = "saima" | "kiran";
export type OrderChannel = "self_checkout" | "call_center_agent" | "ai_agent";

const AGENT_LABELS: AgentLabel[] = ["saima", "kiran"];

export function getAgentLabelFromLabels(
  labels: string[] | undefined,
): AgentLabel | null {
  if (!labels?.length) return null;
  const normalized = labels.map((label) => label.toLowerCase());
  return AGENT_LABELS.find((label) => normalized.includes(label)) ?? null;
}

export function getOrderChannelFromAgentLabel(
  agentLabel: AgentLabel | null,
): OrderChannel {
  return agentLabel ? "call_center_agent" : "self_checkout";
}

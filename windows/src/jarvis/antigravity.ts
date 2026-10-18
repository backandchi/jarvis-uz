/**
 * Antigravity integratsiyasi — AGY agent holati va buyruqlari
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { State } from "../core/state";

export interface AgentSession {
  id: string;
  name: string;
  state: "working" | "waiting" | "done" | "error";
  currentStep?: string;
  pendingApproval?: { tool: string; command: string };
}

export function getActiveSessions(): AgentSession[] {
  if (!State.tasks) return [];
  return State.tasks.map((t: any) => ({
    id: t.id,
    name: t.name,
    state: t.state === "working" ? "working"
         : t.state === "approval" ? "waiting"
         : t.state === "finished" ? "done"
         : t.state === "error" ? "error"
         : "working",
    currentStep: t.steps && t.steps.length ? t.steps[t.steps.length - 1] : undefined,
    pendingApproval: t.state === "approval" && t.approvalInfo
      ? { tool: t.approvalInfo.tool, command: t.approvalInfo.command }
      : undefined,
  }));
}

export function describeAgentStatus(): string {
  const sessions = getActiveSessions();
  if (sessions.length === 0) return "Hozir hech qanday agent ishlamayapti.";

  const parts = sessions.map(s => {
    const stateText = {
      working: "ishlayapti",
      waiting: "SIZNING RUXSATINGIZNI KUTMOQDA",
      done: "tugalladi",
      error: "xato bilan to'xtadi",
    }[s.state];
    return `${s.name} ${stateText}${s.currentStep ? `: ${s.currentStep}` : ""}`;
  });

  return `${sessions.length} ta agent: ${parts.join("; ")}.`;
}

export async function approveAgent(sessionId: string): Promise<void> {
  await invoke("approve_hook", { sessionId, decision: "allow" });
}

export async function denyAgent(sessionId: string): Promise<void> {
  await invoke("approve_hook", { sessionId, decision: "deny" });
}

export async function sendToAgent(sessionId: string, message: string): Promise<void> {
  await invoke("send_to_agent", { sessionId, message });
}

export async function listenAgentEvents(
  onApproval: (session: AgentSession) => void,
  onFinished: (session: AgentSession) => void
) {
  await listen("hook_event", (event: any) => {
    const sessions = getActiveSessions();
    const session = sessions.find(s => s.id === event.payload?.sessionId);
    if (!session) return;

    if (session.state === "waiting") onApproval(session);
    if (session.state === "done")    onFinished(session);
  });
}

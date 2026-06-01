import type { SetupStatusPayload } from "../types/setupApi";
import { listCoreSetupSteps } from "./setupCoreSteps";

/** Mensagem legível quando o servidor ainda marca passos core como pendentes. */
export function describePendingSetupSteps(status: SetupStatusPayload): string {
  const pending = listCoreSetupSteps(status).filter((s) => !s.done);
  if (pending.length === 0) {
    return status.message?.trim() || "O servidor ainda não marcou a configuração como concluída.";
  }
  return `Ainda pendente: ${pending.map((s) => s.label).join("; ")}.`;
}

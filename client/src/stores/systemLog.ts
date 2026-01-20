import { appState } from "./appState";

const MAX_SYSTEM_LOG = 15;

export function pushSystemLog(message: string | string[]) {
  const list = Array.isArray(message) ? message : [message];
  const normalized = list.map((m) => String(m)).filter((m) => m.trim().length > 0);
  if (normalized.length === 0) return;
  const current = Array.isArray(appState.systemLog) ? appState.systemLog : [];
  const next = [...current, ...normalized];
  if (next.length > MAX_SYSTEM_LOG) {
    next.splice(0, next.length - MAX_SYSTEM_LOG);
  }
  appState.systemLog = next;
}

export function clearSystemLog() {
  appState.systemLog = [];
}


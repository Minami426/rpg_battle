const API_BASE = "/api";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) {
    const msg = body?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export const api = {
  register: (username: string, password: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  getState: () => request("/state"),
  saveState: (currentFloor: number, state: any) =>
    request("/state", { method: "PUT", body: JSON.stringify({ currentFloor, state }) }),
  resetState: () => request("/state/reset", { method: "POST" }),
  startBattle: (payload?: { floor: number; party: string[]; state: any }) =>
    request("/battle/start", { method: "POST", body: JSON.stringify(payload ?? {}) }),
  actBattle: (payload: { battleId: string; actorId: string; action: any; targetIds: string[] }) =>
    request("/battle/act", { method: "POST", body: JSON.stringify(payload) }),
  getBattle: (battleId: string) => request(`/battle/${battleId}`),
  saveRun: (run: any) => request("/runs", { method: "POST", body: JSON.stringify(run) }),
  listRuns: () => request("/runs"),
  ranking: () => request("/ranking"),
  flowQuit: (run: any, state: any) =>
    request("/flow/quit", { method: "POST", body: JSON.stringify({ run, state }) }),
  flowGameOver: (run: any) =>
    request("/flow/game_over", { method: "POST", body: JSON.stringify({ run }) }),
  applyBattleDelta: (payload: { state: any; delta: any; persist?: boolean; currentFloor?: number }) =>
    request("/state/apply-battle", { method: "POST", body: JSON.stringify(payload) }),
  applyItem: (payload: { state: any; itemId: string; targetCharacterId: string }) =>
    request("/state/apply-item", { method: "POST", body: JSON.stringify(payload) }),
};


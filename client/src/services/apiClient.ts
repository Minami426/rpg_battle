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

// FormData用リクエスト（画像アップロード用）
async function requestFormData(path: string, formData: FormData) {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    method: "POST",
    body: formData,
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
  allocateExp: (payload: { state: any; allocations: { kind: "character" | "skill"; id: string; amount: number }[] }) =>
    request("/state/allocate-exp", { method: "POST", body: JSON.stringify(payload) }),

  // ========== 管理者API ==========
  adminLogin: (username: string, password: string) =>
    request("/admin/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  adminLogout: () => request("/admin/logout", { method: "POST" }),
  adminSession: () => request("/admin/session"),

  // Characters
  adminGetCharacters: () => request("/admin/characters"),
  adminCreateCharacter: (data: any) =>
    request("/admin/characters", { method: "POST", body: JSON.stringify(data) }),
  adminUpdateCharacter: (id: string, data: any) =>
    request(`/admin/characters/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  adminDeleteCharacter: (id: string) =>
    request(`/admin/characters/${id}`, { method: "DELETE" }),
  adminUploadCharacterImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return requestFormData(`/admin/characters/${id}/image`, formData);
  },

  // Skills
  adminGetSkills: () => request("/admin/skills"),
  adminCreateSkill: (data: any) =>
    request("/admin/skills", { method: "POST", body: JSON.stringify(data) }),
  adminUpdateSkill: (id: string, data: any) =>
    request(`/admin/skills/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  adminDeleteSkill: (id: string) =>
    request(`/admin/skills/${id}`, { method: "DELETE" }),

  // Items
  adminGetItems: () => request("/admin/items"),
  adminCreateItem: (data: any) =>
    request("/admin/items", { method: "POST", body: JSON.stringify(data) }),
  adminUpdateItem: (id: string, data: any) =>
    request(`/admin/items/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  adminDeleteItem: (id: string) =>
    request(`/admin/items/${id}`, { method: "DELETE" }),

  // Conditions
  adminGetConditions: () => request("/admin/conditions"),
  adminCreateCondition: (data: any) =>
    request("/admin/conditions", { method: "POST", body: JSON.stringify(data) }),
  adminUpdateCondition: (id: string, data: any) =>
    request(`/admin/conditions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  adminDeleteCondition: (id: string) =>
    request(`/admin/conditions/${id}`, { method: "DELETE" }),

  // Enemies
  adminGetEnemies: () => request("/admin/enemies"),
  adminCreateEnemy: (data: any) =>
    request("/admin/enemies", { method: "POST", body: JSON.stringify(data) }),
  adminUpdateEnemy: (id: string, data: any) =>
    request(`/admin/enemies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  adminDeleteEnemy: (id: string) =>
    request(`/admin/enemies/${id}`, { method: "DELETE" }),
  adminUploadEnemyImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return requestFormData(`/admin/enemies/${id}/image`, formData);
  },
};


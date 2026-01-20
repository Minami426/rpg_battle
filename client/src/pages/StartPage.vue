<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import router from "../router";
import { api } from "../services/apiClient";
import { appState } from "../stores/appState";
import { clearSystemLog } from "../stores/systemLog";

const username = computed(() => appState.user.username || "(unknown)");
const cursor = ref(0);
const defaultItems = { potion: 3, ether: 1 };

const hasProgress = computed(() => {
  const st = appState.state;
  if (!st) return false;
  if ((st.currentFloor ?? 1) > 1) return true;
  if ((st.expStock ?? 0) > 0) return true;
  if ((st.party ?? []).length > 0) return true;
  if (Object.values(st.characters ?? {}).some((c: any) => (c?.level ?? 1) > 1 || (c?.exp ?? 0) > 0)) {
    return true;
  }
  const items = st.items ?? {};
  const keys = new Set([...Object.keys(items), ...Object.keys(defaultItems)]);
  for (const k of keys) {
    if ((items as any)[k] !== (defaultItems as any)[k]) return true;
  }
  return false;
});

const actions = computed(() => [
  { id: "continue", label: "続きから", enabled: hasProgress.value },
  { id: "new", label: "初めから", enabled: true },
  { id: "logout", label: "ログアウト", enabled: true },
] as const);

const gameStart = () => {
  const resume = appState.state?.resume?.screen || "start";
  if (resume === "party_select") router.push("/party");
  else if (resume === "menu") router.push("/menu");
  else router.push("/party");
};

const gameNew = async () => {
  const res = await api.resetState();
  appState.state = res.data?.state ?? appState.state;
  appState.battle = null;
  appState.maxDamageCurrentRun = 0;
  clearSystemLog();
  router.push("/party");
};

const logout = async () => {
  await api.logout().catch(() => {});
  appState.user = { userId: null, username: null };
  appState.state = null;
  clearSystemLog();
  router.push("/login");
};

const onKey = (e: KeyboardEvent) => {
  if (!["ArrowUp", "ArrowDown", "Enter"].includes(e.key)) return;
  e.preventDefault();
  if (e.key === "ArrowUp") cursor.value = (cursor.value - 1 + actions.value.length) % actions.value.length;
  if (e.key === "ArrowDown") cursor.value = (cursor.value + 1) % actions.value.length;
  if (e.key === "Enter") {
    const action = actions.value[cursor.value];
    if (!action.enabled) return;
    if (action.id === "continue") gameStart();
    if (action.id === "new") gameNew();
    if (action.id === "logout") logout();
  }
};

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="panel">
    <h1>Start</h1>
    <p>ようこそ、{{ username }} さん</p>
    <div class="actions">
      <button
        v-for="(action, idx) in actions"
        :key="action.id"
        :disabled="!action.enabled"
        :class="[{ selected: cursor === idx }, action.id === 'logout' ? 'btn-danger' : '']"
        @click="action.id === 'continue' ? gameStart() : action.id === 'new' ? gameNew() : logout()"
      >
        {{ action.label }}
      </button>
    </div>
    <small class="hint">↑↓で選択 / Enterで決定</small>
  </div>
</template>

<style scoped>
.panel { max-width: 360px; margin: 0 auto; background: #222; padding: 16px; border: 1px solid #444; height: 840px; overflow: hidden; display: flex; flex-direction: column; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
button { padding: 8px 12px; }
.selected { outline: 2px solid #6cf; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger { border-color: #933; background: #2a0f0f; color: #fbb; }
.hint { color: #aaa; display: block; margin-top: 8px; }
</style>


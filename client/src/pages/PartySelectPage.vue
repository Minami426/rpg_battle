<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import router from "../router";
import { api } from "../services/apiClient";
import { appState } from "../stores/appState";

const masters = ref<any>(null);
const error = ref("");
const focus = ref<"list" | "actions">("list");
const listCursor = ref(0);
const actionCursor = ref(0);
const actions = ["決定", "戻る", "ログアウト"] as const;

const loadMaster = async () => {
  if (masters.value) return;
  try {
    const res = await fetch("/api/master", { credentials: "include" });
    const body = await res.json();
    masters.value = body.data;
  } catch (e: any) {
    error.value = e.message;
  }
};
loadMaster();

const party = computed(() => appState.state?.party || []);
const characters = computed(() => masters.value?.characters?.data ?? []);

const toggle = (id: string) => {
  if (!appState.state) return;
  const arr = [...(appState.state.party ?? [])];
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1);
  else if (arr.length < 3) arr.push(id);
  appState.state.party = arr;
};

const decide = async () => {
  if (!appState.state || (appState.state.party?.length ?? 0) !== 3) {
    error.value = "3人選択してください";
    return;
  }
  // 要件: 保存は終了/全滅のみ。ここではローカル状態のまま戦闘開始へ。
  appState.battle = null;
  router.push("/battle");
};

const logout = async () => {
  const ok = window.confirm("未保存の進捗は破棄されます。ログアウトしますか？");
  if (!ok) return;
  await api.logout().catch(() => {});
  appState.user = { userId: null, username: null };
  appState.state = null;
  appState.battle = null;
  appState.maxDamageCurrentRun = 0;
  router.push("/login");
};

const onKey = (e: KeyboardEvent) => {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) return;
  e.preventDefault();

  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    focus.value = focus.value === "list" ? "actions" : "list";
    return;
  }

  if (focus.value === "list") {
    const len = characters.value.length || 1;
    if (e.key === "ArrowUp") listCursor.value = (listCursor.value - 1 + len) % len;
    if (e.key === "ArrowDown") listCursor.value = (listCursor.value + 1) % len;
    if (e.key === "Enter") {
      const c = characters.value[listCursor.value];
      if (c) toggle(c.id);
    }
    return;
  }

  if (focus.value === "actions") {
    const len = actions.length;
    if (e.key === "ArrowUp") actionCursor.value = (actionCursor.value - 1 + len) % len;
    if (e.key === "ArrowDown") actionCursor.value = (actionCursor.value + 1) % len;
    if (e.key === "Enter") {
      const act = actions[actionCursor.value];
      if (act === "決定") decide();
      if (act === "戻る") router.push("/start");
      if (act === "ログアウト") logout();
    }
  }
};

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="panel">
    <h1>パーティ選択 (3人)</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="list" v-if="masters">
      <div
        v-for="(c, idx) in masters.characters.data"
        :key="c.id"
        class="card"
        :class="{ selected: party.includes(c.id), cursor: focus==='list' && listCursor===idx }"
        @click="toggle(c.id)"
      >
        <div class="name">{{ c.name }}</div>
        <div class="desc">{{ c.description }}</div>
      </div>
    </div>
    <div class="actions">
      <button :disabled="party.length !== 3" :class="{ cursor: focus==='actions' && actionCursor===0 }" @click="decide">決定</button>
      <button :class="{ cursor: focus==='actions' && actionCursor===1 }" @click="router.push('/start')">戻る</button>
      <button :class="{ cursor: focus==='actions' && actionCursor===2 }" @click="logout">ログアウト</button>
      <small class="hint">↑↓で選択 / Enterで決定 / ←→で領域切替</small>
    </div>
  </div>
</template>

<style scoped>
.panel { max-width: 640px; margin: 0 auto; background: #222; padding: 16px; border: 1px solid #444; }
.list { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
.card { padding: 8px; border: 1px solid #444; cursor: pointer; }
.card.selected { border-color: #6cf; background: #113; }
.card.cursor { outline: 2px solid #6cf; }
.name { font-weight: bold; }
.desc { font-size: 12px; color: #ccc; }
.actions { margin-top: 12px; display: flex; gap: 8px; }
.actions .cursor { outline: 2px solid #6cf; }
.hint { color: #aaa; margin-left: 8px; }
.error { color: #f66; }
button { padding: 8px 12px; }
</style>


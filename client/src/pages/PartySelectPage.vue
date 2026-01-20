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
const username = computed(() => appState.user.username || "(unknown)");
const floor = computed(() => appState.state?.currentFloor ?? 1);

const selectedCharacters = computed(() =>
  party.value.map((id) => {
    const m = characters.value.find((c: any) => c.id === id);
    const level = appState.state?.characters?.[id]?.level ?? 1;
    return { id, name: m?.name ?? id, imagePath: m?.imagePath, level };
  })
);

const messages = computed(() => {
  const msgs: string[] = [];
  if (error.value) msgs.push(error.value);
  msgs.push("3人選択してください");
  msgs.push("Enterで選択/解除");
  return msgs;
});

const getCharacterImage = (c: any) => {
  if (!c) return "";
  if (c.imagePath) return c.imagePath;
  if (c.imageKey) return `/uploads/characters/${c.imageKey}.png`;
  return "";
};

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
  <div class="game-screen">
    <div class="top-bar">
      <div class="left">USER: {{ username }}</div>
      <div class="right">FLOOR {{ floor }}</div>
    </div>

    <div class="main-area">
      <div class="list-area" v-if="masters">
        <h2>パーティ選択 (3人)</h2>
        <div class="list">
          <div
            v-for="(c, idx) in masters.characters.data"
            :key="c.id"
            class="card"
            :class="{ selected: party.includes(c.id), cursor: focus==='list' && listCursor===idx }"
            @click="toggle(c.id)"
          >
            <div class="thumb">
              <img v-if="getCharacterImage(c)" :src="getCharacterImage(c)" :alt="c.name" />
              <div v-else class="thumb-placeholder">NO IMAGE</div>
            </div>
            <div class="info">
              <div class="name">{{ c.name }}</div>
              <div class="level">Lv {{ appState.state?.characters?.[c.id]?.level ?? 1 }}</div>
              <div class="desc">{{ c.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="selected-area">
        <h2>選択中</h2>
        <div class="slots">
          <div
            v-for="idx in 3"
            :key="idx"
            class="slot"
            :class="{ filled: !!selectedCharacters[idx - 1] }"
            @click="selectedCharacters[idx - 1] && toggle(selectedCharacters[idx - 1].id)"
          >
            <template v-if="selectedCharacters[idx - 1]">
              <img
                v-if="getCharacterImage(selectedCharacters[idx - 1])"
                :src="getCharacterImage(selectedCharacters[idx - 1])"
                :alt="selectedCharacters[idx - 1].name"
              />
              <div class="slot-name">{{ selectedCharacters[idx - 1].name }}</div>
              <div class="slot-level">Lv {{ selectedCharacters[idx - 1].level }}</div>
            </template>
            <template v-else>
              <div class="slot-empty">EMPTY</div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-area">
      <div class="log-window">
        <div v-for="(m, i) in messages" :key="i">{{ m }}</div>
      </div>
      <div class="command-window">
        <button :disabled="party.length !== 3" :class="{ cursor: focus==='actions' && actionCursor===0 }" @click="decide">決定</button>
        <button class="btn-secondary" :class="{ cursor: focus==='actions' && actionCursor===1 }" @click="router.push('/start')">戻る</button>
        <button class="btn-danger" :class="{ cursor: focus==='actions' && actionCursor===2 }" @click="logout">ログアウト</button>
        <small class="hint">↑↓で選択 / Enterで決定 / ←→で領域切替</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-screen { width: 960px; margin: 0 auto; background: #222; padding: 12px; border: 1px solid #444; height: 840px; overflow: hidden; display: flex; flex-direction: column; }
.top-bar { display: flex; justify-content: space-between; padding: 8px 12px; border: 1px solid #333; background: #111; margin-bottom: 12px; }
.main-area { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; min-height: 360px; flex: 1; overflow: hidden; }
.list-area { border: 1px solid #333; padding: 12px; background: #111; }
.list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-height: 100%; overflow-y: auto; }
.card { display: grid; grid-template-columns: 72px 1fr; gap: 8px; padding: 8px; border: 1px solid #444; cursor: pointer; align-items: center; }
.card.selected { border-color: #6cf; background: #113; }
.card.cursor { outline: 2px solid #6cf; }
.thumb { width: 80px; height: 80px; background: #000; display: flex; align-items: center; justify-content: center; border: 1px solid #333; }
.thumb img { width: 80px; height: 80px; object-fit: contain; background: #000; }
.thumb-placeholder { font-size: 10px; color: #666; }
.info { display: flex; flex-direction: column; gap: 4px; }
.name { font-weight: bold; }
.level { font-size: 12px; color: #9ad; }
.desc { font-size: 12px; color: #ccc; }
.selected-area { border: 1px solid #333; padding: 12px; background: #111; }
.slots { display: grid; grid-template-rows: repeat(3, 1fr); gap: 8px; }
.slot { border: 1px dashed #444; padding: 8px; min-height: 120px; display: grid; place-items: center; cursor: pointer; }
.slot.filled { border-style: solid; background: #0f1a2a; }
.slot img { width: 80px; height: 80px; object-fit: contain; margin-bottom: 4px; background: #000; }
.slot-name { font-weight: bold; }
.slot-level { font-size: 12px; color: #9ad; }
.slot-empty { color: #666; font-size: 12px; }
.bottom-area { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 12px; }
.log-window { border: 1px solid #333; background: #111; padding: 8px; height: calc(1.4em * 5 + 16px); overflow-y: auto; line-height: 1.4; }
.command-window { border: 1px solid #333; background: #111; padding: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.command-window .cursor { outline: 2px solid #6cf; }
.btn-secondary { border-color: #446; background: #0f1522; color: #cfe3ff; }
.btn-danger { border-color: #933; background: #2a0f0f; color: #fbb; }
.hint { color: #aaa; margin-left: 8px; }
button { padding: 8px 12px; }
</style>


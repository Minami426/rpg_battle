<script setup lang="ts">
import router from "../router";
import { api } from "../services/apiClient";
import { appState } from "../stores/appState";
import { ref, computed, onMounted, onUnmounted } from "vue";

const error = ref("");
const masters = ref<any>(null);

type Mode = "menu" | "level" | "item" | "item_target";
const mode = ref<Mode>("menu");
const cursor = ref(0);
const selectedItemId = ref<string>("");

const loadMasters = async () => {
  if (masters.value) return;
  const res = await fetch("/api/master", { credentials: "include" });
  const body = await res.json();
  masters.value = body.data;
};
onMounted(() => {
  loadMasters().catch((e: any) => (error.value = e.message));
});

const menuOptions = computed(() => [
  { id: "level", label: "レベルアップ" },
  { id: "party", label: "キャラ再選択" },
  { id: "item", label: "アイテム使用" },
  { id: "stats", label: "戦績/ランキング" },
  { id: "next", label: "次の戦闘" },
  { id: "quit", label: "ゲーム終了" },
]);

const ownedItems = computed(() => {
  if (!masters.value || !appState.state) return [];
  const owned = appState.state.items ?? {};
  return masters.value.items.data
    .map((it: any) => ({ ...it, qty: owned[it.id] ?? 0 }))
    .filter((it: any) => it.qty > 0);
});

const partyTargets = computed(() => {
  if (!appState.state || !masters.value) return [];
  const party = appState.state.party ?? [];
  return party.map((cid) => {
    const m = masters.value.characters.data.find((c: any) => c.id === cid);
    return { id: cid, label: m ? m.name : cid };
  });
});

const nextBattle = async () => {
  // 要件: 保存は終了/全滅のみ。階層突破ではDB保存しない。
  if (!appState.state) return;
  appState.state.currentFloor = (appState.state.currentFloor ?? 1) + 1;
  appState.battle = null;
  router.push("/battle");
};

const openMenu = () => {
  mode.value = "menu";
  cursor.value = 0;
  selectedItemId.value = "";
};

const openLevel = () => {
  mode.value = "level";
  cursor.value = 0;
};

const openItem = () => {
  mode.value = "item";
  cursor.value = 0;
  selectedItemId.value = "";
};

const openItemTarget = (itemId: string) => {
  selectedItemId.value = itemId;
  mode.value = "item_target";
  cursor.value = 0;
};

const useItemOn = async (targetCharacterId: string) => {
  if (!appState.state || !selectedItemId.value) return;
  const res = await api.applyItem({ state: appState.state, itemId: selectedItemId.value, targetCharacterId });
  appState.state = res.data?.state ?? appState.state;
  // 使用後はメニューへ戻る（同画面内完結）
  openMenu();
};

const buildRunStatsForQuit = () => {
  const st: any = appState.state ?? {};
  const characterLevels: Record<string, number> = {};
  const skillLevels: Record<string, number> = {};
  Object.entries(st.characters ?? {}).forEach(([cid, c]: any) => (characterLevels[cid] = c.level ?? 1));
  Object.entries(st.skills ?? {}).forEach(([sid, s]: any) => (skillLevels[sid] = s.level ?? 1));
  return {
    schemaVersion: 1,
    endedReason: "quit",
    maxFloorReached: st.currentFloor ?? 1,
    maxDamage: appState.maxDamageCurrentRun ?? st.currentRunMaxDamage ?? 0,
    characterLevels,
    skillLevels,
    items: st.items ?? {},
    hpMp: st.characters ?? {},
  };
};

const quitGame = async () => {
  try {
    if (appState.state) {
      appState.state.resume = { screen: "menu" };
    }
    await api.flowQuit(
      {
        start_at: null,
        end_at: new Date().toISOString(),
        max_floor_reached: appState.state?.currentFloor ?? 1,
        max_damage: appState.maxDamageCurrentRun ?? 0,
        run_stats_json: buildRunStatsForQuit(),
      },
      {
        currentFloor: appState.state?.currentFloor ?? 1,
        state: appState.state,
      }
    );
    appState.user = { userId: null, username: null };
    appState.state = null;
    appState.battle = null;
    appState.maxDamageCurrentRun = 0;
    router.push("/login");
  } catch (e: any) {
    error.value = e.message;
  }
};

const onKey = async (e: KeyboardEvent) => {
  if (!["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) return;
  e.preventDefault();

  const move = (len: number, delta: number) => {
    if (len <= 0) return;
    cursor.value = (cursor.value + delta + len) % len;
  };

  if (e.key === "Escape") {
    openMenu();
    return;
  }

  if (mode.value === "menu") {
    const len = menuOptions.value.length;
    if (e.key === "ArrowUp") move(len, -1);
    if (e.key === "ArrowDown") move(len, 1);
    if (e.key === "Enter") {
      const id = menuOptions.value[cursor.value]?.id;
      if (id === "level") openLevel();
      else if (id === "party") router.push("/party");
      else if (id === "item") openItem();
      else if (id === "stats") router.push("/stats");
      else if (id === "next") await nextBattle();
      else if (id === "quit") await quitGame();
    }
    return;
  }

  if (mode.value === "level") {
    if (e.key === "Enter") openMenu();
    return;
  }

  if (mode.value === "item") {
    const len = ownedItems.value.length + 1; // +戻る
    if (e.key === "ArrowUp") move(len, -1);
    if (e.key === "ArrowDown") move(len, 1);
    if (e.key === "Enter") {
      if (cursor.value === 0) return openMenu();
      const it = ownedItems.value[cursor.value - 1];
      if (it) openItemTarget(it.id);
    }
    return;
  }

  if (mode.value === "item_target") {
    const len = partyTargets.value.length + 1;
    if (e.key === "ArrowUp") move(len, -1);
    if (e.key === "ArrowDown") move(len, 1);
    if (e.key === "Enter") {
      if (cursor.value === 0) return openItem();
      const t = partyTargets.value[cursor.value - 1];
      if (t) await useItemOn(t.id);
    }
    return;
  }
};

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="panel">
    <h1>メニュー</h1>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="mode === 'menu'" class="window">
      <button
        v-for="(o, i) in menuOptions"
        :key="o.id"
        class="cmd"
        :class="{ selected: cursor === i }"
        @click="
          o.id==='level' ? openLevel() :
          o.id==='party' ? router.push('/party') :
          o.id==='item' ? openItem() :
          o.id==='stats' ? router.push('/stats') :
          o.id==='next' ? nextBattle() :
          quitGame()
        "
      >
        {{ o.label }}
      </button>
      <small class="hint">↑↓で選択 / Enterで決定</small>
    </div>

    <div v-else-if="mode === 'level'" class="window">
      <h2>レベルアップ（確認）</h2>
      <p>※MVPでは戦闘勝利時に自動反映されます</p>
      <pre class="pre">{{ JSON.stringify(appState.state?.characters ?? {}, null, 2) }}</pre>
      <pre class="pre">{{ JSON.stringify(appState.state?.skills ?? {}, null, 2) }}</pre>
      <button class="cmd selected" @click="openMenu">戻る</button>
      <small class="hint">Enter / Esc で戻る</small>
    </div>

    <div v-else-if="mode === 'item'" class="window">
      <h2>アイテム使用</h2>
      <button class="cmd" :class="{ selected: cursor === 0 }" @click="openMenu">戻る</button>
      <button
        v-for="(it, idx) in ownedItems"
        :key="it.id"
        class="cmd"
        :class="{ selected: cursor === Number(idx) + 1 }"
        @click="openItemTarget(it.id)"
      >
        {{ it.name }} (x{{ it.qty }})
      </button>
      <small class="hint">↑↓で選択 / Enterで決定 / Escで戻る</small>
    </div>

    <div v-else-if="mode === 'item_target'" class="window">
      <h2>対象選択</h2>
      <button class="cmd" :class="{ selected: cursor === 0 }" @click="openItem">戻る</button>
      <button
        v-for="(t, idx) in partyTargets"
        :key="t.id"
        class="cmd"
        :class="{ selected: cursor === Number(idx) + 1 }"
        @click="useItemOn(t.id)"
      >
        {{ t.label }}
      </button>
      <small class="hint">↑↓で選択 / Enterで決定 / Escで戻る</small>
    </div>
  </div>
</template>

<style scoped>
.panel { background: #222; padding: 16px; border: 1px solid #444; max-width: 480px; margin: 0 auto; }
.window { display: flex; flex-direction: column; gap: 8px; padding: 8px; border: 1px solid #333; background: #111; }
.cmd { text-align: left; padding: 8px 12px; }
.selected { outline: 2px solid #6cf; }
.hint { color: #aaa; }
.pre { background: #111; padding: 8px; border: 1px solid #333; overflow: auto; max-height: 240px; }
.error { color: #f66; }
</style>


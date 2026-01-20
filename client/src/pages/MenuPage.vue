<script setup lang="ts">
import router from "../router";
import { api } from "../services/apiClient";
import { appState } from "../stores/appState";
import { pushSystemLog } from "../stores/systemLog";
import { ref, computed, onMounted, onUnmounted } from "vue";

const error = ref("");
const masters = ref<any>(null);
const username = computed(() => appState.user.username || "(unknown)");
const floor = computed(() => appState.state?.currentFloor ?? 1);
const expStock = computed(() => appState.state?.expStock ?? 0);
const systemLogDisplay = computed(() => [...(appState.systemLog ?? [])].reverse());

type Mode = "menu" | "level" | "item" | "item_target";
const mode = ref<Mode>("menu");
const cursor = ref(0);
const selectedItemId = ref<string>("");
const levelSelectType = ref<"character" | "skill">("character");
const levelSelectId = ref<string>("");
const allocateAmount = ref(0);

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
  { id: "next", label: "次の戦闘" },
  { id: "level", label: "レベルアップ" },
  { id: "party", label: "キャラ再選択" },
  { id: "item", label: "アイテム使用" },
  { id: "stats", label: "戦績/ランキング" },
  { id: "quit", label: "ゲーム終了" },
]);

const menuDescriptions: Record<string, string> = {
  level: "経験値ストックをキャラ/スキルへ割り振ります。",
  party: "パーティを再選択します（未保存の変更に注意）。",
  item: "所持アイテムを使用します（戦闘外）。",
  stats: "戦績とランキングを表示します。",
  next: "次の戦闘へ進みます（階層 +1）。",
  quit: "ゲームを終了して保存し、ログアウトします。",
};

const currentDescription = computed(() => {
  const id = menuOptions.value[cursor.value]?.id;
  return menuDescriptions[id] || "";
});

const messages = computed(() => {
  const msgs: string[] = [];
  if (error.value) msgs.push(error.value);
  msgs.push("↑↓で選択 / Enterで決定 / Escで戻る");
  return msgs;
});

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

const partyList = computed(() => {
  if (!masters.value || !appState.state) return [];
  const party = appState.state.party ?? [];
  return party.map((cid: string) => {
    const m = masters.value.characters.data.find((c: any) => c.id === cid);
    const st = appState.state?.characters?.[cid] ?? {};
    return {
      id: cid,
      name: m?.name ?? cid,
      level: st.level ?? 1,
      exp: st.exp ?? 0,
    };
  });
});

const skillList = computed(() => {
  if (!masters.value || !appState.state) return [];
  const learnedIds = new Set<string>();
  const party = appState.state.party ?? [];
  for (const cid of party) {
    const st = appState.state.characters?.[cid];
    if (Array.isArray(st?.skillIds)) {
      st.skillIds.forEach((sid: string) => learnedIds.add(sid));
      continue;
    }
    const m = masters.value.characters.data.find((c: any) => c.id === cid);
    if (Array.isArray(m?.initialSkillIds)) {
      m.initialSkillIds.forEach((sid: string) => learnedIds.add(sid));
    }
  }
  return masters.value.skills.data
    .filter((s: any) => learnedIds.has(s.id))
    .map((s: any) => {
      const st = appState.state?.skills?.[s.id] ?? {};
      return {
        id: s.id,
        name: s.name,
        level: st.level ?? 1,
        exp: st.exp ?? 0,
      };
    });
});

const selectedInfo = computed(() => {
  if (levelSelectType.value === "character") {
    return partyList.value.find((p) => p.id === levelSelectId.value);
  }
  return skillList.value.find((s) => s.id === levelSelectId.value);
});

const nextCharExp = (level: number) => Math.floor(50 * level * level);
const nextSkillExp = (level: number) => level * 3;

const hoverSkillId = ref("");
const formatSkillDetail = (skill: any) => {
  if (!skill) return "";
  const parts = [
    skill.name,
    `種別: ${skill.skillType ?? "-"}`,
    `対象: ${skill.targetType ?? "-"}`,
    `範囲: ${skill.range ?? "-"}`,
    `威力: ${skill.power ?? 0}`,
    `消費MP: ${skill.cost ?? 0}`,
  ];
  if (Array.isArray(skill.conditions) && skill.conditions.length > 0) {
    parts.push(`効果: ${skill.conditions.join(", ")}`);
  }
  return parts.join("\n");
};

const nextExpThreshold = computed(() => {
  const info: any = selectedInfo.value;
  if (!info) return 0;
  const lv = info.level ?? 1;
  return levelSelectType.value === "character" ? nextCharExp(lv) : nextSkillExp(lv);
});
const expToNextLevel = computed(() => {
  const info: any = selectedInfo.value;
  if (!info) return 0;
  const current = info.exp ?? 0;
  return Math.max(0, nextExpThreshold.value - current);
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
  allocateAmount.value = 0;
};

const openLevel = () => {
  mode.value = "level";
  cursor.value = 0;
  allocateAmount.value = 0;
  if (!levelSelectId.value) {
    const firstChar = (appState.state?.party ?? [])[0];
    if (firstChar) {
      levelSelectType.value = "character";
      levelSelectId.value = firstChar;
    } else if (masters.value?.skills?.data?.length) {
      levelSelectType.value = "skill";
      levelSelectId.value = masters.value.skills.data[0].id;
    }
  }
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

const applyAllocation = async () => {
  if (!appState.state) return;
  const amount = Math.floor(allocateAmount.value);
  if (!levelSelectId.value) {
    error.value = "割り振る対象を選択してください";
    return;
  }
  if (amount <= 0) {
    error.value = "割り振る経験値を入力してください";
    return;
  }
  if (amount > expStock.value) {
    error.value = "経験値ストックが不足しています";
    return;
  }
  const ok = window.confirm("割り振った経験値は戻せません。実行しますか？");
  if (!ok) return;
  try {
    const res = await api.allocateExp({
      state: appState.state,
      allocations: [{ kind: levelSelectType.value, id: levelSelectId.value, amount }],
    });
    appState.state = res.data?.state ?? appState.state;
    const results = res.data?.result ?? [];
    const notices: string[] = [];
    for (const r of results) {
      if (r.kind === "character") {
        const m = masters.value?.characters?.data?.find((c: any) => c.id === r.id);
        const name = m?.name ?? r.id;
        notices.push(`${name} が Lv${r.fromLevel} → Lv${r.toLevel} にアップ！`);
        if (Array.isArray(r.learnedSkills) && r.learnedSkills.length > 0) {
          for (const sid of r.learnedSkills) {
            const sm = masters.value?.skills?.data?.find((s: any) => s.id === sid);
            notices.push(`スキル習得: ${name} が ${sm?.name ?? sid} を覚えた`);
          }
        }
      } else if (r.kind === "skill") {
        const sm = masters.value?.skills?.data?.find((s: any) => s.id === r.id);
        notices.push(`${sm?.name ?? r.id} が Lv${r.fromLevel} → Lv${r.toLevel} にアップ！`);
      }
    }
    if (notices.length > 0) pushSystemLog(notices);
    allocateAmount.value = 0;
  } catch (e: any) {
    error.value = e?.message || "経験値の割り振りに失敗しました";
  }
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
  <div class="game-screen">
    <div class="top-bar">
      <div class="left">USER: {{ username }}</div>
      <div class="right">FLOOR {{ floor }}</div>
    </div>

    <div class="main-area">
      <div class="left-panel">
        <h1>メニュー</h1>

        <div v-if="mode === 'menu'" class="menu-list">
          <button
            v-for="(o, i) in menuOptions"
            :key="o.id"
            class="cmd"
            :class="[{ selected: cursor === i }, o.id === 'quit' ? 'cmd-danger' : '' ]"
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
        </div>

        <div v-else-if="mode === 'level'" class="level-window">
          <div class="level-list">
            <h2>キャラクター</h2>
            <div class="level-items">
              <button
                v-for="c in partyList"
                :key="c.id"
                class="cmd"
                :class="{ selected: levelSelectType === 'character' && levelSelectId === c.id }"
                @click="levelSelectType = 'character'; levelSelectId = c.id"
              >
                {{ c.name }} Lv{{ c.level }}
              </button>
            </div>
          </div>
          <div class="level-list">
            <h2>スキル</h2>
            <div class="level-items">
              <button
                v-for="s in skillList"
                :key="s.id"
                class="cmd"
                :class="{ selected: levelSelectType === 'skill' && levelSelectId === s.id }"
                @click="levelSelectType = 'skill'; levelSelectId = s.id"
                @mouseenter="hoverSkillId = s.id"
                @mouseleave="hoverSkillId = ''"
              >
                {{ s.name }} Lv{{ s.level }}
                <span v-if="hoverSkillId === s.id" class="skill-tooltip">
                  {{ formatSkillDetail(masters?.skills?.data?.find((sk: any) => sk.id === s.id)) }}
                </span>
              </button>
            </div>
          </div>
          <button class="cmd cmd-secondary" @click="openMenu">戻る</button>
        </div>

        <div v-else-if="mode === 'item'" class="window">
          <h2>アイテム使用</h2>
          <button class="cmd cmd-secondary" :class="{ selected: cursor === 0 }" @click="openMenu">戻る</button>
          <button
            v-for="(it, idx) in ownedItems"
            :key="it.id"
            class="cmd"
            :class="{ selected: cursor === Number(idx) + 1 }"
            @click="openItemTarget(it.id)"
          >
            {{ it.name }} (x{{ it.qty }})
          </button>
        </div>

        <div v-else-if="mode === 'item_target'" class="window">
          <h2>対象選択</h2>
          <button class="cmd cmd-secondary" :class="{ selected: cursor === 0 }" @click="openItem">戻る</button>
          <button
            v-for="(t, idx) in partyTargets"
            :key="t.id"
            class="cmd"
            :class="{ selected: cursor === Number(idx) + 1 }"
            @click="useItemOn(t.id)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <div class="right-panel">
        <template v-if="mode === 'level'">
          <h2>割り振り</h2>
          <div class="description">
            <div v-if="selectedInfo">
              <div>対象: {{ selectedInfo.name }}</div>
              <div>Lv: {{ selectedInfo.level }}</div>
              <div>現在EXP: {{ selectedInfo.exp }}</div>
              <div>次Lv必要EXP: {{ nextExpThreshold }}</div>
              <div>次Lvまで: {{ expToNextLevel }}</div>
            </div>
            <div v-else>対象を選択してください</div>
            <div class="exp-input">
              <label>割り振りEXP</label>
              <input type="number" min="0" :max="expStock" v-model.number="allocateAmount" />
              <div class="exp-actions">
                <button class="cmd" @click="allocateAmount = Math.min(expStock, allocateAmount + 10)">+10</button>
                <button class="cmd" @click="allocateAmount = Math.min(expStock, allocateAmount + 50)">+50</button>
                <button class="cmd" @click="allocateAmount = Math.min(expStock, allocateAmount + 100)">+100</button>
                <button class="cmd" @click="allocateAmount = expStock">MAX</button>
              </div>
            </div>
            <div class="exp-stock">残りEXP: {{ expStock }}</div>
            <button class="cmd selected" @click="applyAllocation">決定</button>
          </div>
        </template>
        <template v-else>
          <h2>説明</h2>
          <div class="description">{{ mode === "menu" ? currentDescription : " " }}</div>
        </template>
      </div>
    </div>

    <div class="bottom-area">
      <div class="log-column">
        <div class="log-window">
          <div v-for="(m, i) in messages" :key="i">{{ m }}</div>
        </div>
        <div class="log-window system-log">
          <div v-for="(m, i) in systemLogDisplay" :key="i" :class="{ 'log-latest': i === 0 }">{{ m }}</div>
        </div>
      </div>
      <div class="command-window">
        <small class="hint">↑↓で選択 / Enterで決定 / Escで戻る</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-screen { width: 960px; margin: 0 auto; background: #222; padding: 12px; border: 1px solid #444; height: 840px; overflow: hidden; display: flex; flex-direction: column; }
.top-bar { display: flex; justify-content: space-between; padding: 8px 12px; border: 1px solid #333; background: #111; margin-bottom: 12px; }
.main-area { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; min-height: 360px; flex: 1; overflow: hidden; }
.left-panel { border: 1px solid #333; background: #111; padding: 12px; display: flex; flex-direction: column; gap: 8px; overflow: visible; }
.right-panel { border: 1px solid #333; background: #111; padding: 12px; overflow: visible; }
.menu-list { display: flex; flex-direction: column; gap: 8px; }
.window { display: flex; flex-direction: column; gap: 8px; padding: 8px; border: 1px solid #333; background: #0c0c0c; }
.level-window { display: grid; gap: 12px; border: 1px solid #333; background: #0c0c0c; padding: 8px; }
.level-list { display: flex; flex-direction: column; gap: 6px; }
.level-items { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; overflow-x: visible; }
.cmd { text-align: left; padding: 8px 12px; }
.selected { outline: 2px solid #6cf; }
.description { border: 1px solid #333; background: #0c0c0c; min-height: 120px; padding: 8px; }
.exp-input { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.exp-input input { padding: 6px 8px; background: #111; border: 1px solid #333; color: #fff; }
.exp-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.exp-stock { margin-top: 6px; color: #9ad; }
.bottom-area { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 12px; }
.log-column { display: flex; flex-direction: column; gap: 8px; }
.log-window { border: 1px solid #333; background: #111; padding: 8px; height: calc(1.4em * 5 + 16px); overflow-y: auto; line-height: 1.4; }
.system-log { border-color: #2a2a2a; background: #0d0d0d; }
.log-latest { color: #ffd700; font-weight: bold; text-shadow: 0 0 4px rgba(255, 215, 0, 0.5); }
.command-window { border: 1px solid #333; background: #111; padding: 8px; display: flex; align-items: center; }
.hint { color: #aaa; }
.pre { background: #111; padding: 8px; border: 1px solid #333; overflow: auto; max-height: 240px; }
.error { color: #f66; }
.cmd-secondary { border-color: #446; background: #0f1522; color: #cfe3ff; }
.cmd-danger { border-color: #933; background: #2a0f0f; color: #fbb; }
.cmd { position: relative; }
.skill-tooltip {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 8px;
  z-index: 9999;
  white-space: pre-line;
  background: #111;
  border: 1px solid #444;
  color: #fff;
  padding: 6px 8px;
  min-width: 180px;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
}
</style>


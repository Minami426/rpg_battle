<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import router from "../router";
import { api } from "../services/apiClient";
import { appState } from "../stores/appState";

const loading = ref(false);
const error = ref("");
const battle = computed(() => appState.battle);
const log = computed(() => battle.value?.log ?? []);
const masters = ref<any>(null);
const skillUseCount = ref<Record<string, number>>({});
const selectedTarget = ref("");
const availableSkills = computed(() => {
  if (!masters.value) return [];
  const actor = nextActor();
  if (!actor) return [];
  const all = masters.value.skills.data as any[];
  const byActor = all.filter((s) => Array.isArray(actor.skillIds) && actor.skillIds.includes(s.id) && !s.isPassive);
  const isUnlocked = (s: any) => (actor.level ?? 1) >= (s.unlockLevel ?? 1);
  const prereqOk = (s: any) => {
    const prereqs: string[] = Array.isArray(s.prerequisiteIds) ? s.prerequisiteIds : [];
    if (prereqs.length === 0) return true;
    return prereqs.every((pid) => {
      const pre = all.find((x) => x.id === pid);
      if (!pre) return false;
      return (actor.level ?? 1) >= (pre.unlockLevel ?? 1);
    });
  };
  return byActor.filter((s) => isUnlocked(s) && prereqOk(s));
});
const availableItems = computed(() => {
  if (!masters.value) return [];
  const owned = appState.state?.items ?? {};
  return masters.value.items.data.filter((i: any) => (owned as any)[i.id] > 0);
});

type UIMode = "command" | "skill" | "item" | "target";
const uiMode = ref<UIMode>("command");
const cursorIndex = ref(0);
const pendingAction = ref<null | { type: "attack" } | { type: "skill"; skillId: string } | { type: "item"; itemId: string }>(
  null
);

const commandOptions = computed(() => [
  { id: "attack", label: "たたかう" },
  { id: "skill", label: "じゅもん" },
  { id: "item", label: "どうぐ" },
  { id: "defend", label: "ぼうぎょ" },
]);

const targetOptions = computed(() => {
  if (!battle.value) return [];
  if (!pendingAction.value) return [];

  // default: enemy targets for attack
  if (pendingAction.value.type === "attack") {
    return battle.value.enemies.filter((e: any) => e.currentHp > 0).map((e: any) => ({ id: e.id, label: `敵: ${e.name}` }));
  }
  if (pendingAction.value.type === "skill") {
    const skillId = pendingAction.value.skillId;
    const skill = masters.value?.skills.data.find((s: any) => s.id === skillId);
    if (!skill) return [];
    if (skill.range === "all") return [];
    if (skill.targetType === "ally") {
      // revive は死者のみ、他は生存者のみ
      const list =
        skill.id === "revive"
          ? battle.value.party.filter((p: any) => p.currentHp <= 0)
          : battle.value.party.filter((p: any) => p.currentHp > 0);
      return list.map((p: any) => ({ id: p.id, label: `味方: ${p.name}` }));
    }
    return battle.value.enemies.filter((e: any) => e.currentHp > 0).map((e: any) => ({ id: e.id, label: `敵: ${e.name}` }));
  }
  if (pendingAction.value.type === "item") {
    // item master では target: ally/enemy を持つ
    const itemId = pendingAction.value.itemId;
    const item = masters.value?.items.data.find((i: any) => i.id === itemId);
    if (!item) return [];
    if (item.target === "enemy") {
      return battle.value.enemies.filter((e: any) => e.currentHp > 0).map((e: any) => ({ id: e.id, label: `敵: ${e.name}` }));
    }
    return battle.value.party.filter((p: any) => p.currentHp > 0).map((p: any) => ({ id: p.id, label: `味方: ${p.name}` }));
  }
  return [];
});

const loadMasters = async () => {
  if (masters.value) return;
  try {
    const res = await fetch("/api/master", { credentials: "include" });
    const body = await res.json();
    masters.value = body.data;
  } catch (e: any) {
    error.value = e.message;
  }
};
onMounted(loadMasters);

const isPlayerTurn = computed(() => {
  const a = nextActor();
  return !!a && !a.isEnemy && (a.currentHp ?? 0) > 0;
});

const startBattle = async () => {
  loading.value = true;
  error.value = "";
  try {
    if (!appState.state) throw new Error("state missing");
    if (!Array.isArray(appState.state.party) || appState.state.party.length !== 3) {
      throw new Error("party is not selected");
    }
    const res = await api.startBattle({
      floor: appState.state.currentFloor ?? 1,
      party: appState.state.party,
      state: appState.state,
    });
    appState.battle = res.data;
    skillUseCount.value = {};
    uiMode.value = "command";
    cursorIndex.value = 0;
    pendingAction.value = null;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

const actAttack = async () => {
  if (!battle.value) return;
  const actor = nextActor();
  if (!actor) return;
  const living = battle.value.enemies.filter((e: any) => e.currentHp > 0);
  if (living.length === 0) return;
  const chosen = selectedTarget.value && living.some((e: any) => e.id === selectedTarget.value) ? selectedTarget.value : living[0].id;
  const targets = [chosen];
  await doAct({ type: "attack" }, targets);
};

const actDefend = async () => {
  if (!battle.value) return;
  await doAct({ type: "defend" }, []);
};

const actSkill = async (skillId: string) => {
  if (!battle.value) return;
  const actor = nextActor();
  if (!actor) return;
  const skill = masters.value?.skills.data.find((s: any) => s.id === skillId);
  if (!skill) return;
  const targets = pickTargetsForSkill(skill);
  if (targets.length === 0) return;
  // スキル使用回数カウント
  skillUseCount.value[skillId] = (skillUseCount.value[skillId] ?? 0) + 1;
  await doAct({ type: "skill", skillId, targetIds: targets }, targets);
};

const actItem = async (itemId: string) => {
  if (!battle.value) return;
  const targets = pickTargetsForItem(itemId);
  if (targets.length === 0) return;
  await doAct({ type: "item", itemId, targetIds: targets }, targets);
};

const openSkillMenu = () => {
  uiMode.value = "skill";
  cursorIndex.value = 0;
  pendingAction.value = null;
};
const openItemMenu = () => {
  uiMode.value = "item";
  cursorIndex.value = 0;
  pendingAction.value = null;
};
const openTargetMenu = (action: any) => {
  pendingAction.value = action;
  uiMode.value = "target";
  cursorIndex.value = 0;
};
const backToCommand = () => {
  uiMode.value = "command";
  cursorIndex.value = 0;
  pendingAction.value = null;
};

const commitSkillSelection = async (skill: any) => {
  if (!battle.value) return;
  if (skill.range === "all") {
    await actSkill(skill.id);
    backToCommand();
    return;
  }
  openTargetMenu({ type: "skill", skillId: skill.id });
};

const commitItemSelection = async (item: any) => {
  if (!battle.value) return;
  openTargetMenu({ type: "item", itemId: item.id });
};

const commitTargetSelection = async (targetId: string) => {
  if (!pendingAction.value) return;
  selectedTarget.value = targetId;
  if (pendingAction.value.type === "attack") {
    await actAttack();
    backToCommand();
    return;
  }
  if (pendingAction.value.type === "skill") {
    await actSkill(pendingAction.value.skillId);
    backToCommand();
    return;
  }
  if (pendingAction.value.type === "item") {
    await actItem(pendingAction.value.itemId);
    backToCommand();
    return;
  }
};

const doAct = async (action: any, targetIds: string[]) => {
  loading.value = true;
  error.value = "";
  try {
    const res = await api.actBattle({
      battleId: battle.value.battleId,
      actorId: nextActor()?.id,
      action,
      targetIds,
    });
    appState.battle = res.data.state;
    // max damage 更新
    const md = res.data.state?.maxDamageByParty ?? 0;
    if (md > appState.maxDamageCurrentRun) appState.maxDamageCurrentRun = md;
    // game over handling
    if (res.data.deltaState?.gameOver) {
      await api.flowGameOver({
        start_at: null,
        end_at: new Date().toISOString(),
        max_floor_reached: battle.value.floor,
        max_damage: Math.max(res.data.deltaState?.maxDamage ?? 0, appState.maxDamageCurrentRun),
        run_stats_json: buildRunStats("game_over"),
      });
      // state reset is handled server-side; fetch fresh state
      const st = await api.getState();
      appState.state = st.data?.state_json ?? st.data?.state ?? null;
      appState.battle = null;
      appState.maxDamageCurrentRun = 0;
      skillUseCount.value = {};
      router.push("/start");
    }
    if (res.data.state.winner === "party") {
      // 進捗の更新（MVP: 保存は終了/全滅のみ。ここでは state を更新するだけ）
      if (appState.state) {
        const delta = {
          items: res.data.deltaState?.items,
          exp: res.data.deltaState?.exp,
          skillExp: skillUseCount.value, // 使用回数をそのまま加算
          partyStatus: res.data.deltaState?.partyStatus,
          maxDamage: Math.max(res.data.deltaState?.maxDamage ?? 0, appState.maxDamageCurrentRun),
        };
        const applied = await api.applyBattleDelta({ state: appState.state, delta, persist: false, currentFloor: appState.state.currentFloor });
        appState.state = applied.data?.state ?? appState.state;
      }
      // Runは継続するため、maxDamage はリセットしない（終了/全滅でリセット）
      skillUseCount.value = {};
      appState.battle = null;
      router.push("/menu");
    }
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

const nextActor = () => {
  const b = battle.value;
  if (!b) return null;
  const idx = b.turnOrder[b.turnCursor];
  return b.actors[idx];
};

const pickTargetsForSkill = (skill: any): string[] => {
  if (!battle.value) return [];
  const livingEnemies = battle.value.enemies.filter((e: any) => e.currentHp > 0);
  const livingParty = battle.value.party.filter((p: any) => p.currentHp > 0);
  const deadParty = battle.value.party.filter((p: any) => p.currentHp <= 0);
  const targetPool =
    skill.targetType === "ally"
      ? skill.id === "revive"
        ? deadParty
        : livingParty
      : livingEnemies;
  if (skill.range === "all") return targetPool.map((t: any) => t.id);
  if (selectedTarget.value) {
    const found = targetPool.find((t: any) => t.id === selectedTarget.value);
    if (found) return [found.id];
  }
  return targetPool.length > 0 ? [targetPool[0].id] : [];
};

const pickTargetsForItem = (itemId: string): string[] => {
  if (!battle.value || !masters.value) return [];
  const item = masters.value.items.data.find((i: any) => i.id === itemId);
  if (!item) return [];
  const livingParty = battle.value.party.filter((p: any) => p.currentHp > 0);
  if (item.target === "enemy") {
    const livingEnemies = battle.value.enemies.filter((e: any) => e.currentHp > 0);
    if (selectedTarget.value) {
      const found = livingEnemies.find((e: any) => e.id === selectedTarget.value);
      if (found) return [found.id];
    }
    return livingEnemies.length ? [livingEnemies[0].id] : [];
  }
  // ally or self
  if (selectedTarget.value) {
    const found = livingParty.find((p: any) => p.id === selectedTarget.value);
    if (found) return [found.id];
  }
  return livingParty.length ? [livingParty[0].id] : [];
};

// キーボード操作（矢印で選択、Enterで決定）
const handleKey = async (e: KeyboardEvent) => {
  if (loading.value) return;
  if (!battle.value) return;
  if (!isPlayerTurn.value) return;

  const key = e.key;
  if (!["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(key)) return;
  e.preventDefault();

  const move = (len: number, delta: number) => {
    if (len <= 0) return;
    cursorIndex.value = (cursorIndex.value + delta + len) % len;
  };

  if (key === "Escape") {
    backToCommand();
    return;
  }

  if (uiMode.value === "command") {
    const len = commandOptions.value.length;
    if (key === "ArrowUp") move(len, -1);
    if (key === "ArrowDown") move(len, 1);
    if (key === "Enter") {
      const picked = commandOptions.value[cursorIndex.value]?.id;
      if (picked === "attack") openTargetMenu({ type: "attack" });
      else if (picked === "skill") openSkillMenu();
      else if (picked === "item") openItemMenu();
      else if (picked === "defend") {
        await actDefend();
        backToCommand();
      }
    }
    return;
  }

  if (uiMode.value === "skill") {
    const list = availableSkills.value;
    if (key === "ArrowUp") move(list.length + 1, -1); // +1 = back
    if (key === "ArrowDown") move(list.length + 1, 1);
    if (key === "Enter") {
      if (cursorIndex.value === 0) {
        backToCommand();
        return;
      }
      const s = list[cursorIndex.value - 1];
      if (s) await commitSkillSelection(s);
    }
    return;
  }

  if (uiMode.value === "item") {
    const list = availableItems.value;
    if (key === "ArrowUp") move(list.length + 1, -1);
    if (key === "ArrowDown") move(list.length + 1, 1);
    if (key === "Enter") {
      if (cursorIndex.value === 0) {
        backToCommand();
        return;
      }
      const it = list[cursorIndex.value - 1];
      if (it) await commitItemSelection(it);
    }
    return;
  }

  if (uiMode.value === "target") {
    const list = targetOptions.value;
    if (key === "ArrowUp") move(list.length + 1, -1);
    if (key === "ArrowDown") move(list.length + 1, 1);
    if (key === "Enter") {
      if (cursorIndex.value === 0) {
        backToCommand();
        return;
      }
      const t = list[cursorIndex.value - 1];
      if (t) await commitTargetSelection(t.id);
    }
    return;
  }
};

onMounted(() => window.addEventListener("keydown", handleKey));
onUnmounted(() => window.removeEventListener("keydown", handleKey));

const buildRunStats = (endedReason: "game_over" | "quit") => {
  const st: any = appState.state ?? {};
  const characterLevels: Record<string, number> = {};
  const skillLevels: Record<string, number> = {};
  Object.entries(st.characters ?? {}).forEach(([cid, c]: any) => {
    characterLevels[cid] = c.level ?? 1;
  });
  Object.entries(st.skills ?? {}).forEach(([sid, s]: any) => {
    skillLevels[sid] = s.level ?? 1;
  });
  return {
    schemaVersion: 1,
    endedReason,
    maxFloorReached: st.currentFloor ?? battle.value?.floor ?? 1,
    maxDamage: Math.max(appState.maxDamageCurrentRun, battle.value?.maxDamageByParty ?? 0),
    characterLevels,
    skillLevels,
    items: st.items ?? {},
    hpMp: st.characters ?? {},
  };
};

if (!appState.battle) startBattle();
</script>

<template>
  <div class="panel">
    <h1>Battle (Floor {{ battle?.floor ?? '-' }})</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="layout" v-if="battle">
      <div class="enemies">
        <div
          v-for="e in battle.enemies"
          :key="e.id"
          class="card"
          :class="{ dead: e.currentHp <= 0, selected: selectedTarget === e.id }"
          @click="selectedTarget = e.id"
        >
          <div>{{ e.name }}</div>
          <div>HP: {{ e.currentHp }} / {{ e.base.maxHp }}</div>
        </div>
      </div>
      <div class="party">
        <div
          v-for="p in battle.party"
          :key="p.id"
          class="card"
          :class="{ dead: p.currentHp <= 0, selected: selectedTarget === p.id }"
          @click="selectedTarget = p.id"
        >
          <div>{{ p.name }}</div>
          <div>HP: {{ p.currentHp }} / {{ p.base.maxHp }}</div>
          <div>MP: {{ p.currentMp }} / {{ p.base.maxMp }}</div>
        </div>
      </div>
      <div class="actions">
        <div>次の行動者: {{ nextActor()?.name ?? '-' }}</div>
        <!-- コマンドウィンドウ（ドロップダウン禁止 → ボタン選択） -->
        <div v-if="!isPlayerTurn" class="sub-window">
          <div>敵のターン…</div>
          <small class="hint">（入力不可）</small>
        </div>
        <div v-else-if="uiMode === 'command'" class="command-window">
          <button
            v-for="(c, i) in commandOptions"
            :key="c.id"
            :disabled="loading"
            class="cmd"
            :class="{ selected: cursorIndex === i }"
            @click="
              c.id==='attack' ? openTargetMenu({type:'attack'}) :
              c.id==='skill' ? openSkillMenu() :
              c.id==='item' ? openItemMenu() :
              actDefend().then(()=>backToCommand())
            "
          >
            {{ c.label }}
          </button>
          <small class="hint">↑↓で選択 / Enterで決定</small>
        </div>

        <div v-else-if="uiMode === 'skill'" class="sub-window">
          <button :disabled="loading" class="cmd" :class="{ selected: cursorIndex === 0 }" @click="backToCommand">戻る</button>
          <button
            v-for="(s, idx) in availableSkills"
            :key="s.id"
            :disabled="loading || nextActor()?.currentMp < (s.cost ?? 0)"
            class="cmd"
            :class="{ selected: cursorIndex === Number(idx) + 1 }"
            @click="commitSkillSelection(s)"
          >
            {{ s.name }} (MP {{ s.cost ?? 0 }})
          </button>
          <small class="hint">↑↓で選択 / Enterで決定 / Escで戻る</small>
        </div>

        <div v-else-if="uiMode === 'item'" class="sub-window">
          <button :disabled="loading" class="cmd" :class="{ selected: cursorIndex === 0 }" @click="backToCommand">戻る</button>
          <button
            v-for="(it, idx) in availableItems"
            :key="it.id"
            :disabled="loading || (appState.state?.items?.[it.id] ?? 0) <= 0"
            class="cmd"
            :class="{ selected: cursorIndex === Number(idx) + 1 }"
            @click="commitItemSelection(it)"
          >
            {{ it.name }} (在庫: {{ appState.state?.items?.[it.id] ?? 0 }})
          </button>
          <small class="hint">↑↓で選択 / Enterで決定 / Escで戻る</small>
        </div>

        <div v-else-if="uiMode === 'target'" class="sub-window">
          <button :disabled="loading" class="cmd" :class="{ selected: cursorIndex === 0 }" @click="backToCommand">戻る</button>
          <button
            v-for="(t, idx) in targetOptions"
            :key="t.id"
            :disabled="loading"
            class="cmd"
            :class="{ selected: cursorIndex === Number(idx) + 1 }"
            @click="commitTargetSelection(t.id)"
          >
            {{ t.label }}
          </button>
          <small class="hint">↑↓で選択 / Enterで決定 / Escで戻る</small>
        </div>
      </div>
      <div class="log">
        <div v-for="(l, i) in log" :key="i">{{ l }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel { background: #222; padding: 16px; border: 1px solid #444; }
.layout { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.enemies, .party { display: flex; flex-direction: column; gap: 8px; }
.card { padding: 8px; border: 1px solid #444; }
.dead { opacity: 0.4; }
.selected { outline: 2px solid #6cf; }
.actions { display: flex; flex-direction: column; gap: 8px; }
.command-window, .sub-window { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid #333; background: #111; }
.cmd { text-align: left; }
.hint { color: #aaa; }
.log { grid-column: span 2; background: #111; padding: 8px; min-height: 120px; border: 1px solid #333; }
.error { color: #f66; }
button { padding: 8px 12px; }
</style>


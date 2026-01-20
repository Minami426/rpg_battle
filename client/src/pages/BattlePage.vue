<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import router from "../router";
import { api } from "../services/apiClient";
import { appState } from "../stores/appState";
import { pushSystemLog } from "../stores/systemLog";

const loading = ref(false);
const error = ref("");
const battle = computed(() => appState.battle);
const log = computed(() => battle.value?.log ?? []);
const logDisplay = computed(() => [...log.value].reverse());
const systemLogDisplay = computed(() => [...(appState.systemLog ?? [])].reverse());
const masters = ref<any>(null);
const username = computed(() => appState.user.username || "(unknown)");
const floorLabel = computed(() => battle.value?.floor ?? appState.state?.currentFloor ?? 1);
const expStock = computed(() => appState.state?.expStock ?? 0);

const getPartyMasterId = (combatantId: string) => {
  const raw = combatantId.replace(/^pc_/, "");
  const last = raw.lastIndexOf("_");
  return last >= 0 ? raw.slice(0, last) : raw;
};

const getEnemyMasterId = (combatantId: string) => {
  const raw = combatantId.replace(/^enemy_/, "");
  const last = raw.lastIndexOf("_");
  return last >= 0 ? raw.slice(0, last) : raw;
};

const getPartyMaster = (combatantId: string) => {
  const id = getPartyMasterId(combatantId);
  return masters.value?.characters?.data?.find((c: any) => c.id === id);
};

const getEnemyMaster = (combatantId: string) => {
  const id = getEnemyMasterId(combatantId);
  return masters.value?.enemies?.data?.find((e: any) => e.id === id);
};

const enemyNameMap = computed(() => {
  const list = battle.value?.enemies ?? [];
  const total: Record<string, number> = {};
  const order: Record<string, number> = {};
  const map: Record<string, string> = {};
  for (const e of list) {
    const rawId = e?.id ?? "";
    const id = getEnemyMasterId(rawId);
    total[id] = (total[id] ?? 0) + 1;
  }
  for (const e of list) {
    const rawId = e?.id ?? "";
    const id = getEnemyMasterId(rawId);
    order[id] = (order[id] ?? 0) + 1;
    const baseName = e.name ?? id;
    map[rawId] = (total[id] ?? 0) > 1 ? `${baseName}${order[id]}` : baseName;
  }
  return map;
});

const enemyDisplayName = (combatantId: string, fallback?: string) =>
  enemyNameMap.value[combatantId] ?? fallback ?? combatantId;

const actorDisplayName = (actor: any) => {
  if (!actor) return "-";
  if (actor.isEnemy) return enemyDisplayName(actor.id, actor.name);
  return actor.name ?? actor.id;
};

const getImagePath = (m: any, type: "characters" | "enemies") => {
  if (!m) return "";
  if (m.imagePath) return m.imagePath;
  if (m.imageKey) return `/uploads/${type}/${m.imageKey}.png`;
  return "";
};
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
    return battle.value.enemies
      .filter((e: any) => e.currentHp > 0)
      .map((e: any) => ({ id: e.id, label: `敵: ${enemyDisplayName(e.id, e.name)}` }));
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
    return battle.value.enemies
      .filter((e: any) => e.currentHp > 0)
      .map((e: any) => ({ id: e.id, label: `敵: ${enemyDisplayName(e.id, e.name)}` }));
  }
  if (pendingAction.value.type === "item") {
    // item master では target: ally/enemy を持つ
    const itemId = pendingAction.value.itemId;
    const item = masters.value?.items.data.find((i: any) => i.id === itemId);
    if (!item) return [];
    if (item.target === "enemy") {
      return battle.value.enemies
        .filter((e: any) => e.currentHp > 0)
        .map((e: any) => ({ id: e.id, label: `敵: ${enemyDisplayName(e.id, e.name)}` }));
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
const activeActorId = computed(() => nextActor()?.id ?? "");
const enemyActing = ref(false);
const popIds = ref<string[]>([]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isPopping = (id: string) => popIds.value.includes(id);

const popOnce = async (ids: string[], ms = 1200) => {
  const next = ids.filter(Boolean);
  if (next.length === 0) return;
  popIds.value = next;
  await sleep(ms);
  popIds.value = [];
};

const buildNameToId = (state: any) => {
  const map = new Map<string, string[]>();
  const party = state?.party ?? [];
  const enemies = state?.enemies ?? [];
  for (const p of party) {
    if (p?.name) map.set(p.name, [p.id]);
  }
  const localEnemyMap: Record<string, string> = {};
  const total: Record<string, number> = {};
  const order: Record<string, number> = {};
  for (const e of enemies) {
    const rawId = e?.id ?? "";
    const id = getEnemyMasterId(rawId);
    total[id] = (total[id] ?? 0) + 1;
  }
  for (const e of enemies) {
    const rawId = e?.id ?? "";
    const id = getEnemyMasterId(rawId);
    order[id] = (order[id] ?? 0) + 1;
    const baseName = e.name ?? id;
    localEnemyMap[rawId] = (total[id] ?? 0) > 1 ? `${baseName}${order[id]}` : baseName;
  }
  for (const e of enemies) {
    const rawId = e?.id ?? "";
    const label = localEnemyMap[rawId] ?? e.name ?? rawId;
    const list = map.get(label) ?? [];
    list.push(rawId);
    map.set(label, list);
    const baseName = e.name ?? rawId;
    if (!map.has(baseName)) map.set(baseName, [rawId]);
  }
  return map;
};

const parseActionLine = (line: string) => {
  const attack = line.match(/^(.+) の攻撃！ (.+) に /);
  if (attack) return { actor: attack[1], target: attack[2] };
  const skill = line.match(/^(.+) の .+! (.+) に /);
  if (skill) return { actor: skill[1], target: skill[2] };
  const heal = line.match(/^(.+) は (.+) を回復した/);
  if (heal) return { actor: heal[1], target: heal[2] };
  const revive = line.match(/^(.+) は .+ を唱えた！ (.+) は生き返った/);
  if (revive) return { actor: revive[1], target: revive[2] };
  const itemHp = line.match(/^(.+) は .+を使った。(.+) のHPが/);
  if (itemHp) return { actor: itemHp[1], target: itemHp[2] };
  const itemMp = line.match(/^(.+) は .+を使った。(.+) のMPが/);
  if (itemMp) return { actor: itemMp[1], target: itemMp[2] };
  const used = line.match(/^(.+) は .+ を使った/);
  if (used) return { actor: used[1], target: "" };
  return null;
};

const animateFromLogs = async (lines: string[], state: any) => {
  const map = buildNameToId(state);
  for (const line of lines) {
    const info = parseActionLine(line);
    if (!info) continue;
    const actorList = map.get(info.actor || "") ?? [];
    const targetList = map.get(info.target || "") ?? [];
    const actorId = actorList[0] ?? "";
    const targetId = targetList[0] ?? "";
    if (actorList.length > 1 && actorId) {
      actorList.push(actorList.shift() as string);
      map.set(info.actor || "", actorList);
    }
    if (targetList.length > 1 && targetId) {
      targetList.push(targetList.shift() as string);
      map.set(info.target || "", targetList);
    }
    enemyActing.value = true;
    if (actorId) await popOnce([actorId], 1200);
    if (targetId) await popOnce([targetId], 1200);
    enemyActing.value = false;
  }
};

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
    const prevLogCount = battle.value?.log?.length ?? 0;
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
    const newLogs = res.data.state?.log ?? [];
    const added = newLogs.slice(prevLogCount);
    await animateFromLogs(added, res.data.state);

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
      await sleep(3000);
      router.push("/start");
      return;
    }
    if (res.data.state.winner === "party") {
      // 進捗の更新（MVP: 保存は終了/全滅のみ。ここでは state を更新するだけ）
      if (appState.state) {
        const delta = {
          items: res.data.deltaState?.items,
          expStockAdd: res.data.deltaState?.expStockAdd,
          partyStatus: res.data.deltaState?.partyStatus,
          maxDamage: Math.max(res.data.deltaState?.maxDamage ?? 0, appState.maxDamageCurrentRun),
        };
        const applied = await api.applyBattleDelta({ state: appState.state, delta, persist: false, currentFloor: appState.state.currentFloor });
        appState.state = applied.data?.state ?? appState.state;
        const expAdd = res.data.deltaState?.expStockAdd ?? 0;
        if (expAdd > 0) pushSystemLog(`経験値ストック +${expAdd}`);
      }
      // Runは継続するため、maxDamage はリセットしない（終了/全滅でリセット）
      await sleep(3000);
      appState.battle = null;
      router.push("/menu");
      return;
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
  <div class="game-screen">
    <div class="top-bar">
      <div class="left">USER: {{ username }} / EXP: {{ expStock }}</div>
      <div class="right">FLOOR {{ floorLabel }}</div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="main-area" v-if="battle">
      <div class="party-status">
        <h2>味方</h2>
        <div
          v-for="p in battle.party"
          :key="p.id"
          class="status-card"
          :class="{ dead: p.currentHp <= 0, selected: selectedTarget === p.id, active: activeActorId === p.id, pop: isPopping(p.id) }"
          @click="selectedTarget = p.id"
        >
          <div class="name">{{ p.name }}</div>
          <div class="meta">Lv {{ p.level }}</div>
          <div>HP: {{ p.currentHp }} / {{ p.base.maxHp }}</div>
          <div>MP: {{ p.currentMp }} / {{ p.base.maxMp }}</div>
        </div>
      </div>

      <div class="party-images">
        <div
          v-for="p in battle.party"
          :key="p.id"
          class="image-card"
          :class="{ dead: p.currentHp <= 0, selected: selectedTarget === p.id, active: activeActorId === p.id, pop: isPopping(p.id) }"
          @click="selectedTarget = p.id"
        >
          <img
            v-if="getImagePath(getPartyMaster(p.id), 'characters')"
            :src="getImagePath(getPartyMaster(p.id), 'characters')"
            :alt="p.name"
          />
          <div v-else class="image-placeholder">NO IMAGE</div>
          <div class="label">{{ p.name }}</div>
        </div>
      </div>

      <div class="spacer" />

      <div class="enemy-images">
        <div
          v-for="e in battle.enemies"
          :key="e.id"
          class="image-card"
          :class="{ dead: e.currentHp <= 0, selected: selectedTarget === e.id, boss: getEnemyMaster(e.id)?.isBoss, active: activeActorId === e.id, pop: isPopping(e.id) }"
          @click="selectedTarget = e.id"
        >
          <img
            v-if="getImagePath(getEnemyMaster(e.id), 'enemies')"
            :src="getImagePath(getEnemyMaster(e.id), 'enemies')"
            :alt="e.name"
          />
          <div v-else class="image-placeholder">NO IMAGE</div>
          <div class="label">{{ enemyDisplayName(e.id, e.name) }}</div>
        </div>
      </div>

      <div class="enemy-status">
        <h2>敵</h2>
        <div
          v-for="e in battle.enemies"
          :key="e.id"
          class="status-card"
          :class="{ dead: e.currentHp <= 0, selected: selectedTarget === e.id, boss: getEnemyMaster(e.id)?.isBoss, active: activeActorId === e.id, pop: isPopping(e.id) }"
          @click="selectedTarget = e.id"
        >
          <div class="name">{{ enemyDisplayName(e.id, e.name) }}</div>
          <div class="meta">Lv {{ e.level }}</div>
          <div>HP: {{ e.currentHp }} / {{ e.base.maxHp }}</div>
        </div>
      </div>
    </div>

    <div class="bottom-area" v-if="battle">
      <div class="log-column">
        <div class="log-window">
          <div v-for="(l, i) in logDisplay" :key="i" :class="{ 'log-latest': i === 0 }">{{ l }}</div>
        </div>
        <div class="log-window system-log">
          <div v-for="(l, i) in systemLogDisplay" :key="i" :class="{ 'log-latest': i === 0 }">{{ l }}</div>
        </div>
      </div>
      <div class="command-area">
        <div>次の行動者: {{ actorDisplayName(nextActor()) }}</div>
        <!-- コマンドウィンドウ（ドロップダウン禁止 → ボタン選択） -->
        <div v-if="enemyActing" class="sub-window">
          <div>敵の行動中...</div>
          <small class="hint">（入力不可）</small>
        </div>
        <div v-else-if="!isPlayerTurn" class="sub-window">
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
          <button :disabled="loading" class="cmd cmd-secondary" :class="{ selected: cursorIndex === 0 }" @click="backToCommand">戻る</button>
          <button
            v-for="(s, idx) in availableSkills"
            :key="s.id"
            :disabled="loading || nextActor()?.currentMp < (s.cost ?? 0)"
            class="cmd"
            :class="{ selected: cursorIndex === Number(idx) + 1 }"
            @click="commitSkillSelection(s)"
            @mouseenter="hoverSkillId = s.id"
            @mouseleave="hoverSkillId = ''"
          >
            {{ s.name }} (MP {{ s.cost ?? 0 }})
            <span v-if="hoverSkillId === s.id" class="skill-tooltip">{{ formatSkillDetail(s) }}</span>
          </button>
          <small class="hint">↑↓で選択 / Enterで決定 / Escで戻る</small>
        </div>

        <div v-else-if="uiMode === 'item'" class="sub-window">
          <button :disabled="loading" class="cmd cmd-secondary" :class="{ selected: cursorIndex === 0 }" @click="backToCommand">戻る</button>
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
          <button :disabled="loading" class="cmd cmd-secondary" :class="{ selected: cursorIndex === 0 }" @click="backToCommand">戻る</button>
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
    </div>
  </div>
</template>

<style scoped>
.game-screen { width: 960px; margin: 0 auto; background: #222; padding: 12px; border: 1px solid #444; height: 840px; overflow: hidden; display: flex; flex-direction: column; }
.top-bar { display: flex; justify-content: space-between; padding: 8px 12px; border: 1px solid #333; background: #111; margin-bottom: 12px; }
.main-area { display: grid; grid-template-columns: 1fr 1fr 0.5fr 1fr 1fr; gap: 8px; align-items: start; flex: 1; overflow: hidden; }
.party-status, .enemy-status { border: 1px solid #333; background: #111; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.status-card { padding: 6px; border: 1px solid #333; }
.status-card .name { font-weight: bold; }
.status-card .meta { color: #9ad; font-size: 12px; }
.party-images, .enemy-images { display: grid; gap: 8px; }
.image-card { border: 1px solid #333; background: #111; padding: 6px; text-align: center; cursor: pointer; }
.image-card img { width: 120px; height: 120px; object-fit: contain; border: 1px solid #222; background: #000; }
.image-placeholder { width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; background: #000; color: #666; font-size: 10px; margin: 0 auto; }
.image-card .label { font-size: 12px; margin-top: 4px; }
.spacer { min-height: 1px; }
.dead { opacity: 0.4; }
.selected { outline: 2px solid #6cf; }
.boss { border-color: #f6c; box-shadow: 0 0 6px rgba(255, 102, 204, 0.6); }
.bottom-area { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 12px; }
.log-column { display: flex; flex-direction: column; gap: 8px; }
.log-window { border: 1px solid #333; background: #111; padding: 8px; height: calc(1.4em * 5 + 16px); overflow-y: auto; line-height: 1.4; }
.system-log { border-color: #2a2a2a; background: #0d0d0d; }
.log-window .log-latest { color: #ffd700; font-weight: bold; text-shadow: 0 0 4px rgba(255, 215, 0, 0.5); }
.command-area { border: 1px solid #333; background: #111; padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow: visible; }
.command-window, .sub-window { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid #333; background: #0c0c0c; overflow: visible; }
.cmd { text-align: left; position: relative; }
.cmd-secondary { border-color: #446; background: #0f1522; color: #cfe3ff; }
.hint { color: #aaa; }
.error { color: #f66; }
button { padding: 8px 12px; }
.active { outline: 2px solid #f90; box-shadow: 0 0 6px rgba(255, 153, 0, 0.6); }
.pop { animation: pop-bounce 1.2s ease; }
.image-card.pop img, .image-card.pop .image-placeholder { transform: scale(1.2); }
.status-card.pop { transform: scale(1.12); }
.image-card, .status-card { transition: transform 0.2s ease; }
.party-status, .enemy-status, .party-images, .enemy-images { overflow: hidden; }
.party-status, .enemy-status { overflow-y: auto; }
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
@keyframes pop-bounce {
  0% { transform: scale(1) translateY(0); }
  30% { transform: scale(1.25) translateY(-8px); }
  60% { transform: scale(1.18) translateY(0); }
  100% { transform: scale(1) translateY(0); }
}
</style>


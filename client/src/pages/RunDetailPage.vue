<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { api } from "../services/apiClient";
import router from "../router";
import { useRoute } from "vue-router";

const route = useRoute();
const run = ref<any>(null);
const error = ref("");

const runStats = computed(() => {
  const raw = run.value?.run_stats_json;
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
});

const characterLevels = computed(() => {
  const rs: any = runStats.value ?? {};
  const obj = rs.characterLevels ?? rs.character_levels ?? {};
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
});

const skillLevels = computed(() => {
  const rs: any = runStats.value ?? {};
  const obj = rs.skillLevels ?? rs.skill_levels ?? {};
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
});

const load = async () => {
  try {
    const list = await api.listRuns();
    run.value = list.data.find((r: any) => String(r.id) === route.params.id);
  } catch (e: any) {
    error.value = e.message;
  }
};

onMounted(load);
</script>

<template>
  <div class="panel">
    <h1>戦績詳細</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="run">
      <p>終了理由: {{ run.ended_reason }}</p>
      <p>最高階層: {{ run.max_floor_reached }}</p>
      <p>最大ダメージ: {{ run.max_damage }}</p>

      <div class="grid" v-if="runStats">
        <div class="box">
          <h2>キャラクターLv</h2>
          <table>
            <thead><tr><th>ID</th><th>Lv</th></tr></thead>
            <tbody>
              <tr v-for="[id, lv] in characterLevels" :key="id">
                <td>{{ id }}</td>
                <td>{{ lv }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="box">
          <h2>スキルLv</h2>
          <table>
            <thead><tr><th>ID</th><th>Lv</th></tr></thead>
            <tbody>
              <tr v-for="[id, lv] in skillLevels" :key="id">
                <td>{{ id }}</td>
                <td>{{ lv }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <details>
        <summary>run_stats_json（デバッグ表示）</summary>
        <pre>{{ JSON.stringify(runStats, null, 2) }}</pre>
      </details>
    </div>
    <div class="actions">
      <button @click="router.push('/stats')">戻る</button>
    </div>
  </div>
</template>

<style scoped>
.panel { background: #222; padding: 16px; border: 1px solid #444; }
.actions { margin-top: 8px; }
.error { color: #f66; }
button { padding: 8px 12px; }
pre { background: #111; padding: 8px; border: 1px solid #333; overflow: auto; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.box { background: #111; border: 1px solid #333; padding: 8px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #333; padding: 4px 6px; }
</style>


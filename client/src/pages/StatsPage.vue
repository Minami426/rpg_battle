<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../services/apiClient";
import router from "../router";

const runs = ref<any[]>([]);
const ranking = ref<any[]>([]);
const error = ref("");

const load = async () => {
  try {
    const r1 = await api.listRuns();
    runs.value = r1.data;
    const r2 = await api.ranking();
    ranking.value = r2.data;
  } catch (e: any) {
    error.value = e.message;
  }
};

onMounted(load);
</script>

<template>
  <div class="panel">
    <h1>戦績 / ランキング</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="content">
      <h2>自分の戦績</h2>
      <table>
        <thead>
          <tr><th>日時</th><th>終了理由</th><th>最高階層</th><th>最大ダメージ</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in runs" :key="r.id" @click="router.push(`/runs/${r.id}`)" class="row">
            <td>{{ r.created_at }}</td>
            <td>{{ r.ended_reason }}</td>
            <td>{{ r.max_floor_reached }}</td>
            <td>{{ r.max_damage }}</td>
          </tr>
        </tbody>
      </table>

      <h2>ランキング</h2>
      <table>
        <thead>
          <tr><th>順位</th><th>ユーザー</th><th>最高階層</th><th>最大ダメージ</th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in ranking" :key="r.user_id">
            <td>{{ idx + 1 }}</td>
            <td>{{ r.username }}</td>
            <td>{{ r.best_floor }}</td>
            <td>{{ r.best_damage }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="actions">
      <button class="btn-secondary" @click="router.push('/menu')">戻る</button>
    </div>
  </div>
</template>

<style scoped>
.panel { background: #222; padding: 16px; border: 1px solid #444; height: 840px; overflow: hidden; display: flex; flex-direction: column; }
.content { overflow-y: auto; flex: 1; }
.row { cursor: pointer; }
.row:hover { background: #333; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
th, td { border: 1px solid #444; padding: 6px; }
.error { color: #f66; }
.actions { margin-top: 8px; }
button { padding: 8px 12px; }
.btn-secondary { border-color: #446; background: #0f1522; color: #cfe3ff; }
</style>


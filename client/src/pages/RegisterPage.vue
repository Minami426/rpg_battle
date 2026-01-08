<script setup lang="ts">
import { ref } from "vue";
import { api } from "../services/apiClient";
import router from "../router";
import { appState } from "../stores/appState";

const username = ref("");
const password = ref("");
const error = ref("");

const register = async () => {
  error.value = "";
  try {
    const res = await api.register(username.value, password.value);
    appState.user = { userId: res.data.userId, username: username.value };
    const st = await api.getState();
    appState.state = st.data?.state_json ?? st.data?.state ?? null;
    appState.maxDamageCurrentRun = (appState.state as any)?.currentRunMaxDamage ?? 0;
    router.push("/start");
  } catch (e: any) {
    error.value = e.message;
  }
};
</script>

<template>
  <div class="panel">
    <h1>新規登録</h1>
    <div class="field">
      <label>ユーザー名</label>
      <input v-model="username" />
    </div>
    <div class="field">
      <label>パスワード</label>
      <input type="password" v-model="password" />
    </div>
    <div class="actions">
      <button @click="register">登録する</button>
      <button @click="router.push('/login')">ログインへ戻る</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.panel { max-width: 360px; margin: 0 auto; background: #222; padding: 16px; border: 1px solid #444; }
.field { margin-bottom: 12px; display: flex; flex-direction: column; }
.actions { display: flex; gap: 8px; }
.error { color: #f66; }
button { padding: 8px 12px; }
input { padding: 6px 8px; }
</style>


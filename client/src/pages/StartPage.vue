<script setup lang="ts">
import { computed } from "vue";
import router from "../router";
import { api } from "../services/apiClient";
import { appState } from "../stores/appState";

const username = computed(() => appState.user.username || "(unknown)");

const gameStart = () => {
  const resume = appState.state?.resume?.screen || "start";
  if (resume === "party_select") router.push("/party");
  else if (resume === "menu") router.push("/menu");
  else router.push("/party");
};

const logout = async () => {
  await api.logout().catch(() => {});
  appState.user = { userId: null, username: null };
  appState.state = null;
  router.push("/login");
};
</script>

<template>
  <div class="panel">
    <h1>Start</h1>
    <p>ようこそ、{{ username }} さん</p>
    <div class="actions">
      <button @click="gameStart">ゲームスタート</button>
      <button @click="logout">ログアウト</button>
    </div>
  </div>
</template>

<style scoped>
.panel { max-width: 360px; margin: 0 auto; background: #222; padding: 16px; border: 1px solid #444; }
.actions { display: flex; gap: 8px; }
button { padding: 8px 12px; }
</style>


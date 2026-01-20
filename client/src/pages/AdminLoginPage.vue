<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/apiClient'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = 'ユーザー名とパスワードを入力してください'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await api.adminLogin(username.value, password.value)
    router.push('/admin')
  } catch (e: any) {
    error.value = e?.message || 'ログインに失敗しました'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="admin-login">
    <div class="login-card">
      <h1>管理者ログイン</h1>
      <form @submit.prevent="handleLogin">
        <div class="field">
          <label>ユーザー名</label>
          <input v-model="username" type="text" autocomplete="username" />
        </div>
        <div class="field">
          <label>パスワード</label>
          <input v-model="password" type="password" autocomplete="current-password" />
        </div>
        <div v-if="error" class="error">{{ error }}</div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'ログイン中...' : 'ログイン' }}
        </button>
      </form>
      <div class="back-link">
        <router-link to="/">← ゲームに戻る</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.login-card {
  background: #0f0f23;
  border: 2px solid #4a9eff;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 0 30px rgba(74, 158, 255, 0.2);
}

h1 {
  color: #4a9eff;
  text-align: center;
  margin-bottom: 1.5rem;
  font-family: 'Segoe UI', sans-serif;
}

.field {
  margin-bottom: 1rem;
}

label {
  display: block;
  color: #8ab4f8;
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #4a9eff;
  border-radius: 6px;
  background: #1a1a2e;
  color: #fff;
  font-size: 1rem;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #6bb5ff;
  box-shadow: 0 0 8px rgba(74, 158, 255, 0.4);
}

button {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #4a9eff 0%, #2d6fd6 100%);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}

button:hover:not(:disabled) {
  background: linear-gradient(135deg, #6bb5ff 0%, #4a9eff 100%);
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #ff6b6b;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  text-align: center;
}

.back-link {
  text-align: center;
  margin-top: 1.5rem;
}

.back-link a {
  color: #8ab4f8;
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link a:hover {
  text-decoration: underline;
}
</style>


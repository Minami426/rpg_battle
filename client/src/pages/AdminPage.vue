<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/apiClient'

const router = useRouter()
const username = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await api.adminSession()
    if (!res.data?.loggedIn) {
      router.push('/admin/login')
      return
    }
    username.value = res.data.username
  } catch {
    router.push('/admin/login')
  } finally {
    loading.value = false
  }
})

async function handleLogout() {
  await api.adminLogout()
  router.push('/admin/login')
}

const menuItems = [
  { id: 'characters', name: 'キャラクター', icon: '🧙', path: '/admin/characters' },
  { id: 'skills', name: 'スキル', icon: '⚔️', path: '/admin/skills' },
  { id: 'items', name: 'アイテム', icon: '🧪', path: '/admin/items' },
  { id: 'conditions', name: '状態異常', icon: '💫', path: '/admin/conditions' },
  { id: 'enemies', name: '敵', icon: '👹', path: '/admin/enemies' },
]
</script>

<template>
  <div class="admin-page">
    <header>
      <h1>管理者ページ</h1>
      <div class="user-info">
        <span>{{ username }}</span>
        <button @click="handleLogout">ログアウト</button>
      </div>
    </header>

    <div v-if="loading" class="loading">読み込み中...</div>

    <main v-else>
      <h2>マスタデータ管理</h2>
      <div class="menu-grid">
        <router-link
          v-for="item in menuItems"
          :key="item.id"
          :to="item.path"
          class="menu-item"
        >
          <span class="icon">{{ item.icon }}</span>
          <span class="name">{{ item.name }}</span>
        </router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid #4a9eff;
}

header h1 {
  color: #4a9eff;
  margin: 0;
  font-size: 1.5rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info span {
  color: #8ab4f8;
}

.user-info button {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #ff6b6b;
  border-radius: 4px;
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.user-info button:hover {
  background: #ff6b6b;
  color: #fff;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #8ab4f8;
}

main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  color: #8ab4f8;
  margin-bottom: 1.5rem;
  font-size: 1.3rem;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  background: #0f0f23;
  border: 2px solid #4a9eff;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.menu-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(74, 158, 255, 0.3);
  border-color: #6bb5ff;
}

.menu-item .icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.menu-item .name {
  color: #fff;
  font-size: 1.1rem;
  font-weight: bold;
}
</style>


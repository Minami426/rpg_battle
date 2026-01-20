<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/apiClient'

const router = useRouter()
const items = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  id: '',
  name: '',
  description: '',
  type: 'potion',
  target: 'ally',
  battleUsable: true,
  maxStack: 99,
  effect: { kind: 'heal_hp', power: 30 },
})

const effectStr = ref('')

const isEditing = computed(() => editingId.value !== null)
const targets = ['ally', 'enemy', 'self']

onMounted(async () => {
  try {
    const session = await api.adminSession()
    if (!session.data?.loggedIn) {
      router.push('/admin/login')
      return
    }
    await loadItems()
  } catch {
    router.push('/admin/login')
  }
})

async function loadItems() {
  loading.value = true
  try {
    const res = await api.adminGetItems()
    items.value = res.data || []
  } catch (e: any) {
    error.value = e?.message || '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {
    id: '',
    name: '',
    description: '',
    type: 'potion',
    target: 'ally',
    battleUsable: true,
    maxStack: 99,
    effect: { kind: 'heal_hp', power: 30 },
  }
  effectStr.value = JSON.stringify(form.value.effect)
  editingId.value = null
}

function openCreateForm() {
  resetForm()
  showForm.value = true
}

function openEditForm(item: any) {
  editingId.value = item.id
  form.value = { ...item }
  effectStr.value = JSON.stringify(item.effect || {})
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  resetForm()
}

async function handleSubmit() {
  try {
    form.value.effect = effectStr.value ? JSON.parse(effectStr.value) : {}
  } catch {
    error.value = '効果JSONが不正です'
    return
  }

  try {
    if (isEditing.value) {
      const { id, ...data } = form.value
      await api.adminUpdateItem(editingId.value!, data)
    } else {
      await api.adminCreateItem(form.value)
    }
    await loadItems()
    closeForm()
  } catch (e: any) {
    error.value = e?.message || '保存に失敗しました'
  }
}

async function handleDelete(id: string) {
  if (!confirm(`アイテム "${id}" を削除しますか？`)) return
  try {
    await api.adminDeleteItem(id)
    await loadItems()
  } catch (e: any) {
    error.value = e?.message || '削除に失敗しました'
  }
}
</script>

<template>
  <div class="admin-edit-page">
    <header>
      <router-link to="/admin" class="back">← 戻る</router-link>
      <h1>アイテム管理</h1>
      <button @click="openCreateForm" class="add-btn">+ 新規作成</button>
    </header>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-else class="content">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>名前</th>
            <th>種類</th>
            <th>対象</th>
            <th>効果</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.type }}</td>
            <td>{{ item.target }}</td>
            <td>{{ item.effect?.kind }}: {{ item.effect?.power }}</td>
            <td>
              <button @click="openEditForm(item)" class="edit-btn">編集</button>
              <button @click="handleDelete(item.id)" class="delete-btn">削除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <h2>{{ isEditing ? 'アイテム編集' : '新規アイテム' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-grid">
            <div class="field">
              <label>ID</label>
              <input v-model="form.id" :disabled="isEditing" required />
            </div>
            <div class="field">
              <label>名前</label>
              <input v-model="form.name" required />
            </div>
            <div class="field full">
              <label>説明</label>
              <textarea v-model="form.description"></textarea>
            </div>
            <div class="field">
              <label>種類</label>
              <input v-model="form.type" placeholder="potion, ether..." />
            </div>
            <div class="field">
              <label>対象</label>
              <select v-model="form.target">
                <option v-for="t in targets" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div class="field">
              <label>最大スタック</label>
              <input type="number" v-model.number="form.maxStack" />
            </div>
            <div class="field">
              <label>
                <input type="checkbox" v-model="form.battleUsable" /> 戦闘中使用可
              </label>
            </div>
            <div class="field full">
              <label>効果 (JSON)</label>
              <textarea v-model="effectStr" placeholder='{"kind": "heal_hp", "power": 30}'></textarea>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeForm" class="cancel-btn">キャンセル</button>
            <button type="submit" class="submit-btn">{{ isEditing ? '更新' : '作成' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-edit-page { min-height: 100vh; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; }
header { display: flex; align-items: center; gap: 1rem; padding: 1rem 2rem; background: rgba(0, 0, 0, 0.3); border-bottom: 1px solid #4a9eff; }
.back { color: #8ab4f8; text-decoration: none; }
header h1 { flex: 1; color: #4a9eff; margin: 0; font-size: 1.3rem; }
.add-btn { padding: 0.5rem 1rem; background: linear-gradient(135deg, #4a9eff 0%, #2d6fd6 100%); border: none; border-radius: 4px; color: #fff; cursor: pointer; }
.error { background: rgba(255, 107, 107, 0.2); border: 1px solid #ff6b6b; color: #ff6b6b; padding: 0.75rem 1rem; margin: 1rem 2rem; border-radius: 4px; }
.loading { text-align: center; padding: 3rem; color: #8ab4f8; }
.content { padding: 1rem 2rem; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; background: #0f0f23; border-radius: 8px; overflow: hidden; }
th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #2a2a4a; }
th { background: rgba(74, 158, 255, 0.2); color: #8ab4f8; }
.edit-btn, .delete-btn { padding: 0.3rem 0.6rem; margin-right: 0.3rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
.edit-btn { background: #4a9eff; color: #fff; }
.delete-btn { background: #ff6b6b; color: #fff; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #0f0f23; border: 2px solid #4a9eff; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal h2 { color: #4a9eff; margin: 0 0 1rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field { display: flex; flex-direction: column; }
.field.full { grid-column: 1 / -1; }
.field label { color: #8ab4f8; font-size: 0.85rem; margin-bottom: 0.3rem; }
.field input, .field textarea, .field select { padding: 0.5rem; border: 1px solid #4a9eff; border-radius: 4px; background: #1a1a2e; color: #fff; }
.field textarea { min-height: 60px; resize: vertical; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
.cancel-btn { padding: 0.6rem 1.2rem; background: transparent; border: 1px solid #8ab4f8; border-radius: 4px; color: #8ab4f8; cursor: pointer; }
.submit-btn { padding: 0.6rem 1.2rem; background: linear-gradient(135deg, #4a9eff 0%, #2d6fd6 100%); border: none; border-radius: 4px; color: #fff; cursor: pointer; }
</style>


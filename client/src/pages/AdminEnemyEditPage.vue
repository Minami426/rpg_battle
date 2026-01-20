<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/apiClient'

const router = useRouter()
const enemies = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  id: '',
  name: '',
  baseCost: 10,
  baseExp: 0,
  appearMinFloor: 1,
  appearMaxFloor: null as number | null,
  isBoss: false,
  baseStats: { maxHp: 50, maxMp: 0, atk: 8, matk: 0, def: 5, speed: 6 },
  growthPerLevel: { maxHp: 5, maxMp: 0, atk: 1, matk: 0, def: 1, speed: 1 },
  skillIds: [] as string[],
  aiProfile: { type: 'default' },
})

const skillIdsStr = ref('')
const aiProfileStr = ref('')

const isEditing = computed(() => editingId.value !== null)

onMounted(async () => {
  try {
    const session = await api.adminSession()
    if (!session.data?.loggedIn) {
      router.push('/admin/login')
      return
    }
    await loadEnemies()
  } catch {
    router.push('/admin/login')
  }
})

async function loadEnemies() {
  loading.value = true
  try {
    const res = await api.adminGetEnemies()
    enemies.value = res.data || []
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
    baseCost: 10,
    baseExp: 0,
    appearMinFloor: 1,
    appearMaxFloor: null,
    isBoss: false,
    baseStats: { maxHp: 50, maxMp: 0, atk: 8, matk: 0, def: 5, speed: 6 },
    growthPerLevel: { maxHp: 5, maxMp: 0, atk: 1, matk: 0, def: 1, speed: 1 },
    skillIds: [],
    aiProfile: { type: 'default' },
  }
  skillIdsStr.value = ''
  aiProfileStr.value = JSON.stringify({ type: 'default' })
  editingId.value = null
}

function openCreateForm() {
  resetForm()
  showForm.value = true
}

function openEditForm(enemy: any) {
  editingId.value = enemy.id
  form.value = {
    ...enemy,
    baseStats: { ...enemy.baseStats },
    growthPerLevel: { ...enemy.growthPerLevel },
    skillIds: [...(enemy.skillIds || [])],
    aiProfile: enemy.aiProfile || { type: 'default' },
  }
  skillIdsStr.value = (enemy.skillIds || []).join(', ')
  aiProfileStr.value = JSON.stringify(enemy.aiProfile || { type: 'default' })
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  resetForm()
}

async function handleSubmit() {
  form.value.skillIds = skillIdsStr.value.split(',').map(s => s.trim()).filter(Boolean)
  try {
    form.value.aiProfile = aiProfileStr.value ? JSON.parse(aiProfileStr.value) : { type: 'default' }
  } catch {
    error.value = 'AIプロフィールJSONが不正です'
    return
  }

  try {
    if (isEditing.value) {
      const { id, ...data } = form.value
      await api.adminUpdateEnemy(editingId.value!, data)
    } else {
      await api.adminCreateEnemy(form.value)
    }
    await loadEnemies()
    closeForm()
  } catch (e: any) {
    error.value = e?.message || '保存に失敗しました'
  }
}

async function handleDelete(id: string) {
  if (!confirm(`敵 "${id}" を削除しますか？`)) return
  try {
    await api.adminDeleteEnemy(id)
    await loadEnemies()
  } catch (e: any) {
    error.value = e?.message || '削除に失敗しました'
  }
}

async function handleImageUpload(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  try {
    await api.adminUploadEnemyImage(id, input.files[0])
    await loadEnemies()
  } catch (e: any) {
    error.value = e?.message || '画像アップロードに失敗しました'
  }
}
</script>

<template>
  <div class="admin-edit-page">
    <header>
      <router-link to="/admin" class="back">← 戻る</router-link>
      <h1>敵管理</h1>
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
            <th>画像</th>
            <th>コスト</th>
            <th>基礎EXP</th>
            <th>出現階層</th>
            <th>ボス</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="enemy in enemies" :key="enemy.id">
            <td>{{ enemy.id }}</td>
            <td>{{ enemy.name }}</td>
            <td>
              <div class="image-cell">
                <img v-if="enemy.imagePath" :src="enemy.imagePath" alt="" class="thumb" />
                <label class="upload-label">
                  <input type="file" accept="image/*" @change="handleImageUpload(enemy.id, $event)" />
                  📷
                </label>
              </div>
            </td>
            <td>{{ enemy.baseCost }}</td>
            <td>{{ enemy.baseExp ?? 0 }}</td>
            <td>{{ enemy.appearMinFloor }} - {{ enemy.appearMaxFloor || '∞' }}</td>
            <td>{{ enemy.isBoss ? '✓' : '' }}</td>
            <td>
              <button @click="openEditForm(enemy)" class="edit-btn">編集</button>
              <button @click="handleDelete(enemy.id)" class="delete-btn">削除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <h2>{{ isEditing ? '敵編集' : '新規敵' }}</h2>
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
            <div class="field">
              <label>基本コスト</label>
              <input type="number" v-model.number="form.baseCost" />
            </div>
            <div class="field">
              <label>基礎EXP</label>
              <input type="number" v-model.number="form.baseExp" />
            </div>
            <div class="field">
              <label>出現最小階層</label>
              <input type="number" v-model.number="form.appearMinFloor" />
            </div>
            <div class="field">
              <label>出現最大階層 (空=無限)</label>
              <input type="number" v-model.number="form.appearMaxFloor" />
            </div>
            <div class="field">
              <label>
                <input type="checkbox" v-model="form.isBoss" /> ボス
              </label>
            </div>

            <div class="stats-section">
              <h3>基本ステータス</h3>
              <div class="stats-grid">
                <div class="stat-field">
                  <label>HP</label>
                  <input type="number" v-model.number="form.baseStats.maxHp" />
                </div>
                <div class="stat-field">
                  <label>MP</label>
                  <input type="number" v-model.number="form.baseStats.maxMp" />
                </div>
                <div class="stat-field">
                  <label>ATK</label>
                  <input type="number" v-model.number="form.baseStats.atk" />
                </div>
                <div class="stat-field">
                  <label>MATK</label>
                  <input type="number" v-model.number="form.baseStats.matk" />
                </div>
                <div class="stat-field">
                  <label>DEF</label>
                  <input type="number" v-model.number="form.baseStats.def" />
                </div>
                <div class="stat-field">
                  <label>SPD</label>
                  <input type="number" v-model.number="form.baseStats.speed" />
                </div>
              </div>
            </div>

            <div class="stats-section">
              <h3>成長率 (Lv毎)</h3>
              <div class="stats-grid">
                <div class="stat-field">
                  <label>HP</label>
                  <input type="number" v-model.number="form.growthPerLevel.maxHp" />
                </div>
                <div class="stat-field">
                  <label>MP</label>
                  <input type="number" v-model.number="form.growthPerLevel.maxMp" />
                </div>
                <div class="stat-field">
                  <label>ATK</label>
                  <input type="number" v-model.number="form.growthPerLevel.atk" />
                </div>
                <div class="stat-field">
                  <label>MATK</label>
                  <input type="number" v-model.number="form.growthPerLevel.matk" />
                </div>
                <div class="stat-field">
                  <label>DEF</label>
                  <input type="number" v-model.number="form.growthPerLevel.def" />
                </div>
                <div class="stat-field">
                  <label>SPD</label>
                  <input type="number" v-model.number="form.growthPerLevel.speed" />
                </div>
              </div>
            </div>

            <div class="field full">
              <label>スキルID (カンマ区切り)</label>
              <input v-model="skillIdsStr" placeholder="attack_basic, fireball" />
            </div>
            <div class="field full">
              <label>AIプロフィール (JSON)</label>
              <textarea v-model="aiProfileStr" placeholder='{"type": "default"}'></textarea>
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
.image-cell { display: flex; align-items: center; gap: 0.5rem; }
.thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
.upload-label { cursor: pointer; padding: 0.3rem; }
.upload-label input { display: none; }
.edit-btn, .delete-btn { padding: 0.3rem 0.6rem; margin-right: 0.3rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
.edit-btn { background: #4a9eff; color: #fff; }
.delete-btn { background: #ff6b6b; color: #fff; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #0f0f23; border: 2px solid #4a9eff; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; }
.modal h2 { color: #4a9eff; margin: 0 0 1rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field { display: flex; flex-direction: column; }
.field.full { grid-column: 1 / -1; }
.field label { color: #8ab4f8; font-size: 0.85rem; margin-bottom: 0.3rem; }
.field input, .field textarea { padding: 0.5rem; border: 1px solid #4a9eff; border-radius: 4px; background: #1a1a2e; color: #fff; }
.field textarea { min-height: 60px; resize: vertical; }
.stats-section { grid-column: 1 / -1; background: rgba(74, 158, 255, 0.1); padding: 1rem; border-radius: 8px; margin-top: 0.5rem; }
.stats-section h3 { margin: 0 0 0.75rem; color: #8ab4f8; font-size: 0.95rem; }
.stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; }
.stat-field { display: flex; flex-direction: column; }
.stat-field label { color: #8ab4f8; font-size: 0.75rem; margin-bottom: 0.2rem; }
.stat-field input { padding: 0.4rem; border: 1px solid #4a9eff; border-radius: 4px; background: #1a1a2e; color: #fff; width: 100%; box-sizing: border-box; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
.cancel-btn { padding: 0.6rem 1.2rem; background: transparent; border: 1px solid #8ab4f8; border-radius: 4px; color: #8ab4f8; cursor: pointer; }
.submit-btn { padding: 0.6rem 1.2rem; background: linear-gradient(135deg, #4a9eff 0%, #2d6fd6 100%); border: none; border-radius: 4px; color: #fff; cursor: pointer; }
</style>


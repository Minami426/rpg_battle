<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/apiClient'

const router = useRouter()
const characters = ref<any[]>([])
const skills = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  id: '',
  name: '',
  description: '',
  baseStats: { maxHp: 100, maxMp: 30, atk: 15, matk: 10, def: 10, speed: 10 },
  growthPerLevel: { maxHp: 8, maxMp: 3, atk: 2, matk: 2, def: 2, speed: 1 },
  initialSkillIds: [] as string[],
  learnableSkillIds: [] as string[],
  skillLearnLevels: {} as Record<string, number>,
  tags: [] as string[],
})

const initialSkillIdsStr = ref('')
const learnableSkillIdsStr = ref('')
const tagsStr = ref('')

const isEditing = computed(() => editingId.value !== null)
const skillNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const s of skills.value) {
    map[s.id] = s.name
  }
  return map
})

onMounted(async () => {
  try {
    const session = await api.adminSession()
    if (!session.data?.loggedIn) {
      router.push('/admin/login')
      return
    }
    await loadCharacters()
    await loadSkills()
  } catch {
    router.push('/admin/login')
  }
})

async function loadCharacters() {
  loading.value = true
  try {
    const res = await api.adminGetCharacters()
    characters.value = res.data || []
  } catch (e: any) {
    error.value = e?.message || '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

async function loadSkills() {
  try {
    const res = await api.adminGetSkills()
    skills.value = res.data || []
  } catch (e: any) {
    console.warn('スキルマスタの読み込みに失敗しました', e)
  }
}

function resetForm() {
  form.value = {
    id: '',
    name: '',
    description: '',
    baseStats: { maxHp: 100, maxMp: 30, atk: 15, matk: 10, def: 10, speed: 10 },
    growthPerLevel: { maxHp: 8, maxMp: 3, atk: 2, matk: 2, def: 2, speed: 1 },
    initialSkillIds: [],
    learnableSkillIds: [],
    skillLearnLevels: {},
    tags: [],
  }
  initialSkillIdsStr.value = ''
  learnableSkillIdsStr.value = ''
  tagsStr.value = ''
  editingId.value = null
}

function openCreateForm() {
  resetForm()
  showForm.value = true
}

function openEditForm(char: any) {
  editingId.value = char.id
  form.value = {
    id: char.id,
    name: char.name,
    description: char.description || '',
    baseStats: { ...char.baseStats },
    growthPerLevel: { ...char.growthPerLevel },
    initialSkillIds: [...(char.initialSkillIds || [])],
    learnableSkillIds: [...(char.learnableSkillIds || [])],
    skillLearnLevels: { ...(char.skillLearnLevels || {}) },
    tags: [...(char.tags || [])],
  }
  initialSkillIdsStr.value = (char.initialSkillIds || []).join(', ')
  learnableSkillIdsStr.value = (char.learnableSkillIds || []).join(', ')
  tagsStr.value = (char.tags || []).join(', ')
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  resetForm()
}

async function handleSubmit() {
  // Parse comma-separated strings
  form.value.initialSkillIds = initialSkillIdsStr.value.split(',').map(s => s.trim()).filter(Boolean)
  form.value.learnableSkillIds = learnableSkillIdsStr.value.split(',').map(s => s.trim()).filter(Boolean)
  form.value.tags = tagsStr.value.split(',').map(s => s.trim()).filter(Boolean)
  for (const [sid, level] of Object.entries(form.value.skillLearnLevels || {})) {
    if (!Number.isFinite(level) || level < 1) {
      error.value = `習得レベルが不正です (${sid})`
      return
    }
  }

  try {
    if (isEditing.value) {
      const { id, ...data } = form.value
      await api.adminUpdateCharacter(editingId.value!, data)
    } else {
      await api.adminCreateCharacter(form.value)
    }
    await loadCharacters()
    closeForm()
  } catch (e: any) {
    error.value = e?.message || '保存に失敗しました'
  }
}

function isSkillEnabled(skillId: string) {
  return skillId in (form.value.skillLearnLevels || {})
}

function getSkillLevel(skillId: string) {
  return form.value.skillLearnLevels?.[skillId] ?? 1
}

function toggleSkillLearnLevel(skillId: string, enabled: boolean) {
  if (!form.value.skillLearnLevels) form.value.skillLearnLevels = {}
  if (enabled) {
    if (!form.value.skillLearnLevels[skillId]) {
      form.value.skillLearnLevels[skillId] = 1
    }
  } else {
    delete form.value.skillLearnLevels[skillId]
  }
}

function updateSkillLearnLevel(skillId: string, level: number) {
  if (!form.value.skillLearnLevels) form.value.skillLearnLevels = {}
  form.value.skillLearnLevels[skillId] = Math.max(1, Math.floor(level || 1))
}

async function handleDelete(id: string) {
  if (!confirm(`キャラクター "${id}" を削除しますか？`)) return
  try {
    await api.adminDeleteCharacter(id)
    await loadCharacters()
  } catch (e: any) {
    error.value = e?.message || '削除に失敗しました'
  }
}

async function handleImageUpload(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  try {
    await api.adminUploadCharacterImage(id, input.files[0])
    await loadCharacters()
  } catch (e: any) {
    error.value = e?.message || '画像アップロードに失敗しました'
  }
}
</script>

<template>
  <div class="admin-edit-page">
    <header>
      <router-link to="/admin" class="back">← 戻る</router-link>
      <h1>キャラクター管理</h1>
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
            <th>HP/MP</th>
            <th>ATK/MATK</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="char in characters" :key="char.id">
            <td>{{ char.id }}</td>
            <td>{{ char.name }}</td>
            <td>
              <div class="image-cell">
                <img v-if="char.imagePath" :src="char.imagePath" alt="" class="thumb" />
                <label class="upload-label">
                  <input type="file" accept="image/*" @change="handleImageUpload(char.id, $event)" />
                  📷
                </label>
              </div>
            </td>
            <td>{{ char.baseStats.maxHp }} / {{ char.baseStats.maxMp }}</td>
            <td>{{ char.baseStats.atk }} / {{ char.baseStats.matk }}</td>
            <td>
              <button @click="openEditForm(char)" class="edit-btn">編集</button>
              <button @click="handleDelete(char.id)" class="delete-btn">削除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- フォームモーダル -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <h2>{{ isEditing ? 'キャラクター編集' : '新規キャラクター' }}</h2>
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
              <label>初期スキルID (カンマ区切り)</label>
              <input v-model="initialSkillIdsStr" placeholder="attack_basic, heal_small" />
            </div>
            <div class="field full">
              <label>習得可能スキルID (カンマ区切り)</label>
              <input v-model="learnableSkillIdsStr" placeholder="fireball, ice_storm" />
            </div>
            <div class="stats-section">
              <h3>習得レベル設定</h3>
              <div class="learn-table-wrap">
                <table class="learn-table">
                  <thead>
                    <tr>
                      <th>有効</th>
                      <th>スキル名</th>
                      <th>スキルID</th>
                      <th>習得レベル</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="(form.learnableSkillIds?.length ?? 0) === 0">
                      <td class="empty" colspan="4">習得可能スキルを先に設定してください</td>
                    </tr>
                    <tr
                      v-for="sid in form.learnableSkillIds"
                      :key="sid"
                      :class="{ disabled: !isSkillEnabled(sid) }"
                    >
                      <td>
                        <input
                          type="checkbox"
                          :checked="isSkillEnabled(sid)"
                          @change="toggleSkillLearnLevel(sid, ($event.target as HTMLInputElement).checked)"
                        />
                      </td>
                      <td>{{ skillNameMap[sid] ?? sid }}</td>
                      <td class="mono">{{ sid }}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          :disabled="!isSkillEnabled(sid)"
                          :value="getSkillLevel(sid)"
                          @input="updateSkillLearnLevel(sid, Number(($event.target as HTMLInputElement).value))"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="field full">
              <label>タグ (カンマ区切り)</label>
              <input v-model="tagsStr" placeholder="balanced, magical" />
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
.admin-edit-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
}

header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid #4a9eff;
}

.back {
  color: #8ab4f8;
  text-decoration: none;
}

header h1 {
  flex: 1;
  color: #4a9eff;
  margin: 0;
  font-size: 1.3rem;
}

.add-btn {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #4a9eff 0%, #2d6fd6 100%);
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
}

.error {
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid #ff6b6b;
  color: #ff6b6b;
  padding: 0.75rem 1rem;
  margin: 1rem 2rem;
  border-radius: 4px;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #8ab4f8;
}

.content {
  padding: 1rem 2rem;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #0f0f23;
  border-radius: 8px;
  overflow: hidden;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #2a2a4a;
}

th {
  background: rgba(74, 158, 255, 0.2);
  color: #8ab4f8;
}

.learn-table-wrap {
  overflow-x: auto;
}

.learn-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(15, 15, 35, 0.6);
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  overflow: hidden;
}

.learn-table th,
.learn-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #2a2a4a;
  vertical-align: middle;
}

.learn-table th {
  background: rgba(74, 158, 255, 0.15);
  color: #8ab4f8;
}

.learn-table tr.disabled {
  opacity: 0.6;
}

.learn-table .mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85rem;
}

.learn-table .empty {
  text-align: center;
  color: #8ab4f8;
  padding: 0.75rem;
}

.image-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.upload-label {
  cursor: pointer;
  padding: 0.3rem;
}

.upload-label input {
  display: none;
}

.edit-btn, .delete-btn {
  padding: 0.3rem 0.6rem;
  margin-right: 0.3rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.edit-btn {
  background: #4a9eff;
  color: #fff;
}

.delete-btn {
  background: #ff6b6b;
  color: #fff;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #0f0f23;
  border: 2px solid #4a9eff;
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  color: #4a9eff;
  margin: 0 0 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
}

.field.full {
  grid-column: 1 / -1;
}

.field label {
  color: #8ab4f8;
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
}

.field input, .field textarea {
  padding: 0.5rem;
  border: 1px solid #4a9eff;
  border-radius: 4px;
  background: #1a1a2e;
  color: #fff;
}

.field textarea {
  min-height: 60px;
  resize: vertical;
}

.stats-section {
  grid-column: 1 / -1;
  background: rgba(74, 158, 255, 0.1);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 0.5rem;
}

.stats-section h3 {
  margin: 0 0 0.75rem;
  color: #8ab4f8;
  font-size: 0.95rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
}

.stat-field {
  display: flex;
  flex-direction: column;
}

.stat-field label {
  color: #8ab4f8;
  font-size: 0.75rem;
  margin-bottom: 0.2rem;
}

.stat-field input {
  padding: 0.4rem;
  border: 1px solid #4a9eff;
  border-radius: 4px;
  background: #1a1a2e;
  color: #fff;
  width: 100%;
  box-sizing: border-box;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.cancel-btn {
  padding: 0.6rem 1.2rem;
  background: transparent;
  border: 1px solid #8ab4f8;
  border-radius: 4px;
  color: #8ab4f8;
  cursor: pointer;
}

.submit-btn {
  padding: 0.6rem 1.2rem;
  background: linear-gradient(135deg, #4a9eff 0%, #2d6fd6 100%);
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
}
</style>


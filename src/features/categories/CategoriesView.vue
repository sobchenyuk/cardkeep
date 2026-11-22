<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/ui/PageHeader.vue'
import { useCategories, CategoryError } from '@/stores/categories'
import { useCards } from '@/stores/cards'
import { useToast } from '@/stores/toast'

const categories = useCategories()
const cards = useCards()
const toast = useToast()
const router = useRouter()

const count = computed(() => {
  const m = new Map<string, number>()
  for (const c of cards.items) if (c.categoryId) m.set(c.categoryId, (m.get(c.categoryId) ?? 0) + 1)
  return m
})
const plural = (n: number) => {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} картка`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} картки`
  return `${n} карток`
}

// Create
const newName = ref('')
const createError = ref('')
async function create() {
  createError.value = ''
  try {
    await categories.create(newName.value)
    newName.value = ''
  } catch (e) {
    createError.value = e instanceof CategoryError ? e.message : 'Не вдалося створити'
  }
}

// Rename
const editingId = ref<string | null>(null)
const editName = ref('')
const editError = ref('')
const editInput = ref<HTMLInputElement[]>()
function startEdit(id: string, name: string) {
  editingId.value = id
  editName.value = name
  editError.value = ''
  nextTick(() => editInput.value?.[0]?.focus())
}
async function saveEdit() {
  if (!editingId.value) return
  try {
    await categories.rename(editingId.value, editName.value)
    editingId.value = null
  } catch (e) {
    editError.value = e instanceof CategoryError ? e.message : 'Не вдалося перейменувати'
  }
}

// Delete (tap twice)
const confirmId = ref<string | null>(null)
let t: ReturnType<typeof setTimeout>
async function remove(id: string) {
  if (confirmId.value !== id) {
    confirmId.value = id
    clearTimeout(t)
    t = setTimeout(() => (confirmId.value = null), 3000)
    return
  }
  confirmId.value = null
  try {
    await categories.remove(id)
    toast.show('success', 'Категорію видалено')
  } catch {
    toast.show('error', 'Не вдалося видалити категорію')
  }
}
</script>

<template>
  <PageHeader title="Категорії" />

  <form class="create" @submit.prevent="create">
    <input v-model="newName" class="input" placeholder="Нова категорія" maxlength="40" enterkeyhint="done" @input="createError = ''" />
    <button class="btn btn-primary" :disabled="!newName.trim()">Додати</button>
  </form>
  <p v-if="createError" class="error-text pad">{{ createError }}</p>

  <ul v-if="categories.ordered.length" class="list">
    <li v-for="(c, i) in categories.ordered" :key="c.id" class="item">
      <template v-if="editingId === c.id">
        <form class="edit" @submit.prevent="saveEdit">
          <input ref="editInput" v-model="editName" class="input" maxlength="40" @keydown.esc="editingId = null" />
          <button class="btn btn-primary">OK</button>
          <button type="button" class="btn btn-soft" @click="editingId = null">✕</button>
        </form>
        <p v-if="editError" class="error-text">{{ editError }}</p>
      </template>
      <template v-else>
        <button class="main" @click="router.push({ name: 'cards', query: { cat: c.id } })">
          <span class="name">{{ c.name }}</span>
          <span class="count">{{ plural(count.get(c.id) ?? 0) }}</span>
        </button>
        <div class="tools">
          <button aria-label="Вище" :disabled="i === 0" @click="categories.move(c.id, -1)">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button aria-label="Нижче" :disabled="i === categories.ordered.length - 1" @click="categories.move(c.id, 1)">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button aria-label="Перейменувати" @click="startEdit(c.id, c.name)">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" /></svg>
          </button>
          <button aria-label="Видалити" class="del" :class="{ armed: confirmId === c.id }" @click="remove(c.id)">
            <svg v-if="confirmId !== c.id" viewBox="0 0 24 24" width="20" height="20"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" /></svg>
            <span v-else>Видалити?</span>
          </button>
        </div>
      </template>
    </li>
  </ul>
  <p v-else class="hint">Категорій поки немає. Створіть першу — наприклад, «Продукти» чи «Аптеки».</p>
  <p v-if="categories.ordered.length" class="hint small">Під час видалення категорії картки не зникають, а переходять у «Без категорії».</p>
</template>

<style scoped>
.create { display: flex; gap: 8px; padding: 4px 16px 8px; }
.create .input { flex: 1; min-width: 0; }
.pad { padding: 0 20px; }
.list { list-style: none; margin: 8px 16px; padding: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 22px; overflow: hidden; }
.item { display: flex; align-items: center; gap: 4px; padding: 6px 6px 6px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.item:last-child { border-bottom: 0; }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; padding: 8px 0; text-align: left; }
.name { font-weight: 650; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.count { font-size: 13px; color: var(--text-2); }
.tools { display: flex; }
.tools button { width: 38px; height: 40px; display: grid; place-items: center; border-radius: 12px; color: var(--text-2); }
.tools button:disabled { opacity: 0.3; }
.tools .del.armed { width: auto; padding: 0 10px; background: var(--danger); color: #fff; font-size: 13px; font-weight: 700; }
.edit { display: flex; gap: 6px; width: 100%; padding: 4px 0; }
.edit .input { flex: 1; min-width: 0; min-height: 44px; }
.edit .btn { min-height: 44px; padding: 0 14px; }
.hint { padding: 12px 20px; color: var(--text-2); }
.small { font-size: 13px; }
</style>

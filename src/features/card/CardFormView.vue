<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CodeFormat } from '@/db'
import { useCards, type CardDraft } from '@/stores/cards'
import { useCategories, CategoryError } from '@/stores/categories'
import { useToast } from '@/stores/toast'
import PhotoSlot from './PhotoSlot.vue'
import ScannerOverlay from '@/features/scan/ScannerOverlay.vue'
import { detectInImage, type ScanResult } from '@/features/scan/detector'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const route = useRoute()
const cards = useCards()
const categories = useCategories()
const toast = useToast()

const existing = props.id ? cards.get(props.id) : undefined
const isEdit = !!existing

const FORMATS: { value: CodeFormat; label: string }[] = [
  { value: 'ean13', label: 'EAN-13 (штрих-код)' },
  { value: 'qr', label: 'QR-код' },
  { value: 'code128', label: 'Code 128' },
  { value: 'ean8', label: 'EAN-8' },
  { value: 'upca', label: 'UPC-A' },
  { value: 'upce', label: 'UPC-E' },
  { value: 'code39', label: 'Code 39' },
  { value: 'code93', label: 'Code 93' },
  { value: 'codabar', label: 'Codabar' },
  { value: 'itf', label: 'ITF (Interleaved 2 of 5)' },
  { value: 'pdf417', label: 'PDF417' },
  { value: 'datamatrix', label: 'Data Matrix' },
  { value: 'aztec', label: 'Aztec' },
  { value: 'none', label: 'Без коду (лише номер)' },
]

const form = reactive<CardDraft>({
  id: existing?.id,
  title: existing?.title ?? '',
  code: existing?.code ?? '',
  codeFormat: existing?.codeFormat ?? 'ean13',
  description: existing?.description ?? '',
  categoryId: existing?.categoryId ?? null,
  frontPhoto: existing?.frontPhoto ?? null,
  backPhoto: existing?.backPhoto ?? null,
})

const titleError = ref('')
const saving = ref(false)

// Inline category creation
const NEW = '__new__'
const creatingCategory = ref(false)
const newCategory = ref('')
const categoryError = ref('')
const newCatInput = ref<HTMLInputElement>()
const categorySelect = computed({
  get: () => form.categoryId ?? '',
  set: (v: string) => {
    if (v === NEW) {
      creatingCategory.value = true
      nextTick(() => newCatInput.value?.focus())
      return
    }
    form.categoryId = v || null
  },
})
async function addCategory() {
  categoryError.value = ''
  try {
    const cat = await categories.create(newCategory.value)
    form.categoryId = cat.id
    creatingCategory.value = false
    newCategory.value = ''
  } catch (e) {
    categoryError.value = e instanceof CategoryError ? e.message : 'Не вдалося створити категорію'
  }
}

// Scanner lives in the history (?scan=1) so the phone's back button closes it.
const scanning = computed(() => route.query.scan === '1')
const openScanner = () => router.push({ query: { ...route.query, scan: '1' } })
const closeScanner = () => (window.history.state?.back ? router.back() : router.replace({ query: { ...route.query, scan: undefined } }))
function applyScan(r: ScanResult, source: string) {
  form.code = r.code
  form.codeFormat = r.format
  const label = FORMATS.find((f) => f.value === r.format)?.label ?? r.format
  toast.show('success', `${source}: ${label}`)
}
function onScanned(r: ScanResult) {
  closeScanner()
  applyScan(r, 'Код відскановано')
}

// When a card photo is added and the code is still empty, try to read the code from it.
async function autoDetect(file: File) {
  if (form.code.trim()) return
  try {
    const r = await detectInImage(file)
    if (r && !form.code.trim()) applyScan(r, 'Код знайдено на фото')
  } catch {
    /* silent: this is a convenience, the user can still scan or type */
  }
}

async function save() {
  titleError.value = form.title.trim() ? '' : 'Введіть назву картки'
  if (titleError.value) return
  saving.value = true
  const id = toast.show('progress', 'Зберігаємо…')
  try {
    const card = await cards.save({ ...form })
    toast.update(id, 'success', isEdit ? 'Зміни збережено' : `Картку «${card.title}» додано`)
    // Leave the form and show the saved card right away; the user returns to the list themselves.
    router.replace({ name: 'cards', query: { card: card.id } })
  } catch (e) {
    const quota = (e as DOMException)?.name === 'QuotaExceededError'
    toast.update(id, 'error', quota ? 'Недостатньо місця на пристрої' : 'Не вдалося зберегти картку', { label: 'Повторити', run: save })
  } finally {
    saving.value = false
  }
}

const confirmDelete = ref(false)
let confirmTimer: ReturnType<typeof setTimeout>
async function remove() {
  if (!existing) return
  if (!confirmDelete.value) {
    confirmDelete.value = true
    clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => (confirmDelete.value = false), 3000)
    return
  }
  try {
    await cards.remove(existing.id)
    toast.show('success', 'Картку видалено')
    router.replace({ name: 'cards' })
  } catch {
    toast.show('error', 'Не вдалося видалити картку')
  }
}

const back = () => (window.history.state?.back ? router.back() : router.replace({ name: 'cards' }))
</script>

<template>
  <header class="bar">
    <button class="icon" aria-label="Назад" @click="back">
      <svg viewBox="0 0 24 24" width="24" height="24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>
    <h1>{{ isEdit ? 'Редагування' : 'Нова картка' }}</h1>
    <span class="icon" />
  </header>

  <form class="form" novalidate @submit.prevent="save">
    <div class="photos">
      <PhotoSlot v-model="form.frontPhoto" label="Лицьова" @picked="autoDetect" />
      <PhotoSlot v-model="form.backPhoto" label="Зворотна" @picked="autoDetect" />
    </div>

    <label class="field">
      <span>Назва</span>
      <input v-model="form.title" class="input" placeholder="Напр., Еко Маркет" maxlength="60" autocomplete="off" enterkeyhint="next" @input="titleError = ''" />
      <small v-if="titleError" class="error-text">{{ titleError }}</small>
    </label>

    <div class="field">
      <span>Номер / код картки</span>
      <div class="coderow">
        <input v-model="form.code" class="input mono" placeholder="Будь-яка кількість цифр чи символів" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Номер / код картки" />
        <button type="button" class="scanbtn" aria-label="Сканувати код" @click="openScanner">
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        </button>
      </div>
    </div>

    <label class="field">
      <span>Формат коду</span>
      <select v-model="form.codeFormat" class="input">
        <option v-for="f in FORMATS" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
    </label>

    <div class="field">
      <span>Категорія</span>
      <div v-if="creatingCategory" class="newcat">
        <input ref="newCatInput" v-model="newCategory" class="input" placeholder="Назва категорії" maxlength="40" @keydown.enter.prevent="addCategory" />
        <button type="button" class="btn btn-primary" @click="addCategory">Додати</button>
        <button type="button" class="btn btn-soft" @click="creatingCategory = false; categoryError = ''">✕</button>
      </div>
      <select v-else v-model="categorySelect" class="input">
        <option value="">Без категорії</option>
        <option v-for="c in categories.ordered" :key="c.id" :value="c.id">{{ c.name }}</option>
        <option :value="NEW">+ Нова категорія…</option>
      </select>
      <small v-if="categoryError" class="error-text">{{ categoryError }}</small>
    </div>

    <label class="field">
      <span>Опис</span>
      <textarea v-model="form.description" class="input" placeholder="Нотатки: знижки, умови, з ким спільна…" />
    </label>

    <button type="submit" class="btn btn-primary save" :disabled="saving">Зберегти</button>
    <button v-if="isEdit" type="button" class="btn btn-danger" @click="remove">
      {{ confirmDelete ? 'Натисніть ще раз, щоб видалити' : 'Видалити картку' }}
    </button>
  </form>

  <ScannerOverlay v-if="scanning" @result="onScanned" @close="closeScanner" />
</template>

<style scoped>
.bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 8px; position: sticky; top: 0; background: var(--bg); z-index: 5; }
.bar h1 { font-size: 18px; font-weight: 750; }
.icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; color: var(--text); }
.form { display: flex; flex-direction: column; gap: 16px; padding: 8px 16px calc(32px + env(safe-area-inset-bottom)); max-width: 560px; margin: 0 auto; }
.photos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.coderow { display: flex; gap: 8px; }
.coderow .input { flex: 1; min-width: 0; }
.scanbtn { flex: none; width: 54px; border-radius: 16px; background: var(--accent); color: var(--accent-text); display: grid; place-items: center; transition: transform 0.1s; }
.scanbtn:active { transform: scale(0.95); }
.mono { font-family: ui-monospace, Menlo, monospace; letter-spacing: 0.06em; }
.newcat { display: flex; gap: 8px; }
.newcat .input { flex: 1; min-width: 0; }
.save { margin-top: 8px; }
</style>

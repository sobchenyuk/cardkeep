<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useCards } from '@/stores/cards'
import { useCategories } from '@/stores/categories'
import { useToast } from '@/stores/toast'
import { formatKB } from '@/utils/compress'
import { applyImport, archiveName, BackupError, buildArchive, readArchive, type ImportPreview } from './archive'

const cards = useCards()
const categories = useCategories()
const toast = useToast()

const LAST = 'cardkeep.lastExport'
const lastExport = ref<string | null>(readLast())
function readLast() {
  try {
    return localStorage.getItem(LAST)
  } catch {
    return null
  }
}
const lastLabel = computed(() =>
  lastExport.value ? new Date(lastExport.value).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }) : null,
)
const canShareFiles = typeof navigator.canShare === 'function'
const busy = ref(false)

const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} МБ` : formatKB(b))

function markExported() {
  lastExport.value = new Date().toISOString()
  try {
    localStorage.setItem(LAST, lastExport.value)
  } catch {
    /* ignore */
  }
}

async function exportZip(via: 'download' | 'share') {
  if (!cards.items.length) return toast.show('info', 'Поки немає карток для експорту')
  busy.value = true
  const id = toast.show('progress', 'Готуємо архів…')
  try {
    const blob = await buildArchive()
    const name = archiveName()
    if (via === 'share') {
      const file = new File([blob], name, { type: 'application/zip' })
      if (!navigator.canShare?.({ files: [file] })) throw new BackupError('Цей браузер не вміє ділитися файлами — скористайтеся «Завантажити»')
      try {
        await navigator.share({ files: [file], title: name })
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return toast.dismiss(id)
        throw e
      }
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    }
    markExported()
    toast.update(id, 'success', `Архів готовий · ${size(blob.size)}`)
  } catch (e) {
    const msg = e instanceof BackupError ? e.message : 'Не вдалося створити архів'
    toast.update(id, 'error', msg, { label: 'Повторити', run: () => exportZip(via) })
  } finally {
    busy.value = false
  }
}

// ---- import
const input = ref<HTMLInputElement>()
// shallowRef: the preview must stay a plain object — IndexedDB can't clone Vue proxies.
const preview = shallowRef<ImportPreview | null>(null)
const confirmReplace = ref(false)
let t: ReturnType<typeof setTimeout>

async function onFile(e: Event) {
  const el = e.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = ''
  if (!file) return
  busy.value = true
  const id = toast.show('progress', 'Читаємо архів…')
  try {
    preview.value = await readArchive(file)
    toast.dismiss(id)
    if (!preview.value.cards.length) {
      preview.value = null
      toast.show('info', 'В архіві немає карток')
    }
  } catch (err) {
    toast.update(id, 'error', err instanceof BackupError ? err.message : 'Не вдалося прочитати архів')
  } finally {
    busy.value = false
  }
}

async function apply(mode: 'add' | 'replace') {
  if (!preview.value) return
  if (mode === 'replace' && !confirmReplace.value) {
    confirmReplace.value = true
    clearTimeout(t)
    t = setTimeout(() => (confirmReplace.value = false), 3000)
    return
  }
  busy.value = true
  const id = toast.show('progress', 'Імпортуємо…')
  try {
    const n = await applyImport(preview.value, mode)
    await Promise.all([cards.load(), categories.load()])
    preview.value = null
    confirmReplace.value = false
    toast.update(id, 'success', mode === 'replace' ? `Відновлено карток: ${n}` : n ? `Додано карток: ${n}` : 'Нових карток немає — усі вже є')
  } catch (e) {
    const quota = (e as DOMException)?.name === 'QuotaExceededError'
    toast.update(id, 'error', quota ? 'Недостатньо місця на пристрої' : 'Не вдалося імпортувати', { label: 'Повторити', run: () => apply(mode) })
  } finally {
    busy.value = false
  }
}

const fresh = computed(() => (preview.value ? preview.value.cards.length - preview.value.duplicates : 0))
const exportedOn = computed(() =>
  preview.value?.exportedAt ? new Date(preview.value.exportedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
)
</script>

<template>
  <div class="box">
    <p class="lead">Усі картки з фото в одному ZIP-архіві. Його можна відкрити навіть без застосунку.</p>
    <p class="last" :class="{ warn: !lastLabel && cards.items.length }">
      {{ lastLabel ? `Останній експорт: ${lastLabel}` : cards.items.length ? 'Ви ще не робили резервну копію' : 'Карток поки немає' }}
    </p>

    <div class="row">
      <button class="btn btn-primary" :disabled="busy" @click="exportZip('download')">Завантажити архів</button>
      <button v-if="canShareFiles" class="btn btn-soft" :disabled="busy" @click="exportZip('share')">Поділитися</button>
    </div>
    <button class="btn btn-soft full" :disabled="busy" @click="input?.click()">Імпорт архіву</button>
    <input ref="input" type="file" accept=".zip,application/zip,application/x-zip-compressed" hidden @change="onFile" />

    <div v-if="preview" class="preview">
      <p class="ptitle">Архів{{ exportedOn ? ` від ${exportedOn}` : '' }}</p>
      <p>Карток: <b>{{ preview.cards.length }}</b>, категорій: <b>{{ preview.categories.length }}</b></p>
      <p v-if="preview.duplicates" class="muted">Вже є у вас: {{ preview.duplicates }} — їх буде пропущено при додаванні</p>
      <div class="col">
        <button class="btn btn-primary" :disabled="busy" @click="apply('add')">Додати до наявних ({{ fresh }})</button>
        <button class="btn" :class="confirmReplace ? 'danger-solid' : 'btn-soft'" :disabled="busy" @click="apply('replace')">
          {{ confirmReplace ? 'Натисніть ще раз — поточні картки буде видалено' : 'Замінити все' }}
        </button>
        <button class="btn btn-danger" :disabled="busy" @click="preview = null; confirmReplace = false">Скасувати</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.box { background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.lead { color: var(--text); }
.last { font-size: 13px; color: var(--text-2); }
.last.warn { color: var(--danger); font-weight: 600; }
.row { display: flex; gap: 8px; }
.row .btn { flex: 1; }
.full { width: 100%; }
.preview { margin-top: 6px; padding: 14px; border-radius: 18px; background: var(--bg); display: flex; flex-direction: column; gap: 6px; }
.ptitle { font-weight: 750; }
.muted { color: var(--text-2); font-size: 14px; }
.col { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
.danger-solid { background: var(--danger); color: #fff; font-size: 14px; }
</style>

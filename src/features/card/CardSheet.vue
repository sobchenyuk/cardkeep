<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef } from 'vue'
import type { Card } from '@/db'
import { useCategories } from '@/stores/categories'
import { useToast } from '@/stores/toast'
import { useObjectUrl } from '@/utils/useObjectUrl'
import CodeView from './CodeView.vue'

const props = defineProps<{ card: Card }>()
const emit = defineEmits<{ close: []; edit: [] }>()
const categories = useCategories()
const toast = useToast()

const front = useObjectUrl(toRef(() => props.card.frontPhoto))
const back = useObjectUrl(toRef(() => props.card.backPhoto))
const slides = computed(() => {
  const s: { kind: 'front' | 'back' | 'plain'; url?: string; label: string }[] = []
  if (front.value) s.push({ kind: 'front', url: front.value, label: 'Лицьова сторона' })
  else s.push({ kind: 'plain', label: '' })
  if (back.value) s.push({ kind: 'back', url: back.value, label: 'Зворотна сторона' })
  return s
})
const category = computed(() => categories.get(props.card.categoryId)?.name)

// Slider position from native scroll-snap.
const slider = ref<HTMLElement>()
const active = ref(0)
function onScroll() {
  const el = slider.value
  if (el) active.value = Math.round(el.scrollLeft / el.clientWidth)
}

// Swipe-down to close.
const sheet = ref<HTMLElement>()
const body = ref<HTMLElement>()
const dragY = ref(0)
const dragging = ref(false)
const closing = ref(false)
let startY = 0
let tracking = false

function down(e: PointerEvent) {
  // Only start a dismiss gesture when the content is scrolled to top.
  if ((body.value?.scrollTop ?? 0) > 0) return
  if ((e.target as HTMLElement).closest('.slider, .desc')) return
  tracking = true
  startY = e.clientY
}
function move(e: PointerEvent) {
  if (!tracking) return
  const dy = e.clientY - startY
  if (!dragging.value && dy > 8) {
    dragging.value = true
    sheet.value?.setPointerCapture(e.pointerId)
  }
  if (dragging.value) dragY.value = Math.max(0, dy)
}
function up() {
  tracking = false
  if (!dragging.value) return
  dragging.value = false
  if (dragY.value > 110) close()
  else dragY.value = 0
}
function close() {
  closing.value = true
  setTimeout(() => emit('close'), 220)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

async function share() {
  const text = props.card.code ? `${props.card.title}: ${props.card.code}` : props.card.title
  try {
    if (navigator.share) {
      await navigator.share({ title: props.card.title, text })
      return
    }
    await navigator.clipboard.writeText(text)
    toast.show('success', 'Скопійовано в буфер обміну')
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return
    toast.show('error', 'Не вдалося поділитися')
  }
}
</script>

<template>
  <div class="layer" :class="{ closing }">
    <div class="scrim" @click="close" />
    <section
      ref="sheet"
      class="sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="card.title"
      :class="{ dragging }"
      :style="dragY ? { transform: `translateY(${dragY}px)` } : undefined"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
    >
      <button class="handle" aria-label="Закрити" @click="close"><span /></button>
      <div ref="body" class="body">
        <div ref="slider" class="slider" @scroll.passive="onScroll">
          <div v-for="(s, i) in slides" :key="i" class="slide" :style="s.kind === 'plain' ? { background: card.color } : undefined">
            <img v-if="s.url" :src="s.url" alt="" draggable="false" />
            <template v-else>
              <span class="st">{{ card.title }}</span>
              <span v-if="category" class="ss">{{ category }}</span>
            </template>
            <span v-if="s.label" class="side">{{ s.label }}</span>
          </div>
        </div>
        <div v-if="slides.length > 1" class="dots"><i v-for="(_, i) in slides" :key="i" :class="{ on: i === active }" /></div>

        <CodeView :code="card.code" :format="card.codeFormat" class="codeview" />

        <h2>
          <span>{{ card.title }}</span>
          <span v-if="category" class="tag">{{ category }}</span>
        </h2>
        <div v-if="card.description" class="desc">{{ card.description }}</div>

        <div class="actions">
          <button class="edit" @click="emit('edit')">Редагувати</button>
          <button class="share" @click="share">Поділитися</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.layer { position: fixed; inset: 0; z-index: 80; }
.scrim { position: absolute; inset: 0; background: rgb(20 18 43 / 0.45); animation: fade 0.25s var(--ease); }
.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: calc(env(safe-area-inset-top) + 36px);
  max-width: 560px;
  margin: 0 auto;
  background: var(--surface);
  border-radius: 28px 28px 0 0;
  display: flex;
  flex-direction: column;
  animation: rise 0.32s var(--ease);
  transition: transform 0.22s var(--ease);
  touch-action: pan-y;
}
.sheet.dragging { transition: none; }
.closing .sheet { transform: translateY(100%) !important; }
.closing .scrim { opacity: 0; transition: opacity 0.22s; }
.handle { display: flex; justify-content: center; padding: 10px 0 12px; width: 100%; flex: none; }
.handle span { width: 44px; height: 5px; border-radius: 3px; background: var(--border); }
.body { overflow-y: auto; padding: 0 16px calc(24px + env(safe-area-inset-bottom)); overscroll-behavior: contain; }

.slider { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 12px; scrollbar-width: none; border-radius: var(--radius-card); }
.slider::-webkit-scrollbar { display: none; }
.slide {
  flex: 0 0 100%;
  scroll-snap-align: center;
  aspect-ratio: 1.586;
  border-radius: var(--radius-card);
  background: var(--surface-2);
  position: relative;
  overflow: hidden;
  color: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
}
.slide img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.slide:not(:has(img))::after { content: ''; position: absolute; right: -40px; top: -40px; width: 170px; height: 170px; border-radius: 50%; background: rgb(255 255 255 / 0.14); }
.st { font-size: 24px; font-weight: 800; position: relative; }
.ss { font-size: 13px; opacity: 0.85; margin-top: 4px; position: relative; }
.side { position: absolute; left: 14px; bottom: 14px; font-size: 12px; font-weight: 700; background: rgb(0 0 0 / 0.35); padding: 4px 10px; border-radius: 999px; }
.dots { display: flex; gap: 6px; justify-content: center; margin-top: 10px; }
.dots i { width: 6px; height: 6px; border-radius: 3px; background: var(--border); transition: width 0.2s; }
.dots i.on { width: 18px; background: var(--accent); }
.codeview { margin-top: 14px; }

h2 { font-size: 22px; font-weight: 800; margin: 18px 0 6px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tag { font-size: 12px; font-weight: 700; color: var(--accent); background: var(--accent-soft); padding: 4px 10px; border-radius: 999px; }
.desc { color: var(--text-2); font-size: 15px; line-height: 1.45; max-height: calc(1.45em * 4); overflow-y: auto; white-space: pre-wrap; overscroll-behavior: contain; }

.actions { display: flex; gap: 10px; margin-top: 18px; }
.actions button { flex: 1; height: 48px; border-radius: 16px; font-weight: 700; font-size: 15px; transition: transform 0.1s; }
.actions button:active { transform: scale(0.97); }
.edit { background: var(--accent-soft); color: var(--accent); }
.share { background: var(--accent); color: var(--accent-text); }

@keyframes rise { from { transform: translateY(100%); } }
@keyframes fade { from { opacity: 0; } }
</style>

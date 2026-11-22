<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToast, type Toast } from '@/stores/toast'

const props = defineProps<{ toast: Toast }>()
const store = useToast()

// Horizontal swipe to dismiss: the toast follows the finger, fades with distance,
// then glides off-screen and is removed after the animation.
const dx = ref(0)
const dragging = ref(false)
const leaving = ref<0 | 1 | -1>(0)
let startX = 0
let startY = 0
let lastX = 0
let lastT = 0
let velocity = 0
let decided = false
let horizontal = false

function down(e: PointerEvent) {
  if (leaving.value || (e.target as HTMLElement).closest('button')) return
  startX = lastX = e.clientX
  startY = e.clientY
  lastT = e.timeStamp
  velocity = 0
  decided = false
  horizontal = false
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
  const x = e.clientX - startX
  const y = e.clientY - startY
  if (!decided) {
    if (Math.abs(x) < 6 && Math.abs(y) < 6) return
    decided = true
    horizontal = Math.abs(x) > Math.abs(y)
    if (horizontal) {
      dragging.value = true
      store.pause(props.toast.id)
    }
  }
  if (!horizontal) return
  const dt = Math.max(1, e.timeStamp - lastT)
  velocity = (e.clientX - lastX) / dt
  lastX = e.clientX
  lastT = e.timeStamp
  dx.value = x
}
function up() {
  if (!dragging.value) return
  dragging.value = false
  const flick = Math.abs(velocity) > 0.5 && Math.abs(dx.value) > 24
  if (Math.abs(dx.value) > 90 || flick) {
    leaving.value = (dx.value || velocity) > 0 ? 1 : -1
    setTimeout(() => store.dismiss(props.toast.id), 320)
  } else {
    dx.value = 0
    store.resume(props.toast.id)
  }
}

const style = computed(() => {
  if (leaving.value) return { transform: `translateX(${leaving.value * 115}%)`, opacity: 0 }
  if (!dx.value) return undefined
  const fade = Math.max(0.15, 1 - Math.abs(dx.value) / 260)
  return { transform: `translateX(${dx.value}px) rotate(${dx.value / 60}deg)`, opacity: fade }
})
</script>

<template>
  <div
    class="toast"
    :class="[toast.kind, { dragging, leaving: !!leaving }]"
    :style="style"
    role="status"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="up"
  >
    <span v-if="toast.kind === 'progress'" class="spinner" aria-hidden="true" />
    <span v-else class="dot" aria-hidden="true" />
    <span class="text">{{ toast.text }}</span>
    <button v-if="toast.action" class="action" @click="() => { toast.action!.run(); store.dismiss(toast.id) }">
      {{ toast.action.label }}
    </button>
  </div>
</template>

<style scoped>
.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 420px;
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 18px;
  background: var(--toast-bg);
  box-shadow: var(--shadow);
  color: var(--toast-text);
  font-size: 15px;
  touch-action: pan-y; /* horizontal drags are ours */
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
  transition: transform 0.3s var(--ease), opacity 0.3s var(--ease);
}
.toast.dragging { transition: none; cursor: grabbing; }
.toast.leaving { transition: transform 0.32s cubic-bezier(0.4, 0, 1, 1), opacity 0.32s ease-in; }
.text { flex: 1; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: 0.5; flex: none; }
.success .dot { background: #4caf7d; opacity: 1; }
.error .dot { background: #e5534b; opacity: 1; }
.spinner { width: 16px; height: 16px; flex: none; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; opacity: 0.8; }
.action { font-weight: 600; padding: 6px 4px; color: inherit; text-decoration: underline; text-underline-offset: 3px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

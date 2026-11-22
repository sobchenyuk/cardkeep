<script setup lang="ts">
import { useToast } from '@/stores/toast'
import ToastItem from './ToastItem.vue'
const toast = useToast()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <ToastItem v-for="t in toast.items" :key="t.id" :toast="t" />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--nav-h) + var(--nav-gap) + env(safe-area-inset-bottom) + 12px);
  transition: bottom 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  pointer-events: none;
  z-index: 100;
  overflow-x: clip;
}
/* Auto-dismiss: soft fade + slide; swiped toasts are already off-screen. */
.toast-enter-active { transition: opacity 0.3s var(--ease), transform 0.3s var(--ease); }
.toast-leave-active { transition: opacity 0.45s var(--ease), transform 0.45s var(--ease); }
.toast-move { transition: transform 0.3s var(--ease); }
.toast-enter-from { opacity: 0; transform: translateY(14px) scale(0.98); }
.toast-leave-to:not(.leaving) { opacity: 0; transform: translateY(10px) scale(0.98); }
</style>
<style>
/* When the bottom area is busy (forms, open card), toasts sit at the top. */
.toasts.low { bottom: auto !important; top: calc(12px + env(safe-area-inset-top)); flex-direction: column-reverse; }
.toasts.low .toast-enter-from { transform: translateY(-14px) scale(0.98); }
</style>

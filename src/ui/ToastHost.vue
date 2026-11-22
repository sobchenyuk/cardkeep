<script setup lang="ts">
import { useToast } from '@/stores/toast'
const toast = useToast()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toast.items" :key="t.id" class="toast" :class="t.kind" role="status">
        <span v-if="t.kind === 'progress'" class="spinner" aria-hidden="true" />
        <span v-else class="dot" aria-hidden="true" />
        <span class="text">{{ t.text }}</span>
        <button
          v-if="t.action"
          class="action"
          @click="() => { t.action!.run(); toast.dismiss(t.id) }"
        >
          {{ t.action.label }}
        </button>
      </div>
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
}
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
}
.text { flex: 1; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: 0.5; flex: none; }
.success .dot { background: #4caf7d; opacity: 1; }
.error .dot { background: #e5534b; opacity: 1; }
.spinner {
  width: 16px; height: 16px; flex: none;
  border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%;
  animation: spin 0.8s linear infinite; opacity: 0.8;
}
.action { font-weight: 600; padding: 6px 4px; color: inherit; text-decoration: underline; text-underline-offset: 3px; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s var(--ease), transform 0.25s var(--ease); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(12px); }
</style>
<style>
/* When the bottom nav is hidden (forms), toasts sit lower. */
.toasts.low { bottom: auto !important; top: calc(12px + env(safe-area-inset-top)); flex-direction: column-reverse; }
</style>

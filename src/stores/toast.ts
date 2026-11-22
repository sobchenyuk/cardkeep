import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastKind = 'progress' | 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  text: string
  action?: { label: string; run: () => void }
}

let seq = 0

export const useToast = defineStore('toast', () => {
  const items = ref<Toast[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()

  function dismiss(id: number) {
    items.value = items.value.filter((t) => t.id !== id)
    clearTimeout(timers.get(id))
    timers.delete(id)
  }

  function schedule(t: Toast) {
    clearTimeout(timers.get(t.id))
    // Progress toasts stay until updated; errors with an action stay longer.
    if (t.kind === 'progress') return
    const ms = t.action ? 8000 : 3000
    timers.set(t.id, setTimeout(() => dismiss(t.id), ms))
  }

  function show(kind: ToastKind, text: string, action?: Toast['action']): number {
    const t: Toast = { id: ++seq, kind, text, action }
    items.value = [...items.value.slice(-2), t]
    schedule(t)
    return t.id
  }

  /** Turn an existing toast (e.g. a progress one) into its result. */
  function update(id: number, kind: ToastKind, text: string, action?: Toast['action']) {
    const t = items.value.find((x) => x.id === id)
    if (!t) return show(kind, text, action)
    Object.assign(t, { kind, text, action })
    items.value = [...items.value]
    schedule(t)
    return id
  }

  /** Hold a toast on screen (e.g. while the user is dragging it). */
  function pause(id: number) {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }
  function resume(id: number) {
    const t = items.value.find((x) => x.id === id)
    if (t) schedule(t)
  }

  return { items, show, update, dismiss, pause, resume }
})

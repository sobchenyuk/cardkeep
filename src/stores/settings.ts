import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'
const KEY = 'cardkeep.theme'

function readTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

export const useSettings = defineStore('settings', () => {
  const theme = ref<ThemeMode>(readTheme())

  function apply(mode: ThemeMode) {
    const root = document.documentElement
    if (mode === 'system') delete root.dataset.theme
    else root.dataset.theme = mode
  }

  watch(
    theme,
    (mode) => {
      apply(mode)
      try {
        if (mode === 'system') localStorage.removeItem(KEY)
        else localStorage.setItem(KEY, mode)
      } catch {
        /* storage unavailable */
      }
    },
    { immediate: true },
  )

  return { theme }
})

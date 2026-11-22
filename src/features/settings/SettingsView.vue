<script setup lang="ts">
import PageHeader from '@/ui/PageHeader.vue'
import { useSettings, type ThemeMode } from '@/stores/settings'

const settings = useSettings()
const options: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Системна' },
  { value: 'light', label: 'Світла' },
  { value: 'dark', label: 'Темна' },
]
</script>

<template>
  <PageHeader title="Налаштування" />
  <section class="group">
    <h2 class="label">Тема</h2>
    <div class="segmented" role="radiogroup" aria-label="Тема">
      <button
        v-for="o in options"
        :key="o.value"
        role="radio"
        :aria-checked="settings.theme === o.value"
        :class="{ on: settings.theme === o.value }"
        @click="settings.theme = o.value"
      >
        {{ o.label }}
      </button>
    </div>
  </section>
  <section class="group">
    <h2 class="label">Резервна копія</h2>
    <p class="muted">Експорт та імпорт ZIP-архівом з'являться в наступних версіях.</p>
  </section>
</template>

<style scoped>
.group { padding: 8px 16px 20px; }
.label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-2); margin-bottom: 10px; }
.segmented { display: flex; padding: 4px; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; }
.segmented button { flex: 1; min-height: 44px; border-radius: 14px; font-size: 15px; color: var(--text-2); transition: background 0.15s, color 0.15s; }
.segmented button.on { background: var(--accent-soft); color: var(--accent); font-weight: 700; }
.muted { color: var(--text-2); }
</style>

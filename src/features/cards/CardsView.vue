<script setup lang="ts">
import PageHeader from '@/ui/PageHeader.vue'
import { useToast } from '@/stores/toast'

const toast = useToast()

// Placeholder: demonstrates progress → result toast flow until the card form lands.
function demoAdd() {
  const id = toast.show('progress', 'Стискаємо фото…')
  setTimeout(() => toast.update(id, 'success', 'Збережено'), 1200)
}
</script>

<template>
  <PageHeader title="Картки" />
  <section class="empty">
    <div class="art" aria-hidden="true">
      <div class="card back" />
      <div class="card front" />
    </div>
    <h2>Поки що порожньо</h2>
    <p>Додайте першу картку: відскануйте код і сфотографуйте її з обох боків.</p>
    <button class="primary" @click="demoAdd">Додати картку</button>
  </section>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 32px;
  gap: 12px;
}
.art { position: relative; width: 168px; height: 120px; margin-bottom: 12px; }
.card { position: absolute; width: 152px; height: 96px; border-radius: 14px; }
.back { left: 16px; top: 0; background: var(--surface-2); transform: rotate(-6deg); }
.front { left: 0; top: 20px; background: var(--accent); }
h2 { font-size: 20px; font-weight: 650; }
p { color: var(--text-2); max-width: 300px; }
.primary {
  margin-top: 12px;
  min-height: 48px;
  padding: 0 24px;
  border-radius: 24px;
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
  transition: transform 0.1s;
}
.primary:active { transform: scale(0.97); }
</style>

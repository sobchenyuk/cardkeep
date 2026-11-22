<script setup lang="ts">
const items = [
  { to: '/', label: 'Картки', icon: 'M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zm0 3h16' },
  { to: '/categories', label: 'Категорії', icon: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z' },
  { to: '/settings', label: 'Налаштування', icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4' },
]
</script>

<template>
  <nav class="nav">
    <RouterLink v-for="i in items" :key="i.to" :to="i.to" class="item" active-class="" exact-active-class="active">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path :d="i.icon" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>{{ i.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: calc(var(--nav-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  background: var(--surface);
  border-top: 1px solid var(--border);
  z-index: 50;
}
.item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--text-2);
  text-decoration: none;
  font-size: 12px;
  transition: color 0.15s;
}
.item.active { color: var(--accent); font-weight: 600; }
</style>

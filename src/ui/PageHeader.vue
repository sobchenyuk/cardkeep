<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <header class="header">
    <h1>{{ title }}</h1>
    <slot />
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 12px;
}
h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
</style>

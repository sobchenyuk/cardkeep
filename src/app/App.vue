<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import BottomNav from '@/ui/BottomNav.vue'
import ToastHost from '@/ui/ToastHost.vue'
import { useSettings } from '@/stores/settings'
import { useToast } from '@/stores/toast'
import { useCards } from '@/stores/cards'
import { useCategories } from '@/stores/categories'

useSettings()
const toast = useToast()
const route = useRoute()
const cards = useCards()
const categories = useCategories()
const ready = ref(false)
const hideNav = computed(() => !!route.meta.hideNav)

async function load() {
  try {
    await Promise.all([cards.load(), categories.load()])
    ready.value = true
  } catch {
    toast.show('error', 'Сховище недоступне. Можливо, увімкнено приватний режим браузера.', { label: 'Повторити', run: load })
  }
}
onMounted(load)

const { updateServiceWorker } = useRegisterSW({
  onNeedRefresh() {
    toast.show('info', 'Доступне оновлення', { label: 'Оновити', run: () => updateServiceWorker(true) })
  },
  onOfflineReady() {
    toast.show('success', 'Готово до роботи офлайн')
  },
})
</script>

<template>
  <div class="shell" :class="{ 'no-nav': hideNav }">
    <main class="content">
      <RouterView v-if="ready" />
    </main>
    <BottomNav v-if="!hideNav" />
    <ToastHost :class="{ low: hideNav }" />
  </div>
</template>

<style scoped>
.shell { min-height: 100%; }
.content {
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(var(--nav-h) + var(--nav-gap) * 2 + env(safe-area-inset-bottom));
}
.no-nav .content { padding-bottom: 0; }
</style>

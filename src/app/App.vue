<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import BottomNav from '@/ui/BottomNav.vue'
import ToastHost from '@/ui/ToastHost.vue'
import { useSettings } from '@/stores/settings'
import { useToast } from '@/stores/toast'

useSettings()
const toast = useToast()

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
  <div class="shell">
    <main class="content">
      <RouterView />
    </main>
    <BottomNav />
    <ToastHost />
  </div>
</template>

<style scoped>
.shell { min-height: 100%; }
.content {
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom));
}
</style>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useObjectUrl } from '@/utils/useObjectUrl'
import { compressImage, CompressError, formatKB } from '@/utils/compress'
import { useToast } from '@/stores/toast'

const props = defineProps<{ label: string; modelValue: Blob | null }>()
const emit = defineEmits<{ 'update:modelValue': [Blob | null]; picked: [Blob]; request: [] }>()
const toast = useToast()
const url = useObjectUrl(toRef(() => props.modelValue))
const busy = ref(false)

async function process(file: Blob) {
  busy.value = true
  const id = toast.show('progress', 'Стискаємо фото…')
  try {
    const blob = await compressImage(file)
    emit('update:modelValue', blob)
    emit('picked', file)
    toast.update(id, 'success', `Фото готове · ${formatKB(blob.size)}`)
  } catch (e) {
    const msg = e instanceof CompressError ? e.message : 'Не вдалося обробити фото'
    toast.update(id, 'error', msg, { label: 'Повторити', run: () => process(file) })
  } finally {
    busy.value = false
  }
}

defineExpose({ process })
</script>

<template>
  <div class="slot">
    <button type="button" class="frame" :class="{ has: !!url }" :disabled="busy" @click="emit('request')">
      <img v-if="url" :src="url" alt="" />
      <template v-else>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.5-2h5L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" /><circle cx="12" cy="12.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8" /></svg>
        <span>{{ label }}</span>
      </template>
      <span v-if="busy" class="busy" />
    </button>
    <div class="row">
      <span class="lbl">{{ label }}</span>
      <button v-if="url" type="button" class="rm" @click="emit('update:modelValue', null)">Прибрати</button>
    </div>
  </div>
</template>

<style scoped>
.slot { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.frame {
  position: relative;
  aspect-ratio: 1.586;
  border-radius: 18px;
  border: 1.5px dashed var(--border);
  background: var(--surface);
  color: var(--text-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
}
.frame.has { border-style: solid; }
.frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.busy { position: absolute; inset: 0; background: rgb(255 255 255 / 0.5); }
.busy::after { content: ''; position: absolute; left: 50%; top: 50%; width: 22px; height: 22px; margin: -11px; border: 2.5px solid var(--accent); border-right-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 0 4px; min-height: 24px; }
.lbl { font-size: 13px; font-weight: 700; color: var(--text-2); }
.rm { font-size: 13px; font-weight: 600; color: var(--danger); }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

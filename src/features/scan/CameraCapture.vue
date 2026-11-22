<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ title: string }>()
const emit = defineEmits<{ captured: [Blob]; close: [] }>()

const video = ref<HTMLVideoElement>()
const frame = ref<HTMLElement>()
const fileInput = ref<HTMLInputElement>()
const status = ref<'starting' | 'ready' | 'error' | 'capturing'>('starting')
const error = ref('')
const flash = ref(false)
let stream: MediaStream | null = null

function stop() {
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
}

function cameraError(e: unknown): string {
  const name = (e as DOMException)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Немає доступу до камери. Дозвольте його в налаштуваннях браузера або виберіть фото з галереї.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Камеру не знайдено. Виберіть фото з галереї.'
  if (name === 'NotReadableError') return 'Камера зайнята іншим застосунком.'
  return 'Не вдалося увімкнути камеру. Виберіть фото з галереї.'
}

async function start() {
  if (!navigator.mediaDevices?.getUserMedia) {
    status.value = 'error'
    error.value = 'Браузер не дає доступу до камери. Виберіть фото з галереї.'
    return
  }
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1440 } },
    })
    stream = s
    video.value!.srcObject = s
    await video.value!.play()
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = cameraError(e)
  }
}

/** Grab the current frame, cropped to the card guide (with a small margin). */
async function shoot() {
  const v = video.value
  const f = frame.value
  if (!v || !f || status.value !== 'ready' || !v.videoWidth) return
  status.value = 'capturing'
  flash.value = true
  setTimeout(() => (flash.value = false), 160)

  // Map the on-screen guide back to video pixels (video uses object-fit: cover).
  const vb = v.getBoundingClientRect()
  const fb = f.getBoundingClientRect()
  const scale = Math.max(vb.width / v.videoWidth, vb.height / v.videoHeight)
  const ox = (vb.width - v.videoWidth * scale) / 2
  const oy = (vb.height - v.videoHeight * scale) / 2
  const margin = 0.06
  let sx = (fb.left - vb.left - ox) / scale
  let sy = (fb.top - vb.top - oy) / scale
  let sw = fb.width / scale
  let sh = fb.height / scale
  sx -= sw * margin
  sy -= sh * margin
  sw *= 1 + margin * 2
  sh *= 1 + margin * 2
  sx = Math.max(0, sx)
  sy = Math.max(0, sy)
  sw = Math.min(v.videoWidth - sx, sw)
  sh = Math.min(v.videoHeight - sy, sh)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw)
  canvas.height = Math.round(sh)
  canvas.getContext('2d')!.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92))
  if (!blob) {
    status.value = 'ready'
    return
  }
  stop()
  navigator.vibrate?.(30)
  emit('captured', blob)
}

function onFile(e: Event) {
  const el = e.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = ''
  if (!file) return
  stop()
  emit('captured', file)
}

function close() {
  stop()
  emit('close')
}

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <div class="cam" role="dialog" :aria-label="props.title">
    <video ref="video" playsinline muted autoplay />
    <div ref="frame" class="frame" :class="{ live: status === 'ready' }">
      <i class="c tl" /><i class="c tr" /><i class="c bl" /><i class="c br" />
    </div>
    <div v-if="flash" class="flash" />

    <header class="top">
      <button class="round" aria-label="Закрити" @click="close">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
      </button>
      <span class="title">{{ title }}</span>
      <span class="round ghost" />
    </header>

    <div class="info">
      <p v-if="status === 'starting'">Вмикаємо камеру…</p>
      <p v-else-if="status === 'error'" class="err">{{ error }}</p>
      <p v-else>Розмістіть картку в рамці</p>
    </div>

    <footer class="bottom">
      <button class="side" aria-label="З галереї" @click="fileInput?.click()">
        <svg viewBox="0 0 24 24" width="24" height="24"><rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8" /><path d="M4 16l5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" /></svg>
        <span>Галерея</span>
      </button>
      <button class="shutter" :disabled="status !== 'ready'" aria-label="Зробити фото" @click="shoot"><span /></button>
      <span class="side" />
    </footer>
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
  </div>
</template>

<style scoped>
.cam { position: fixed; inset: 0; z-index: 90; background: #000; color: #fff; overflow: hidden; }
video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
/* Card-proportioned guide; the shadow dims everything outside it. */
.frame { position: absolute; left: 50%; top: 44%; width: min(340px, 88vw); aspect-ratio: 1.586; transform: translate(-50%, -50%); border-radius: 22px; box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.55); }
.c { position: absolute; width: 34px; height: 34px; border: 4px solid #fff; }
.live .c { border-color: #9d8bff; }
.tl { left: 0; top: 0; border-right: 0; border-bottom: 0; border-top-left-radius: 22px; }
.tr { right: 0; top: 0; border-left: 0; border-bottom: 0; border-top-right-radius: 22px; }
.bl { left: 0; bottom: 0; border-right: 0; border-top: 0; border-bottom-left-radius: 22px; }
.br { right: 0; bottom: 0; border-left: 0; border-top: 0; border-bottom-right-radius: 22px; }
.flash { position: absolute; inset: 0; background: #fff; opacity: 0.7; animation: flash 0.16s ease-out forwards; }
@keyframes flash { to { opacity: 0; } }

.top { position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 700; font-size: 17px; text-shadow: 0 1px 8px rgb(0 0 0 / 0.6); }
.round { width: 46px; height: 46px; border-radius: 50%; background: rgb(0 0 0 / 0.45); display: grid; place-items: center; color: #fff; backdrop-filter: blur(8px); }
.round.ghost { background: none; backdrop-filter: none; }

.info { position: absolute; left: 24px; right: 24px; top: calc(44% + min(340px, 88vw) / 3.172 + 20px); text-align: center; font-size: 15px; }
.info p { text-shadow: 0 1px 8px rgb(0 0 0 / 0.6); }
.err { background: rgb(0 0 0 / 0.6); padding: 10px 14px; border-radius: 14px; text-shadow: none; }

.bottom { position: absolute; left: 0; right: 0; bottom: calc(28px + env(safe-area-inset-bottom)); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 24px; }
.side { justify-self: start; display: flex; flex-direction: column; align-items: center; gap: 4px; color: #fff; font-size: 12px; font-weight: 600; }
.side svg { width: 52px; height: 52px; padding: 13px; border-radius: 16px; background: rgb(255 255 255 / 0.16); backdrop-filter: blur(8px); box-sizing: border-box; }
.shutter { width: 78px; height: 78px; border-radius: 50%; border: 4px solid #fff; display: grid; place-items: center; transition: transform 0.1s; }
.shutter span { width: 62px; height: 62px; border-radius: 50%; background: #fff; }
.shutter:active { transform: scale(0.94); }
.shutter:disabled { opacity: 0.4; }
</style>

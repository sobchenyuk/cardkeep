<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { detectInImage, getDetector, toResult, type ScanResult } from './detector'

const emit = defineEmits<{ result: [ScanResult]; close: [] }>()

const video = ref<HTMLVideoElement>()
const fileInput = ref<HTMLInputElement>()
const status = ref<'starting' | 'scanning' | 'error' | 'reading'>('starting')
const error = ref('')
const torchAvailable = ref(false)
const torchOn = ref(false)
const notFound = ref(false)

let stream: MediaStream | null = null
let raf = 0
let stopped = false
let lastTick = 0
let busy = false

function stop() {
  stopped = true
  cancelAnimationFrame(raf)
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
}

function done(r: ScanResult) {
  if (stopped) return
  stop()
  navigator.vibrate?.(60)
  emit('result', r)
}

function cameraError(e: unknown): string {
  const name = (e as DOMException)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Немає доступу до камери. Дозвольте його в налаштуваннях браузера або розпізнайте код з фото.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Камеру не знайдено на цьому пристрої.'
  if (name === 'NotReadableError') return 'Камера зайнята іншим застосунком.'
  return 'Не вдалося увімкнути камеру.'
}

async function start() {
  if (!navigator.mediaDevices?.getUserMedia) {
    status.value = 'error'
    error.value = 'Браузер не дає доступу до камери. Розпізнайте код з фото або введіть вручну.'
    return
  }
  try {
    const [detector, s] = await Promise.all([
      getDetector(),
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      }),
    ])
    if (stopped) {
      s.getTracks().forEach((t) => t.stop())
      return
    }
    stream = s
    const track = s.getVideoTracks()[0]
    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
    torchAvailable.value = !!caps.torch
    const el = video.value!
    el.srcObject = s
    await el.play()
    status.value = 'scanning'

    const loop = async (t: number) => {
      if (stopped) return
      raf = requestAnimationFrame(loop)
      if (busy || t - lastTick < 120 || el.readyState < 2) return
      lastTick = t
      busy = true
      try {
        const r = toResult(await detector.detect(el))
        if (r) done(r)
      } catch {
        /* transient frame errors are fine */
      } finally {
        busy = false
      }
    }
    raf = requestAnimationFrame(loop)
  } catch (e) {
    status.value = 'error'
    error.value = cameraError(e)
  }
}

async function toggleTorch() {
  const track = stream?.getVideoTracks()[0]
  if (!track) return
  try {
    await track.applyConstraints({ advanced: [{ torch: !torchOn.value } as MediaTrackConstraintSet] })
    torchOn.value = !torchOn.value
  } catch {
    torchAvailable.value = false
  }
}

async function onFile(e: Event) {
  const el = e.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = ''
  if (!file) return
  const prev = status.value
  status.value = 'reading'
  notFound.value = false
  try {
    const r = await detectInImage(file)
    if (r) return done(r)
    notFound.value = true
  } catch {
    notFound.value = true
  }
  status.value = prev === 'reading' ? 'scanning' : prev
}

function close() {
  stop()
  emit('close')
}

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <div class="scanner" role="dialog" aria-label="Сканування коду">
    <video ref="video" playsinline muted autoplay />

    <header class="top">
      <button class="round" aria-label="Закрити" @click="close">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
      </button>
      <button v-if="torchAvailable" class="round" :class="{ on: torchOn }" aria-label="Ліхтарик" @click="toggleTorch">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 3h6l-1 6h3l-7 12 1-8H8z" fill="currentColor" /></svg>
      </button>
    </header>

    <div class="frame" :class="{ live: status === 'scanning' }">
      <i class="c tl" /><i class="c tr" /><i class="c bl" /><i class="c br" />
      <span v-if="status === 'scanning'" class="line" />
    </div>

    <div class="info">
      <p v-if="status === 'starting'">Вмикаємо камеру…</p>
      <p v-else-if="status === 'scanning'">Наведіть камеру на штрих-код або QR</p>
      <p v-else-if="status === 'reading'">Шукаємо код на фото…</p>
      <p v-else class="err">{{ error }}</p>
      <p v-if="notFound" class="err">На фото код не знайдено. Спробуйте чіткіше фото або введіть вручну.</p>
    </div>

    <footer class="bottom">
      <button class="pill" :disabled="status === 'reading'" @click="fileInput?.click()">
        <svg viewBox="0 0 24 24" width="20" height="20"><rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8" /><path d="M4 16l5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" /></svg>
        З фото
      </button>
      <button class="pill ghost" @click="close">Ввести вручну</button>
    </footer>
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
  </div>
</template>

<style scoped>
.scanner { position: fixed; inset: 0; z-index: 90; background: #000; color: #fff; overflow: hidden; }
video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.top { position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 16px; right: 16px; display: flex; justify-content: space-between; }
.round { width: 46px; height: 46px; border-radius: 50%; background: rgb(0 0 0 / 0.45); display: grid; place-items: center; color: #fff; backdrop-filter: blur(8px); }
.round.on { background: #fff; color: #14122b; }

/* The frame's huge shadow dims everything outside the scan window. */
.frame { position: absolute; left: 50%; top: 42%; width: min(300px, 80vw); height: 190px; transform: translate(-50%, -50%); border-radius: 22px; box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.55); }
.c { position: absolute; width: 34px; height: 34px; border: 4px solid #fff; }
.live .c { border-color: #9d8bff; }
.tl { left: 0; top: 0; border-right: 0; border-bottom: 0; border-top-left-radius: 22px; }
.tr { right: 0; top: 0; border-left: 0; border-bottom: 0; border-top-right-radius: 22px; }
.bl { left: 0; bottom: 0; border-right: 0; border-top: 0; border-bottom-left-radius: 22px; }
.br { right: 0; bottom: 0; border-left: 0; border-top: 0; border-bottom-right-radius: 22px; }
.line { position: absolute; left: 14px; right: 14px; height: 2px; background: #9d8bff; box-shadow: 0 0 12px #9d8bff; border-radius: 2px; animation: sweep 1.8s ease-in-out infinite alternate; }
@keyframes sweep { from { top: 16px; } to { top: calc(100% - 18px); } }

.info { position: absolute; left: 24px; right: 24px; top: calc(42% + 120px); text-align: center; font-size: 15px; line-height: 1.4; display: flex; flex-direction: column; gap: 8px; }
.info p { text-shadow: 0 1px 8px rgb(0 0 0 / 0.6); }
.err { background: rgb(0 0 0 / 0.6); padding: 10px 14px; border-radius: 14px; text-shadow: none; }

.bottom { position: absolute; left: 16px; right: 16px; bottom: calc(24px + env(safe-area-inset-bottom)); display: flex; gap: 10px; }
.pill { flex: 1; height: 52px; border-radius: 18px; background: #fff; color: #14122b; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.1s; }
.pill:active { transform: scale(0.97); }
.pill:disabled { opacity: 0.6; }
.pill.ghost { background: rgb(255 255 255 / 0.16); color: #fff; backdrop-filter: blur(8px); }
</style>

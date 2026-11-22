<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { CodeFormat } from '@/db'

const props = defineProps<{ code: string; format: CodeFormat }>()

const BCID: Record<Exclude<CodeFormat, 'none' | 'auto'>, string> = {
  qr: 'qrcode',
  ean13: 'ean13',
  ean8: 'ean8',
  upca: 'upca',
  upce: 'upce',
  code128: 'code128',
  code39: 'code39',
  code93: 'code93',
  codabar: 'rationalizedCodabar',
  itf: 'interleaved2of5',
  pdf417: 'pdf417',
  datamatrix: 'datamatrix',
  aztec: 'azteccode',
}
const SQUARE = new Set<CodeFormat>(['qr', 'datamatrix', 'aztec'])

/** 'auto' (typed by hand): retail lengths get their usual symbology, anything else Code 128. */
function resolve(format: CodeFormat, code: string): Exclude<CodeFormat, 'none' | 'auto'> {
  if (format !== 'auto' && format !== 'none') return format
  if (/^\d{13}$/.test(code)) return 'ean13'
  if (/^\d{12}$/.test(code)) return 'upca'
  if (/^\d{8}$/.test(code)) return 'ean8'
  return 'code128'
}

const svg = ref('')
const failed = ref(false)
const fallback = ref(false)

watchEffect(async () => {
  svg.value = ''
  failed.value = false
  fallback.value = false
  if (!props.code || props.format === 'none') return
  try {
    // Lazy: the barcode library is large and only needed on this screen.
    const { toSVG } = await import('bwip-js')
    // Note: omit `height` for 2D codes entirely — bwip-js rejects undefined values.
    const fmt = resolve(props.format, props.code)
    const opts: Parameters<typeof toSVG>[0] = { bcid: BCID[fmt], text: props.code, scale: 3 }
    if (!SQUARE.has(fmt)) opts.height = 18
    try {
      svg.value = toSVG(opts)
    } catch {
      // No length/charset limits on user input: if the code doesn't fit the chosen
      // format (e.g. 2 digits as EAN-13), render it as Code 128, which accepts any text.
      fallback.value = true
      svg.value = toSVG({ bcid: 'code128', text: props.code, scale: 3, height: 18 })
    }
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <div v-if="code" class="code" :class="{ square: SQUARE.has(resolve(format, code)) && !fallback }">
    <div v-if="svg" class="img" v-html="svg" />
    <p v-else-if="failed" class="warn">Не вдалося намалювати код — покажіть номер касиру</p>
    <p class="num">{{ code }}</p>
  </div>
</template>

<style scoped>
/* Always white: scanners read dark-on-light far more reliably. */
.code {
  background: #fff;
  color: #14122b;
  border-radius: 20px;
  border: 1px solid #e6e3f7;
  padding: 18px 16px 12px;
  text-align: center;
}
.img :deep(svg) { width: 100%; height: 84px; display: block; }
.square .img :deep(svg) { width: 200px; height: 200px; margin: 0 auto; }
.num { font-family: ui-monospace, Menlo, monospace; font-size: 16px; letter-spacing: 0.14em; margin-top: 8px; word-break: break-all; user-select: all; -webkit-user-select: all; }
.warn { font-size: 14px; color: #8a6d00; padding: 8px 0; }
</style>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { CodeFormat } from '@/db'

const props = defineProps<{ code: string; format: CodeFormat }>()

const BCID: Record<Exclude<CodeFormat, 'none'>, string> = {
  qr: 'qrcode',
  ean13: 'ean13',
  ean8: 'ean8',
  upca: 'upca',
  code128: 'code128',
  code39: 'code39',
  pdf417: 'pdf417',
  datamatrix: 'datamatrix',
  aztec: 'azteccode',
}
const SQUARE = new Set<CodeFormat>(['qr', 'datamatrix', 'aztec'])

const svg = ref('')
const failed = ref(false)
const reason = ref('')

watchEffect(async () => {
  svg.value = ''
  failed.value = false
  if (!props.code || props.format === 'none') return
  try {
    // Lazy: the barcode library is large and only needed on this screen.
    const { toSVG } = await import('bwip-js')
    // Note: omit `height` for 2D codes entirely — bwip-js rejects undefined values.
    const opts: Parameters<typeof toSVG>[0] = { bcid: BCID[props.format], text: props.code, scale: 3 }
    if (!SQUARE.has(props.format)) opts.height = 18
    svg.value = toSVG(opts)
  } catch (e) {
    failed.value = true
    reason.value = /check/i.test(String(e)) ? 'Контрольна цифра не збігається' : 'Код не відповідає обраному формату'
  }
})
</script>

<template>
  <div v-if="code" class="code" :class="{ square: SQUARE.has(format) }">
    <div v-if="svg" class="img" v-html="svg" />
    <p v-else-if="failed" class="warn">{{ reason }} — покажіть номер касиру або змініть формат</p>
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

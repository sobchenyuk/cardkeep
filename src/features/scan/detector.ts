import type { CodeFormat } from '@/db'

export interface ScanResult {
  code: string
  format: CodeFormat
}

interface Detected {
  rawValue: string
  format: string
}
interface Detector {
  detect(source: ImageBitmapSource): Promise<Detected[]>
}

const FORMAT_MAP: Record<string, CodeFormat> = {
  qr_code: 'qr',
  ean_13: 'ean13',
  ean_8: 'ean8',
  upc_a: 'upca',
  upc_e: 'upce',
  code_128: 'code128',
  code_39: 'code39',
  code_93: 'code93',
  codabar: 'codabar',
  itf: 'itf',
  pdf417: 'pdf417',
  data_matrix: 'datamatrix',
  aztec: 'aztec',
}

let detectorPromise: Promise<Detector> | null = null

/**
 * Native BarcodeDetector where it exists (Android Chrome), otherwise the ZXing WASM
 * ponyfill. The WASM file is bundled with the app (no CDN), so scanning works offline.
 */
export function getDetector(): Promise<Detector> {
  detectorPromise ??= (async () => {
    const Native = (globalThis as { BarcodeDetector?: { new (): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector
    if (Native) {
      try {
        const formats = await Native.getSupportedFormats()
        if (formats.includes('qr_code') && formats.includes('ean_13')) return new Native()
      } catch {
        /* fall back to the ponyfill */
      }
    }
    const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
      import('barcode-detector/ponyfill'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ])
    prepareZXingModule({
      overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
    })
    return new BarcodeDetector() as unknown as Detector
  })()
  detectorPromise.catch(() => (detectorPromise = null))
  return detectorPromise
}

export function toResult(list: Detected[]): ScanResult | null {
  const hit = list.find((d) => d.rawValue?.trim())
  if (!hit) return null
  return { code: hit.rawValue.trim(), format: FORMAT_MAP[hit.format] ?? 'code128' }
}

export async function detectInImage(blob: Blob): Promise<ScanResult | null> {
  const detector = await getDetector()
  const bitmap = await createImageBitmap(blob)
  try {
    return toResult(await detector.detect(bitmap))
  } finally {
    bitmap.close()
  }
}

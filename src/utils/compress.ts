// On-device photo compression: downscale and re-encode before saving.
const MAX_SIDE = 1200
const QUALITY = 0.75

export class CompressError extends Error {}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall through to <img> decoding (e.g. HEIC on some browsers fails here) */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

export async function compressImage(file: Blob): Promise<Blob> {
  let src: ImageBitmap | HTMLImageElement
  try {
    src = await decode(file)
  } catch {
    throw new CompressError('Не вдалося відкрити фото. Спробуйте інше зображення.')
  }
  const w = src.width
  const h = src.height
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new CompressError('Браузер не зміг обробити фото.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  if ('close' in src) src.close()

  // Safari < 17 silently returns PNG for WebP requests; fall back to JPEG then.
  let out = await encode(canvas, 'image/webp')
  if (!out || out.type !== 'image/webp') out = await encode(canvas, 'image/jpeg')
  if (!out) throw new CompressError('Не вдалося стиснути фото.')
  return out
}

export const formatKB = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} КБ`

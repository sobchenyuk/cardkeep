import JSZip from 'jszip'
import { db, now, uid, type Card, type Category, type CodeFormat } from '@/db'
import { normalize } from '@/utils/collate'

export const BACKUP_FORMAT = 'cardkeep-backup'
export const BACKUP_VERSION = 1

export class BackupError extends Error {}

interface CardEntry extends Omit<Card, 'frontPhoto' | 'backPhoto'> {
  frontPhoto: string | null
  backPhoto: string | null
}
interface Manifest {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  categories: Category[]
  cards: CardEntry[]
}

const README = `CardKeep — резервна копія карток
================================

Цей архів можна відкрити без застосунку:

  cards.json   — усі картки й категорії (JSON, UTF-8)
  photos/      — фото карток: <id>-front.* (лицьова), <id>-back.* (зворотна)

Поля картки в cards.json:
  title        — назва
  code         — номер / код картки
  codeFormat   — формат коду (auto, qr, ean13, code128 …)
  description  — опис
  categoryId   — id категорії зі списку "categories" (null — без категорії)
  frontPhoto / backPhoto — шлях до фото в архіві або null

Щоб відновити картки: CardKeep → Налаштування → Імпорт архіву.
`

const extFor = (type: string) => (type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg')
const typeFor = (path: string) => (path.endsWith('.webp') ? 'image/webp' : path.endsWith('.png') ? 'image/png' : 'image/jpeg')

export async function buildArchive(): Promise<Blob> {
  const [cards, categories] = await Promise.all([db.cards.toArray(), db.categories.toArray()])
  const zip = new JSZip()
  const photos = zip.folder('photos')!

  const entries: CardEntry[] = cards.map((c) => {
    const put = (blob: Blob | null, side: 'front' | 'back') => {
      if (!blob) return null
      const name = `${c.id}-${side}.${extFor(blob.type)}`
      photos.file(name, blob, { compression: 'STORE' }) // already compressed
      return `photos/${name}`
    }
    return { ...c, frontPhoto: put(c.frontPhoto, 'front'), backPhoto: put(c.backPhoto, 'back') }
  })

  const manifest: Manifest = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now(), categories, cards: entries }
  zip.file('cards.json', JSON.stringify(manifest, null, 2))
  zip.file('README.txt', README)
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE' })
}

export const archiveName = () => `cardkeep-backup-${new Date().toISOString().slice(0, 10)}.zip`

// ---------- Import ----------

export interface ImportPreview {
  cards: Card[]
  categories: Category[]
  /** Cards that already exist (same title + code) — skipped in "add" mode. */
  duplicates: number
  exportedAt: string
}

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)

export async function readArchive(file: Blob): Promise<ImportPreview> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new BackupError('Це не ZIP-архів або файл пошкоджено')
  }
  const json = zip.file('cards.json')
  if (!json) throw new BackupError('В архіві немає cards.json — це не резервна копія CardKeep')

  let manifest: Manifest
  try {
    manifest = JSON.parse(await json.async('string'))
  } catch {
    throw new BackupError('Файл cards.json пошкоджено')
  }
  if (manifest?.format !== BACKUP_FORMAT) throw new BackupError('Це не резервна копія CardKeep')
  if (typeof manifest.version !== 'number' || manifest.version > BACKUP_VERSION)
    throw new BackupError('Архів створено новішою версією CardKeep — оновіть застосунок')

  const readPhoto = async (path: unknown): Promise<Blob | null> => {
    if (typeof path !== 'string') return null
    const f = zip.file(path)
    if (!f) return null
    const data = await f.async('arraybuffer')
    return new Blob([data], { type: typeFor(path) })
  }

  const categories: Category[] = (Array.isArray(manifest.categories) ? manifest.categories : [])
    .filter((c) => c && typeof c.name === 'string' && c.name.trim())
    .map((c, i) => ({ id: str(c.id) || uid(), name: c.name.trim(), order: typeof c.order === 'number' ? c.order : i, createdAt: str(c.createdAt, now()) }))

  const cards: Card[] = []
  for (const c of Array.isArray(manifest.cards) ? manifest.cards : []) {
    if (!c || typeof c.title !== 'string' || !c.title.trim()) continue
    cards.push({
      id: str(c.id) || uid(),
      title: c.title.trim(),
      code: str(c.code),
      codeFormat: (str(c.codeFormat, 'auto') as CodeFormat) || 'auto',
      description: str(c.description),
      categoryId: typeof c.categoryId === 'string' ? c.categoryId : null,
      color: str(c.color, '#6a4cff'),
      frontPhoto: await readPhoto(c.frontPhoto),
      backPhoto: await readPhoto(c.backPhoto),
      createdAt: str(c.createdAt, now()),
      updatedAt: str(c.updatedAt, now()),
    })
  }

  const existing = await db.cards.toArray()
  const keys = new Set(existing.map(dupKey))
  const duplicates = cards.filter((c) => keys.has(dupKey(c))).length

  return { cards, categories, duplicates, exportedAt: str(manifest.exportedAt) }
}

const dupKey = (c: Pick<Card, 'title' | 'code'>) => `${normalize(c.title)}\u0000${c.code.trim()}`

/** Apply an import. Returns how many cards were written. */
export async function applyImport(p: ImportPreview, mode: 'add' | 'replace'): Promise<number> {
  return db.transaction('rw', db.cards, db.categories, async () => {
    if (mode === 'replace') {
      await db.cards.clear()
      await db.categories.clear()
      await db.categories.bulkPut(p.categories)
      const known = new Set(p.categories.map((c) => c.id))
      await db.cards.bulkPut(p.cards.map((c) => ({ ...c, categoryId: c.categoryId && known.has(c.categoryId) ? c.categoryId : null })))
      return p.cards.length
    }

    // "add": merge categories by name, skip duplicate cards, never overwrite existing ids.
    const existingCats = await db.categories.toArray()
    const byName = new Map(existingCats.map((c) => [normalize(c.name), c.id]))
    let order = existingCats.reduce((m, c) => Math.max(m, c.order), -1)
    const catMap = new Map<string, string>()
    for (const c of [...p.categories].sort((a, b) => a.order - b.order)) {
      const hit = byName.get(normalize(c.name))
      if (hit) {
        catMap.set(c.id, hit)
        continue
      }
      const id = existingCats.some((e) => e.id === c.id) ? uid() : c.id
      await db.categories.add({ ...c, id, order: ++order })
      byName.set(normalize(c.name), id)
      catMap.set(c.id, id)
    }

    const existing = await db.cards.toArray()
    const keys = new Set(existing.map(dupKey))
    const ids = new Set(existing.map((c) => c.id))
    const fresh = p.cards
      .filter((c) => !keys.has(dupKey(c)))
      .map((c) => ({ ...c, id: ids.has(c.id) ? uid() : c.id, categoryId: c.categoryId ? (catMap.get(c.categoryId) ?? null) : null }))
    await db.cards.bulkAdd(fresh)
    return fresh.length
  })
}

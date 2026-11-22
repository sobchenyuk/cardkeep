import Dexie, { type EntityTable } from 'dexie'

export type CodeFormat =
  | 'qr'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'code128'
  | 'code39'
  | 'code93'
  | 'codabar'
  | 'itf'
  | 'pdf417'
  | 'datamatrix'
  | 'aztec'
  | 'none'

export interface Card {
  id: string
  title: string
  code: string
  codeFormat: CodeFormat
  description: string
  categoryId: string | null
  frontPhoto: Blob | null
  backPhoto: Blob | null
  color: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  order: number
  createdAt: string
}

export const db = new Dexie('cardkeep') as Dexie & {
  cards: EntityTable<Card, 'id'>
  categories: EntityTable<Category, 'id'>
}

db.version(1).stores({
  cards: 'id, title, categoryId, updatedAt',
  categories: 'id, name, order',
})

export const uid = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const now = () => new Date().toISOString()

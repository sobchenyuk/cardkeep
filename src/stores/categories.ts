import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db, now, uid, type Category } from '@/db'
import { normalize } from '@/utils/collate'
import { useCards } from './cards'

export class CategoryError extends Error {}

export const useCategories = defineStore('categories', () => {
  const items = ref<Category[]>([])
  const ordered = computed(() => [...items.value].sort((a, b) => a.order - b.order))

  async function load() {
    items.value = await db.categories.toArray()
  }

  const get = (id: string | null) => (id ? items.value.find((c) => c.id === id) : undefined)

  function validate(name: string, exceptId?: string): string {
    const clean = name.trim().replace(/\s+/g, ' ')
    if (!clean) throw new CategoryError('Введіть назву категорії')
    if (clean.length > 40) throw new CategoryError('Назва задовга (до 40 символів)')
    if (items.value.some((c) => c.id !== exceptId && normalize(c.name) === normalize(clean)))
      throw new CategoryError('Така категорія вже існує')
    return clean
  }

  async function create(name: string): Promise<Category> {
    const cat: Category = {
      id: uid(),
      name: validate(name),
      order: items.value.reduce((m, c) => Math.max(m, c.order), -1) + 1,
      createdAt: now(),
    }
    await db.categories.add(cat)
    items.value = [...items.value, cat]
    return cat
  }

  async function rename(id: string, name: string) {
    const clean = validate(name, id)
    await db.categories.update(id, { name: clean })
    items.value = items.value.map((c) => (c.id === id ? { ...c, name: clean } : c))
  }

  async function remove(id: string) {
    await db.transaction('rw', db.categories, db.cards, async () => {
      await useCards().clearCategory(id)
      await db.categories.delete(id)
    })
    items.value = items.value.filter((c) => c.id !== id)
  }

  /** Move a category one step up (-1) or down (+1). */
  async function move(id: string, dir: -1 | 1) {
    const list = ordered.value
    const i = list.findIndex((c) => c.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    const a = list[i]
    const b = list[j]
    await db.categories.bulkUpdate([
      { key: a.id, changes: { order: b.order } },
      { key: b.id, changes: { order: a.order } },
    ])
    items.value = items.value.map((c) => (c.id === a.id ? { ...c, order: b.order } : c.id === b.id ? { ...c, order: a.order } : c))
  }

  return { items, ordered, load, get, create, rename, remove, move }
})

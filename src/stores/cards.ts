import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db, now, uid, type Card } from '@/db'
import { byName } from '@/utils/collate'
import { colorFor } from '@/utils/color'

export type CardDraft = Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'color'> & { id?: string; color?: string }

export const useCards = defineStore('cards', () => {
  const items = ref<Card[]>([])
  const loaded = ref(false)

  const sorted = computed(() => [...items.value].sort(byName<Card>((c) => c.title)))

  async function load() {
    items.value = await db.cards.toArray()
    loaded.value = true
  }

  const get = (id: string) => items.value.find((c) => c.id === id)

  async function save(draft: CardDraft): Promise<Card> {
    const existing = draft.id ? get(draft.id) : undefined
    const card: Card = {
      ...draft,
      title: draft.title.trim(),
      code: draft.code.trim(),
      description: draft.description.trim(),
      id: existing?.id ?? uid(),
      color: draft.color ?? existing?.color ?? colorFor(draft.title),
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    }
    await db.cards.put(card)
    items.value = existing ? items.value.map((c) => (c.id === card.id ? card : c)) : [...items.value, card]
    return card
  }

  async function remove(id: string) {
    await db.cards.delete(id)
    items.value = items.value.filter((c) => c.id !== id)
  }

  /** Called when a category is deleted: its cards become uncategorized. */
  async function clearCategory(categoryId: string) {
    await db.cards.where('categoryId').equals(categoryId).modify({ categoryId: null })
    items.value = items.value.map((c) => (c.categoryId === categoryId ? { ...c, categoryId: null } : c))
  }

  return { items, loaded, sorted, load, get, save, remove, clearCategory }
})

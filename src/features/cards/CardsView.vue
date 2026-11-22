<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/ui/PageHeader.vue'
import CardTile from '@/features/card/CardTile.vue'
import CardSheet from '@/features/card/CardSheet.vue'
import { useCards } from '@/stores/cards'
import { useCategories } from '@/stores/categories'
import { normalize } from '@/utils/collate'

const cards = useCards()
const categories = useCategories()
const route = useRoute()
const router = useRouter()

const query = ref('')
const NONE = '__none__'
const filter = computed<string | null>({
  get: () => (route.query.cat as string) || null,
  set: (v) => router.replace({ query: { ...route.query, cat: v || undefined } }),
})

const hasUncategorized = computed(() => cards.items.some((c) => !c.categoryId))
const chips = computed(() => [
  ...categories.ordered.map((c) => ({ id: c.id, name: c.name })),
  ...(hasUncategorized.value && categories.items.length ? [{ id: NONE, name: 'Без категорії' }] : []),
])

const visible = computed(() => {
  const q = normalize(query.value)
  return cards.sorted.filter((c) => {
    if (filter.value === NONE && c.categoryId) return false
    if (filter.value && filter.value !== NONE && c.categoryId !== filter.value) return false
    return !q || normalize(c.title).includes(q)
  })
})

const openCard = computed(() => {
  const id = route.query.card as string | undefined
  return id ? cards.get(id) : undefined
})
const open = (id: string) => router.push({ query: { ...route.query, card: id } })
const close = () => router.back()
const edit = (id: string) => router.replace({ name: 'edit', params: { id } })
</script>

<template>
  <PageHeader title="Картки">
    <button class="add" aria-label="Додати картку" @click="router.push({ name: 'new' })">
      <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
    </button>
  </PageHeader>

  <template v-if="cards.items.length">
    <label class="search">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2" /><path d="m16 16 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      <input v-model="query" type="search" placeholder="Пошук карток" autocomplete="off" enterkeyhint="search" />
      <button v-if="query" class="clear" aria-label="Очистити" @click="query = ''">×</button>
    </label>

    <div v-if="chips.length" class="chips">
      <button class="chip" :class="{ on: !filter }" @click="filter = null">Усі</button>
      <button v-for="c in chips" :key="c.id" class="chip" :class="{ on: filter === c.id }" @click="filter = c.id">{{ c.name }}</button>
    </div>

    <div v-if="visible.length" class="grid">
      <CardTile
        v-for="c in visible"
        :key="c.id"
        :card="c"
        :subtitle="categories.get(c.categoryId)?.name ?? 'Без категорії'"
        @click="open(c.id)"
      />
    </div>
    <p v-else class="nothing">Нічого не знайдено</p>
  </template>

  <section v-else-if="cards.loaded" class="empty">
    <div class="art" aria-hidden="true">
      <div class="card back" />
      <div class="card front" />
    </div>
    <h2>Поки що порожньо</h2>
    <p>Додайте першу картку: введіть код і сфотографуйте її з обох боків.</p>
    <button class="primary" @click="router.push({ name: 'new' })">Додати картку</button>
  </section>

  <CardSheet v-if="openCard" :key="openCard.id" :card="openCard" @close="close" @edit="edit(openCard.id)" />
</template>

<style scoped>
.add { width: 44px; height: 44px; border-radius: 50%; background: var(--accent); color: var(--accent-text); display: grid; place-items: center; box-shadow: var(--shadow); transition: transform 0.1s; }
.add:active { transform: scale(0.94); }

.search { margin: 4px 16px 12px; height: 46px; border-radius: 18px; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; gap: 10px; padding: 0 8px 0 14px; color: var(--text-2); }
.search input { flex: 1; min-width: 0; border: 0; background: none; font: inherit; color: var(--text); outline: none; height: 100%; }
.search input::-webkit-search-cancel-button { display: none; }
.clear { width: 32px; height: 32px; font-size: 22px; color: var(--text-2); }

.chips { display: flex; gap: 8px; padding: 0 16px 14px; overflow-x: auto; scrollbar-width: none; }
.chips::-webkit-scrollbar { display: none; }
.chip { flex: none; padding: 8px 14px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border); color: var(--text-2); font-size: 14px; font-weight: 600; }
.chip.on { background: var(--accent-soft); color: var(--accent); border-color: transparent; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; padding: 0 16px 16px; }
.nothing { text-align: center; color: var(--text-2); padding: 48px 16px; }

.empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 32px; gap: 12px; }
.art { position: relative; width: 168px; height: 120px; margin-bottom: 12px; }
.card { position: absolute; width: 152px; height: 96px; border-radius: 22px; }
.back { left: 16px; top: 0; background: #f5a524; transform: rotate(-6deg); }
.front { left: 0; top: 20px; background: var(--accent); box-shadow: var(--shadow); }
.empty h2 { font-size: 20px; font-weight: 700; }
.empty p { color: var(--text-2); max-width: 300px; }
.primary { margin-top: 12px; min-height: 48px; padding: 0 24px; border-radius: 24px; background: var(--accent); color: var(--accent-text); font-weight: 700; transition: transform 0.1s; }
.primary:active { transform: scale(0.97); }
</style>

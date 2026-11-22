<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { Map as LMap, LayerGroup } from 'leaflet'
import { findByName, findNearby, formatDistance, geoPermission, getPosition, mapsLink, PlacesError, type Place } from './places'

const props = defineProps<{ title: string }>()

const root = ref<HTMLElement>()
const mapEl = ref<HTMLElement>()
const state = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const error = ref('')
const places = shallowRef<Place[]>([])
const mode = ref<'near' | 'name'>('name')
const geoDenied = ref(false)
const selected = ref<string | null>(null)

let L: typeof import('leaflet') | null = null
let map: LMap | null = null
let layer: LayerGroup | null = null
let me: { lat: number; lon: number } | null = null
let io: IntersectionObserver | null = null

const top = computed(() => places.value.slice(0, 5))
const label = computed(() => {
  const n = places.value.length
  if (!n) return mode.value === 'near' ? 'Поруч нічого не знайдено' : 'Нічого не знайдено'
  return mode.value === 'near' ? `${n} поруч` : `Знайдено: ${n}`
})

async function ensureMap() {
  if (map) return
  const mod = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = mod.default ?? mod
  map = L.map(mapEl.value!, { zoomControl: false, attributionControl: true })
  map.attributionControl.setPrefix(false)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(map)
  layer = L.layerGroup().addTo(map)
  map.setView([49.84, 24.03], 12)
}

function draw() {
  if (!L || !map || !layer) return
  layer.clearLayers()
  const pin = (active: boolean) => L!.divIcon({ className: '', html: `<span class="ck-pin${active ? ' on' : ''}"></span>`, iconSize: [28, 28], iconAnchor: [14, 26] })
  const pts: [number, number][] = []
  for (const p of places.value.slice(0, 40)) {
    L.marker([p.lat, p.lon], { icon: pin(p.id === selected.value), title: p.name })
      .on('click', () => select(p))
      .addTo(layer)
    pts.push([p.lat, p.lon])
  }
  if (me) {
    L.marker([me.lat, me.lon], { icon: L.divIcon({ className: '', html: '<span class="ck-me"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(layer)
    pts.push([me.lat, me.lon])
  }
  if (pts.length === 1) map.setView(pts[0], 15)
  else if (mode.value === 'near' && me && places.value.length) {
    // Frame the user and the closest few stores rather than every match.
    const near: [number, number][] = [[me.lat, me.lon], ...places.value.slice(0, 5).map((p) => [p.lat, p.lon] as [number, number])]
    map.fitBounds(near, { padding: [28, 28], maxZoom: 16 })
  } else if (pts.length) map.fitBounds(pts, { padding: [28, 28], maxZoom: 15 })
}

function select(p: Place) {
  selected.value = p.id
  map?.setView([p.lat, p.lon], Math.max(map.getZoom(), 16), { animate: true })
  draw()
}

async function load(useGeo: boolean) {
  state.value = 'loading'
  error.value = ''
  try {
    await ensureMap()
    if (useGeo) {
      try {
        const pos = await getPosition()
        me = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        mode.value = 'near'
        places.value = await findNearby(props.title, me.lat, me.lon)
      } catch (e) {
        if (e instanceof PlacesError) throw e
        // Location refused or timed out: fall back to a plain name search.
        geoDenied.value = (e as GeolocationPositionError)?.code === 1
        me = null
        mode.value = 'name'
        places.value = await findByName(props.title)
      }
    } else {
      mode.value = 'name'
      places.value = await findByName(props.title)
    }
    state.value = 'ready'
    // The container was hidden/zero-sized while loading.
    requestAnimationFrame(() => {
      map?.invalidateSize()
      draw()
    })
  } catch (e) {
    state.value = 'error'
    error.value = !navigator.onLine ? 'Немає інтернету — мапа недоступна' : e instanceof PlacesError ? e.message : 'Не вдалося завантажити мапу'
  }
}

async function start() {
  const perm = await geoPermission()
  geoDenied.value = perm === 'denied'
  // Ask for location only if already allowed; otherwise offer a button.
  await load(perm === 'granted')
}

onMounted(() => {
  // Lazy: load the map only when the user scrolls to it.
  io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io?.disconnect()
        start()
      }
    },
    { rootMargin: '120px' },
  )
  io.observe(root.value!)
})
onBeforeUnmount(() => {
  io?.disconnect()
  map?.remove()
  map = null
})
</script>

<template>
  <section ref="root" class="storemap">
    <h3>Де діє картка</h3>
    <div class="wrap">
      <div ref="mapEl" class="map" />
      <span v-if="state === 'ready'" class="chip">{{ label }}</span>
      <div v-if="state === 'loading' || state === 'idle'" class="overlay"><span class="spin" /> Шукаємо «{{ title }}»…</div>
      <div v-else-if="state === 'error'" class="overlay err">
        <p>{{ error }}</p>
        <button class="btn btn-soft" @click="load(mode === 'near')">Повторити</button>
      </div>
    </div>

    <ul v-if="state === 'ready' && top.length" class="list">
      <li v-for="p in top" :key="p.id">
        <button :class="{ on: selected === p.id }" @click="select(p)">
          <span class="pname">{{ p.name }}</span>
          <span class="paddr">{{ p.address || 'Адреса не вказана' }}</span>
          <span v-if="p.distance != null" class="pdist">{{ formatDistance(p.distance) }}</span>
        </button>
      </li>
    </ul>

    <div class="actions">
      <button v-if="mode !== 'near' && !geoDenied && state !== 'loading'" class="btn btn-soft" @click="load(true)">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" /><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2" /></svg>
        Поруч зі мною
      </button>
      <a class="btn btn-soft" :href="mapsLink(title)" target="_blank" rel="noopener">Відкрити в картах</a>
    </div>
    <p v-if="geoDenied && mode === 'name'" class="note">Геолокацію вимкнено — показуємо пошук за назвою. Увімкніть її в налаштуваннях браузера, щоб бачити найближчі магазини.</p>
  </section>
</template>

<style scoped>
.storemap { margin-top: 22px; }
h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-2); margin: 0 0 10px 4px; }
.wrap { position: relative; height: 210px; border-radius: 20px; overflow: hidden; border: 1px solid var(--border); background: var(--surface-2); isolation: isolate; }
.map { position: absolute; inset: 0; }
.chip { position: absolute; left: 10px; top: 10px; z-index: 500; font-size: 12px; font-weight: 700; background: var(--surface); color: var(--text); padding: 6px 12px; border-radius: 999px; box-shadow: var(--shadow); }
.overlay { position: absolute; inset: 0; z-index: 600; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-2); font-size: 14px; background: var(--surface-2); text-align: center; padding: 16px; }
.overlay.err p { color: var(--text); }
.spin { display: inline-block; width: 18px; height: 18px; border: 2px solid var(--accent); border-right-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.list { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-direction: column; gap: 6px; }
.list button { width: 100%; display: grid; grid-template-columns: 1fr auto; text-align: left; gap: 2px 10px; padding: 10px 14px; border-radius: 16px; background: var(--bg); border: 1px solid transparent; }
.list button.on { border-color: var(--accent); background: var(--accent-soft); }
.pname { font-weight: 650; font-size: 15px; }
.paddr { grid-column: 1; font-size: 13px; color: var(--text-2); }
.pdist { grid-column: 2; grid-row: 1 / span 2; align-self: center; font-size: 13px; font-weight: 700; color: var(--accent); }
.actions { display: flex; gap: 8px; margin-top: 10px; }
.actions .btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; font-size: 14px; min-height: 46px; }
.note { font-size: 13px; color: var(--text-2); margin: 8px 4px 0; }
</style>

<style>
/* Leaflet markers (unscoped: rendered by Leaflet outside Vue's scope). */
.ck-pin { display: block; width: 26px; height: 26px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: var(--accent); border: 3px solid #fff; box-shadow: 0 3px 8px rgb(0 0 0 / 0.3); transition: transform 0.15s; }
.ck-pin.on { background: #f5a524; transform: rotate(-45deg) scale(1.2); }
.ck-me { display: block; width: 16px; height: 16px; border-radius: 50%; background: #2e6bff; border: 3px solid #fff; box-shadow: 0 0 0 6px rgb(46 107 255 / 0.22); }
.storemap .leaflet-control-attribution { font-size: 10px; background: rgb(255 255 255 / 0.75); }
/* Dark theme: invert the light OSM tiles. */
:root[data-theme='dark'] .storemap .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9); }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .storemap .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9); }
}
</style>

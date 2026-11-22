// Store lookup on OpenStreetMap data, no API keys.
// Near the user: Overpass (name/brand around a point). Without location: Nominatim by name.
// Both services ask for light use, so results are cached and requests are one-off.

export interface Place {
  id: string
  name: string
  lat: number
  lon: number
  address: string
  distance?: number // metres from the user, when known
}

export class PlacesError extends Error {}

const TTL = 24 * 60 * 60 * 1000
const OVERPASS = 'https://overpass-api.de/api/interpreter'
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

function cacheGet(key: string): Place[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { t, v } = JSON.parse(raw)
    return Date.now() - t < TTL ? v : null
  } catch {
    return null
  }
}
function cacheSet(key: string, v: Place[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), v }))
  } catch {
    /* storage full or unavailable — fine */
  }
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\"]/g, '\\$&')

export function distance(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371e3
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} м` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} км`)

interface OverpassEl {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function addressFromTags(t: Record<string, string> = {}) {
  return [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', ') || t['addr:city'] || ''
}

async function overpass(title: string, lat: number, lon: number, radius: number): Promise<Place[]> {
  const re = escapeRegex(title.trim())
  const q = `[out:json][timeout:15];(nwr["name"~"${re}",i](around:${radius},${lat},${lon});nwr["brand"~"${re}",i](around:${radius},${lat},${lon}););out center 60;`
  const res = await fetch(OVERPASS, { method: 'POST', body: new URLSearchParams({ data: q }) })
  if (!res.ok) throw new PlacesError('Сервіс мапи тимчасово недоступний')
  const json = (await res.json()) as { elements: OverpassEl[] }
  const seen = new Set<string>()
  const out: Place[] = []
  for (const el of json.elements ?? []) {
    const p = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null)
    if (!p) continue
    const key = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: `${el.type}/${el.id}`,
      name: el.tags?.name || el.tags?.brand || title,
      lat: p.lat,
      lon: p.lon,
      address: addressFromTags(el.tags),
      distance: distance(lat, lon, p.lat, p.lon),
    })
  }
  return out.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
}

/** Stores matching the card name around the user; widens the radius once if nothing is close. */
export async function findNearby(title: string, lat: number, lon: number): Promise<Place[]> {
  const key = `cardkeep.places:near:${title.toLowerCase()}:${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = cacheGet(key)
  if (cached) return cached
  let found = await overpass(title, lat, lon, 4000)
  if (!found.length) found = await overpass(title, lat, lon, 20000)
  cacheSet(key, found)
  return found
}

interface NominatimItem {
  place_id: number
  lat: string
  lon: string
  name?: string
  display_name: string
}

/** Places by name only (no location permission). */
export async function findByName(title: string): Promise<Place[]> {
  const key = `cardkeep.places:name:${title.toLowerCase()}`
  const cached = cacheGet(key)
  if (cached) return cached
  const url = `${NOMINATIM}?${new URLSearchParams({ q: title, format: 'jsonv2', limit: '15', 'accept-language': 'uk' })}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new PlacesError('Сервіс мапи тимчасово недоступний')
  const items = (await res.json()) as NominatimItem[]
  const out = items.map((i) => ({
    id: `n${i.place_id}`,
    name: i.name || title,
    lat: Number(i.lat),
    lon: Number(i.lon),
    address: i.display_name.split(',').slice(1, 3).join(',').trim(),
  }))
  cacheSet(key, out)
  return out
}

export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new PlacesError('Геолокація недоступна'))
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 })
  })
}

export async function geoPermission(): Promise<PermissionState | 'unknown'> {
  try {
    const p = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return p.state
  } catch {
    return 'unknown'
  }
}

export const mapsLink = (title: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`

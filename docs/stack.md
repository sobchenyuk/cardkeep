# Стек

## MVP

| Шар | Вибір | Чому |
|---|---|---|
| Фреймворк | **Vue 3** (Composition API, `<script setup>`) + **TypeScript** | основний стек автора; легко загорнути в Capacitor пізніше |
| Збірка | **Vite** | швидко, стандарт для Vue |
| PWA | **vite-plugin-pwa** (Workbox) | маніфест, service worker, офлайн, повідомлення про оновлення |
| Стан | **Pinia** | |
| Роутинг | **Vue Router** (hash-режим) | GitHub Pages не вміє SPA-fallback; hash-роутинг працює без хаків |
| Локальна БД | **IndexedDB** через **Dexie** | картки + фото як Blob, офлайн |
| Сканування | нативний **BarcodeDetector**, fallback **@zxing/browser** | жива камера і розпізнавання з фото |
| Генерація кодів | **bwip-js** | EAN/UPC/Code128/Code39/QR/PDF417/DataMatrix/Aztec в одній бібліотеці |
| Архів | **JSZip** | експорт/імпорт ZIP |
| Мапа | **Leaflet** + тайли OpenStreetMap | без ключів; пошук — Overpass API / Nominatim |
| Жести | власні pointer-події | bottom sheet і слайдер без важких бібліотек |
| Стилі | чистий CSS з custom properties (дизайн-токени) | строгий власний дизайн, без UI-китів |
| Тести | **Vitest** | юніт-тести для стиснення, експорту/імпорту, сортування |
| Лінт | ESLint + Prettier | |

## Хостинг

- **GitHub Pages** з публічного репозиторію `sobchenyuk/cardkeep`.
- Деплой через **GitHub Actions** при пуші в `main`.
- `base` у Vite — `/cardkeep/`.
- HTTPS від GitHub Pages — достатньо для камери, геолокації і service worker.

## v2 (план)

- **Firebase Auth** (Google) + **Firestore** (offline persistence).
- **Cloudflare R2** для фото; маленька функція видачі signed URL (Cloudflare Pages Functions або власний Docker-сервіс).
- Код і дані користувача не прив'язані до платформи: репозиторій свій, експорт архівом завжди доступний.

## Структура (цільова)

```
src/
  app/          # main.ts, router, App.vue
  stores/       # pinia: cards, categories, settings
  db/           # dexie schema, міграції
  features/
    cards/      # список, bottom sheet, форма
    scan/       # камера, розпізнавання з фото
    photo/      # стиснення (worker)
    backup/     # експорт/імпорт ZIP
    map/        # leaflet, пошук закладів
    categories/
    settings/   # тема, експорт
  ui/           # toast, sheet, slider, кнопки, токени
  utils/
```

import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history: GitHub Pages has no SPA fallback for deep links.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'cards', component: () => import('@/features/cards/CardsView.vue') },
    { path: '/categories', name: 'categories', component: () => import('@/features/categories/CategoriesView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/features/settings/SettingsView.vue') },
  ],
})

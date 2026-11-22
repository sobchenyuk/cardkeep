import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history: GitHub Pages has no SPA fallback for deep links.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'cards', component: () => import('@/features/cards/CardsView.vue') },
    { path: '/new', name: 'new', component: () => import('@/features/card/CardFormView.vue'), meta: { hideNav: true } },
    { path: '/edit/:id', name: 'edit', component: () => import('@/features/card/CardFormView.vue'), props: true, meta: { hideNav: true } },
    { path: '/categories', name: 'categories', component: () => import('@/features/categories/CategoriesView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/features/settings/SettingsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

import { createRouter, createWebHistory } from 'vue-router'
import { useResultsStore } from '@/stores/resultsStore'

// Lazy-load views — each route is its own code chunk
// Keeps initial bundle under 80kb gzipped
const HomeView    = () => import('@/views/HomeView.vue')
const WizardView  = () => import('@/views/WizardView.vue')
const ResultsView = () => import('@/views/ResultsView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/check',
      name: 'wizard',
      component: WizardView,
    },
    {
      path: '/results',
      name: 'results',
      component: ResultsView,
      beforeEnter: () => {
        // Guard: only allow access if a check is in progress or results exist.
        // Must access store inside the guard (after Pinia is initialized).
        const resultsStore = useResultsStore()
        if (!resultsStore.isLoading && !resultsStore.data && !resultsStore.error) {
          return { name: 'home' }
        }
      },
    },
    {
      // Catch-all — redirect unknown routes to home
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  // Scroll to top on every route change
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

export default router

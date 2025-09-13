import { createRouter, createWebHistory } from 'vue-router';
import { requireAuth, guestOnly } from './guards';
import { defineAsyncComponent } from 'vue';
// centralize paths to avoid typos
export const PATH = {
  LOGIN: '/login',
  REGISTER: '/register',
  APP: '/app',
  MINE: '/app/mine',
  SHARED: '/app/shared',
} as const;
/**
 * Helper to create async components without Vue Suspense warnings.
 * (Route components don't need Suspense; the router shows/keeps the
 * previous page until the new chunk finishes downloading.)
 */
const lazy = (loader: () => Promise<any>) =>
  defineAsyncComponent({
    loader,
    delay: 120, // optional small delay before showing any internal loader
    timeout: 0, // no timeout
    suspensible: false,
  });

// Auth screens (lazy)
const LoginPage = lazy(() => import('@/pages/auth/LoginPage.vue'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage.vue'));

// Dashboard layout + children (lazy)
const DashboardLayout = lazy(
  () => import('@/pages/dashboard/DashboardLayout.vue')
);
const MyDocsPage = lazy(() => import('@/pages/dashboard/MyDocsPage.vue'));
const SharedWithMePage = lazy(
  () => import('@/pages/dashboard/SharedWithMePage.vue')
);

// (Optional) 404 page if you want it
// const NotFoundPage    = lazy(() => import('@/pages/NotFound.vue'))

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0 };
  },
  routes: [
    // guest-only
    { path: PATH.LOGIN, component: LoginPage, meta: { guestOnly: true } },
    { path: PATH.REGISTER, component: RegisterPage, meta: { guestOnly: true } },

    // app shell (protected)
    {
      path: PATH.APP,
      component: DashboardLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: PATH.MINE,
          component: MyDocsPage,
          meta: { requiresAuth: true },
        },
        {
          path: PATH.SHARED,
          component: SharedWithMePage,
          meta: { requiresAuth: true },
        },
        { path: '', redirect: PATH.MINE },
      ],
    },

    // root → /app
    { path: '/', redirect: PATH.MINE },

    // catch all (optional)
    // { path: '/:pathMatch(.*)*', component: NotFoundPage },
  ],
});

// Global guards
router.beforeEach(guestOnly); // protects /login & /register
router.beforeEach(requireAuth); // protects /app/*

export default router;

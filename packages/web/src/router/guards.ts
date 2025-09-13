import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { getToken } from '@/lib/token';

/** Returns true if we consider the user authenticated. */
export function isAuthed(): boolean {
  return !!getToken();
}

/** Guard for routes that require authentication. */
export function requireAuth(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  if (to.meta.requiresAuth && !isAuthed()) {
    // send them to login and keep the target as ?next=...
    return next({ path: '/login', query: { next: to.fullPath } });
  }
  next();
}

/** Guard for routes only guests should see (login/register). */
export function guestOnly(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  if (to.meta.guestOnly && isAuthed()) {
    return next({ path: '/app/mine' });
  }
  next();
}

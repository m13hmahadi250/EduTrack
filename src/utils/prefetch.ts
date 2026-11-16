/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// High-traffic pages/components map for bundle dynamic prefetching
export const prefetchMap = {
  Home: () => import('../pages/Home'),
  Login: () => import('../pages/Login'),
  Signup: () => import('../pages/Signup'),
  DashboardRouter: () => import('../pages/DashboardRouter'),
  Messages: () => import('../pages/Messages'),
  TeacherProfile: () => import('../pages/TeacherProfile'),
  
  // Dashboard Sub-Views
  AdminDashboard: () => import('../pages/dashboard/AdminDashboard'),
  TutorDashboard: () => import('../pages/dashboard/TutorDashboard'),
  StudentDashboard: () => import('../pages/dashboard/StudentDashboard'),
};

export type PrefetchKey = keyof typeof prefetchMap;

// Track loaded/fetching modules to avoid repeated network calls
const fetchedModules = new Set<string>();

/**
 * Prefetches a specific component or page's javascript bundle in the background
 * @param key The key of the prefetch map to trigger loading for
 */
export const prefetchPage = (key: PrefetchKey): void => {
  const loader = prefetchMap[key] as (() => Promise<unknown>) | undefined;
  if (!loader || fetchedModules.has(key)) return;
  
  fetchedModules.add(key);
  
  Promise.resolve()
    .then(() => loader())
    .catch((err) => {
      // Graceful warning so prefetch failures never disrupt user experience
      console.warn(`[Prefetch] Background loading for ${key} failed or was cancelled:`, err);
      fetchedModules.delete(key);
    });
};

/**
 * Triggers prefetching for multiple keys in sequence
 * @param keys Array of keys to prefetch
 */
export const prefetchMultiple = (keys: PrefetchKey[]): void => {
  keys.forEach((key) => {
    // Stagger slightly or load sequentially in requestIdleCallback if available
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => prefetchPage(key));
    } else {
      setTimeout(() => prefetchPage(key), 50);
    }
  });
};

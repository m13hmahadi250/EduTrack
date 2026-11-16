import React, { ComponentType, LazyExoticComponent } from 'react';
import { isChunkOrModuleLoadError, reportProductionError } from '../lib/errorMonitoring';

const CHUNK_RECOVERY_STORAGE_KEY = 'edutrack_chunk_recovery_v1';
const CHUNK_RECOVERY_COOLDOWN_MS = 30_000;

export interface ChunkRecoveryState {
  path: string;
  timestamp: number;
  count: number;
}

/**
 * Checks whether we can safely attempt a single controlled page reload to fetch the
 * latest deployment's index.html & asset manifest without ever entering an infinite loop.
 */
export function canAttemptChunkReload(currentPath?: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;
    const path = currentPath ?? window.location.pathname;
    const raw = window.sessionStorage.getItem(CHUNK_RECOVERY_STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as ChunkRecoveryState;
    const elapsed = Date.now() - (parsed.timestamp || 0);
    // Allow recovery if cooldown elapsed or if user navigated to a different route and count < 1
    if (elapsed > CHUNK_RECOVERY_COOLDOWN_MS) {
      return true;
    }
    if (parsed.path === path && parsed.count >= 1) {
      return false;
    }
    return parsed.count < 1;
  } catch {
    return false;
  }
}

/**
 * Records a chunk reload attempt in sessionStorage so we never loop.
 */
export function recordChunkReloadAttempt(currentPath?: string): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    const path = currentPath ?? window.location.pathname;
    const state: ChunkRecoveryState = {
      path,
      timestamp: Date.now(),
      count: 1,
    };
    window.sessionStorage.setItem(CHUNK_RECOVERY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / security errors
  }
}

/**
 * Clears chunk recovery lock once the app has stayed stable after navigation/boot.
 */
export function clearChunkReloadState(): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.removeItem(CHUNK_RECOVERY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Performs a clean cache-busting reload (at most once per cooldown window) and purges
 * any stale Service Worker dynamic caches that might hold outdated asset references.
 */
export async function performBoundedChunkRecovery(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!canAttemptChunkReload(window.location.pathname)) {
    return false;
  }

  recordChunkReloadAttempt(window.location.pathname);

  try {
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.includes('dynamic') || key.includes('workbox'))
          .map((key) => window.caches.delete(key))
      );
    }
  } catch {
    // Non-fatal
  }

  const url = new URL(window.location.href);
  url.searchParams.set('_v', Date.now().toString(36));
  window.location.replace(url.toString());
  return true;
}

/**
 * Wraps dynamic `import()` with:
 * 1. Immediate retry after 350ms for transient mobile network blips.
 * 2. Detection of Vercel deployment chunk mismatches (`Failed to fetch dynamically imported module`)
 *    with a bounded single-attempt recovery reload.
 */
export async function importWithRetry<T>(
  importer: () => Promise<T>,
  moduleName = 'lazy-module'
): Promise<T> {
  try {
    return await importer();
  } catch (firstError) {
    // Wait briefly and retry once in case of a brief mobile connection drop
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      return await importer();
    } catch (secondError) {
      if (isChunkOrModuleLoadError(secondError)) {
        void reportProductionError(secondError, {
          category: 'CHUNK_LOAD_ERROR',
          section: `lazyWithRetry:${moduleName}`,
        });
        const reloading = await performBoundedChunkRecovery();
        if (reloading) {
          // Return a pending promise while the browser navigates to the fresh bundle
          return new Promise<T>(() => {});
        }
      }
      throw secondError;
    }
  }
}

/**
 * Drop-in replacement for `React.lazy()` that handles transient network drops and
 * post-deployment chunk hash changes gracefully.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  moduleName = 'route-chunk'
): LazyExoticComponent<T> {
  return React.lazy(() => importWithRetry(importer, moduleName));
}

let chunkHandlersInstalled = false;

/**
 * Installs global listener for Vite's `vite:preloadError` event so CSS/JS preload failures
 * during route transitions don't crash the React tree with an uncaught exception.
 */
export function installChunkErrorHandlers(): void {
  if (typeof window === 'undefined' || chunkHandlersInstalled) return;
  chunkHandlersInstalled = true;

  window.addEventListener('vite:preloadError', (event: Event) => {
    const anyEvent = event as Event & { payload?: unknown };
    const errorPayload = anyEvent?.payload ?? new Error('Vite preload error');
    // Prevent Vite from throwing an unhandled error when we can recover
    event.preventDefault();
    void reportProductionError(errorPayload, {
      category: 'CHUNK_LOAD_ERROR',
      section: 'vite:preloadError',
    });
    void performBoundedChunkRecovery();
  });
}

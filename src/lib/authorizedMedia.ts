import { auth } from './firebase';

interface CachedPhotoEntry {
  blobUrl: string;
  viewerUid: string;
  tutorId: string;
  version: string;
}

const photoCache = new Map<string, CachedPhotoEntry>();
const inFlightRequests = new Map<string, Promise<string | null>>();
const cacheListeners = new Set<(tutorId?: string) => void>();

export function isAuthorizedProxyPhotoUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.trim().startsWith('/api/media/tutor-photo/');
}

export function parseAuthorizedProxyPhotoUrl(
  url: string
): { tutorId: string; version: string } | null {
  if (!isAuthorizedProxyPhotoUrl(url)) return null;
  try {
    const parsed = new URL(url.trim(), 'https://edutrack.local');
    const parts = parsed.pathname.split('/').filter(Boolean);
    const tutorId = parts[3] ? decodeURIComponent(parts[3]) : '';
    if (!tutorId) return null;
    const version = parsed.searchParams.get('v') || '0';
    return { tutorId, version };
  } catch {
    return null;
  }
}

function buildCacheKey(viewerUid: string, tutorId: string, version?: string | number | null): string {
  const v = version !== undefined && version !== null && String(version).trim() !== '' ? String(version).trim() : '0';
  return `${viewerUid}::${tutorId}::${v}`;
}

export function subscribeAuthorizedPhotoCache(listener: (tutorId?: string) => void): () => void {
  cacheListeners.add(listener);
  return () => {
    cacheListeners.delete(listener);
  };
}

function notifyCacheChange(tutorId?: string) {
  cacheListeners.forEach((fn) => {
    try {
      fn(tutorId);
    } catch {}
  });
}

export function getCachedAuthorizedPhotoUrl(
  tutorId: string,
  version?: string | number | null
): string | null {
  const uid = auth.currentUser?.uid;
  if (!uid || !tutorId) return null;
  const key = buildCacheKey(uid, tutorId, version);
  const direct = photoCache.get(key);
  if (direct) return direct.blobUrl;

  if (version === undefined || version === null || version === '') {
    for (const entry of photoCache.values()) {
      if (entry.viewerUid === uid && entry.tutorId === tutorId) {
        return entry.blobUrl;
      }
    }
  }
  return null;
}

export function clearAuthorizedPhotoCache(tutorId?: string): void {
  let changed = false;
  for (const [key, entry] of Array.from(photoCache.entries())) {
    if (!tutorId || entry.tutorId === tutorId) {
      try {
        URL.revokeObjectURL(entry.blobUrl);
      } catch {}
      photoCache.delete(key);
      changed = true;
    }
  }
  if (!tutorId) {
    inFlightRequests.clear();
  } else {
    for (const key of Array.from(inFlightRequests.keys())) {
      if (key.includes(`::${tutorId}::`)) {
        inFlightRequests.delete(key);
      }
    }
  }
  if (changed) {
    notifyCacheChange(tutorId);
  }
}

export async function fetchAuthorizedTutorPhoto(
  tutorId: string,
  version?: string | number | null
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const currentUser = auth.currentUser;
  if (!currentUser || !tutorId) return null;

  const viewerUid = currentUser.uid;
  const vStr = version !== undefined && version !== null && String(version).trim() !== '' ? String(version).trim() : '0';
  const cacheKey = buildCacheKey(viewerUid, tutorId, vStr);

  const cached = photoCache.get(cacheKey);
  if (cached) {
    return cached.blobUrl;
  }

  const existingPromise = inFlightRequests.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async (): Promise<string | null> => {
    try {
      const idToken = await currentUser.getIdToken();
      if (!idToken) return null;

      // Ensure account did not switch mid-flight
      if (auth.currentUser?.uid !== viewerUid) return null;

      const query = vStr !== '0' ? `?v=${encodeURIComponent(vStr)}` : '';
      const res = await fetch(`/api/media/tutor-photo/${encodeURIComponent(tutorId)}${query}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          clearAuthorizedPhotoCache(tutorId);
        }
        return null;
      }

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!contentType.startsWith('image/')) {
        return null;
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0 || auth.currentUser?.uid !== viewerUid) {
        return null;
      }

      // Revoke older cached versions for this tutor + viewer before storing latest
      for (const [k, existing] of Array.from(photoCache.entries())) {
        if (existing.viewerUid === viewerUid && existing.tutorId === tutorId && k !== cacheKey) {
          try {
            URL.revokeObjectURL(existing.blobUrl);
          } catch {}
          photoCache.delete(k);
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      photoCache.set(cacheKey, {
        blobUrl,
        viewerUid,
        tutorId,
        version: vStr,
      });
      notifyCacheChange(tutorId);
      return blobUrl;
    } catch {
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

import React, { useEffect, useState } from 'react';
import {
  fetchAuthorizedTutorPhoto,
  getCachedAuthorizedPhotoUrl,
  isAuthorizedProxyPhotoUrl,
  parseAuthorizedProxyPhotoUrl,
} from '../lib/authorizedMedia';

export function isValidAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'none' || lower === 'n/a') {
    return false;
  }
  if (trimmed.startsWith('/')) return true;
  if (lower.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getAvatarInitials(name?: string | null, fallback = 'ET'): string {
  const cleaned = (name || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return fallback;
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts
    .slice(0, 3)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  locked?: boolean;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  textClassName?: string;
  loading?: 'lazy' | 'eager';
  isOnline?: boolean;
  onlineDotClassName?: string;
  children?: React.ReactNode;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  locked = false,
  className = 'w-12 h-12 rounded-2xl',
  imgClassName = 'w-full h-full object-cover',
  fallbackClassName = 'bg-gradient-to-br from-[#0B132B] to-[#1E3A8A] text-white',
  textClassName = 'text-sm font-black tracking-tight',
  loading = 'lazy',
  isOnline = false,
  onlineDotClassName = 'w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111A2E]',
  children,
}) => {
  const [hasError, setHasError] = useState(false);
  const [authorizedBlobSrc, setAuthorizedBlobSrc] = useState<string | null>(() => {
    if (locked || !src || !isAuthorizedProxyPhotoUrl(src)) return null;
    const parsed = parseAuthorizedProxyPhotoUrl(src);
    return parsed ? getCachedAuthorizedPhotoUrl(parsed.tutorId, parsed.version) : null;
  });

  const isProxySrc = !locked && Boolean(src && isAuthorizedProxyPhotoUrl(src));

  useEffect(() => {
    setHasError(false);

    if (locked || !src || !isAuthorizedProxyPhotoUrl(src)) {
      setAuthorizedBlobSrc(null);
      return;
    }

    const parsed = parseAuthorizedProxyPhotoUrl(src);
    if (!parsed) {
      setAuthorizedBlobSrc(null);
      return;
    }

    const immediate = getCachedAuthorizedPhotoUrl(parsed.tutorId, parsed.version);
    if (immediate) {
      setAuthorizedBlobSrc(immediate);
      return;
    }

    let cancelled = false;
    setAuthorizedBlobSrc(null);
    fetchAuthorizedTutorPhoto(parsed.tutorId, parsed.version).then((blobUrl) => {
      if (!cancelled) {
        if (blobUrl) {
          setAuthorizedBlobSrc(blobUrl);
        } else {
          setHasError(true);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src, locked]);

  const effectiveSrc = locked
    ? null
    : isProxySrc
    ? authorizedBlobSrc
    : isValidAvatarUrl(src)
    ? src!.trim()
    : null;

  const showImage = !locked && !hasError && Boolean(effectiveSrc);
  const displayName = (name || 'EduTrack User').trim();
  const initials = getAvatarInitials(displayName);

  return (
    <div
      className={`relative overflow-hidden shrink-0 select-none ${className}`}
      role="img"
      aria-label={displayName}
    >
      {showImage ? (
        <img
          src={effectiveSrc!}
          alt=""
          className={imgClassName}
          referrerPolicy="no-referrer"
          loading={loading}
          decoding="async"
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          aria-hidden="true"
          className={`w-full h-full flex items-center justify-center ${fallbackClassName}`}
        >
          <span className={textClassName}>{initials}</span>
        </div>
      )}

      {isOnline && (
        <span
          aria-label="Online"
          title="Online now"
          className={`absolute bottom-1 right-1 ${onlineDotClassName}`}
        />
      )}

      {children}
    </div>
  );
};

export default UserAvatar;

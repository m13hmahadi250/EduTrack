import { useEffect, useRef } from 'react';

/**
 * Intercepts hardware Android Back button (`popstate`) and `Escape` key
 * when a modal, drawer, or bottom sheet is open so users close overlays smoothly
 * instead of exiting the WebView or losing page context.
 */
export function useBackHandler(isOpen: boolean, onClose: () => void, stateKey = 'overlay') {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      pushedRef.current = false;
      return;
    }

    const marker = { edutrackOverlay: stateKey, ts: Date.now() };
    try {
      window.history.pushState(marker, '');
      pushedRef.current = true;
    } catch {
      pushedRef.current = false;
    }

    const handlePopState = () => {
      pushedRef.current = false;
      onCloseRef.current();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      if (pushedRef.current) {
        pushedRef.current = false;
        try {
          if (window.history.state?.edutrackOverlay === stateKey) {
            window.history.back();
          }
        } catch {
          // Ignore history errors in restricted iframes
        }
      }
    };
  }, [isOpen, stateKey]);
}

/**
 * Scrolls focused input into center view on small screens / Android WebViews
 * after the virtual keyboard opens so fields and CTA buttons aren't occluded.
 */
export function scrollFieldIntoView(element: HTMLElement | null) {
  if (!element || typeof window === 'undefined') return;
  if (window.innerWidth > 1024) return;
  setTimeout(() => {
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } catch {
      // Fallback for older WebViews
      element.scrollIntoView(true);
    }
  }, 220);
}

/**
 * Safe bridge wrapper for Android WebView JavaScriptInterface calls.
 */
export function isAndroidWebView(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).AndroidInterface) || /wv\)/.test(navigator.userAgent);
}

export function triggerNativeToastOrNotification(title: string, message: string): boolean {
  if (typeof window === 'undefined') return false;
  const androidBridge = (window as any).AndroidInterface;
  if (androidBridge && typeof androidBridge.showNotification === 'function') {
    try {
      androidBridge.showNotification(title, message);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

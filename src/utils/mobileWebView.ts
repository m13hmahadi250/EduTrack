import { useEffect, useRef, useState } from 'react';
import type { FocusEvent } from 'react';

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
 * Detects when a mobile virtual keyboard is open (either via visualViewport resize
 * or focus on a text-entry control on narrow/touch viewports) so fixed bottom docks
 * can gracefully hide instead of covering active fields and CTA buttons.
 */
export function useVirtualKeyboardOpen(): boolean {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isTextEntryElement = (el: Element | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (tag === 'INPUT') {
        const inputType = ((el as HTMLInputElement).type || 'text').toLowerCase();
        return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(inputType);
      }
      return false;
    };

    let baselineHeight = window.visualViewport?.height || window.innerHeight;

    const evaluate = () => {
      const isNarrowViewport = window.innerWidth < 1024;
      if (!isNarrowViewport) {
        setIsKeyboardOpen(false);
        return;
      }

      const activeFocused = isTextEntryElement(document.activeElement);
      const vvHeight = window.visualViewport?.height || window.innerHeight;
      if (vvHeight > baselineHeight) {
        baselineHeight = vvHeight;
      }
      const heightReducedByKeyboard = baselineHeight - vvHeight > 120;
      setIsKeyboardOpen(activeFocused || heightReducedByKeyboard);
    };

    const handleFocusIn = () => {
      evaluate();
    };

    const handleFocusOut = () => {
      setTimeout(evaluate, 90);
    };

    const handleResize = () => {
      if (window.innerHeight > baselineHeight) {
        baselineHeight = window.innerHeight;
      }
      evaluate();
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return isKeyboardOpen;
}

/**
 * Scrolls focused input into center view on small screens / Android WebViews
 * after the virtual keyboard opens so fields and CTA buttons aren't occluded.
 */
export function scrollFieldIntoView(target: HTMLElement | FocusEvent<HTMLElement> | null) {
  if (!target || typeof window === 'undefined') return;
  const element = target instanceof HTMLElement ? target : target.currentTarget;
  if (!element || window.innerWidth > 1024) return;
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

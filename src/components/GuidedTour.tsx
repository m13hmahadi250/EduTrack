import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Compass, X } from 'lucide-react';
import { useAppStore } from '../store';
import ModalPortal from './ModalPortal';
import {
  TourTargetRect,
  computeMobileSheetPlacement,
  computePopoverPosition,
  computeSafeViewportInsets,
  computeScrollAdjustment,
  getQuickStartTourRole,
  getQuickStartTourSteps,
  resolveQuickStartTourStatus,
  scrollTargetIntoSafeViewport,
  shouldAutoStartQuickStartTour,
} from '../utils/onboardingTour';

type TourPhase = 'welcome' | 'tour';

interface ViewportMetrics {
  width: number;
  height: number;
  offsetTop: number;
}

const PRIMARY_TARGET_WAIT_MS = 850;
const POST_SCROLL_RECHECK_MS = 520;

function hasOpenBlockingDialog(): boolean {
  if (typeof document === 'undefined') return false;
  const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
  for (const node of Array.from(dialogs)) {
    if (node.getAttribute('data-tour-dialog') === 'true') continue;
    return true;
  }
  return false;
}

function isElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (!el.isConnected) return false;
  if (el.getClientRects().length === 0) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  return true;
}

function findFirstVisibleTarget(selectors?: string[]): HTMLElement | null {
  if (typeof document === 'undefined' || !selectors || selectors.length === 0) return null;
  for (const selector of selectors) {
    try {
      const matches = document.querySelectorAll(selector);
      for (const node of Array.from(matches)) {
        if (isElementVisible(node)) {
          return node as HTMLElement;
        }
      }
    } catch {
      // Ignore invalid selector edge cases
    }
  }
  return null;
}

function isSidebarFallbackSelector(selector: string): boolean {
  return selector.includes('sidebar-');
}

function getLiveViewportMetrics(): ViewportMetrics {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 800, offsetTop: 0 };
  }
  const vv = window.visualViewport;
  return {
    width: Math.round(vv?.width || window.innerWidth),
    height: Math.round(vv?.height || window.innerHeight),
    offsetTop: Math.round(vv?.offsetTop || 0),
  };
}

function measureStickyChromeHeights(viewportWidth: number): {
  mobileHeaderHeight: number;
  mobileBottomDockHeight: number;
} {
  if (typeof document === 'undefined' || viewportWidth >= 1024) {
    return { mobileHeaderHeight: 0, mobileBottomDockHeight: 0 };
  }
  const headerEl = document.querySelector<HTMLElement>('[data-dashboard-mobile-header="true"]');
  const dockEl = document.querySelector<HTMLElement>('[data-dashboard-bottom-dock="true"]');
  const headerH = headerEl && isElementVisible(headerEl) ? Math.round(headerEl.getBoundingClientRect().height) : 64;
  const dockH = dockEl && isElementVisible(dockEl) ? Math.round(dockEl.getBoundingClientRect().height) : 0;
  return {
    mobileHeaderHeight: headerH,
    mobileBottomDockHeight: dockH,
  };
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(root.querySelectorAll<HTMLElement>(selectors)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}

export default function GuidedTour() {
  const { currentUser, isInitialized, updateQuickStartTourState } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<TourPhase>('welcome');
  const [stepIndex, setStepIndex] = useState(0);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [targetRect, setTargetRect] = useState<TourTargetRect | null>(null);
  const [viewport, setViewport] = useState<ViewportMetrics>(getLiveViewportMetrics);
  const [chromeHeights, setChromeHeights] = useState(() =>
    measureStickyChromeHeights(typeof window !== 'undefined' ? window.innerWidth : 1280)
  );
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: 344,
    height: 224,
  });

  const autoPromptedUidRef = useRef<string | null>(null);
  const lastScrolledTargetRef = useRef<{ stepId: string; el: HTMLElement } | null>(null);
  const tourCardRef = useRef<HTMLDivElement | null>(null);
  const startTourBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const maskId = useId();
  const welcomeTitleId = useId();
  const welcomeDescId = useId();
  const stepTitleId = useId();
  const stepDescId = useId();

  const tourRole = useMemo(() => getQuickStartTourRole(currentUser), [currentUser]);
  const steps = useMemo(
    () => (tourRole ? getQuickStartTourSteps(tourRole) : []),
    [tourRole]
  );
  const activeStep = steps[stepIndex] || steps[0];

  // Mark active tour on document.body so Dashboard Class Cal pin redirects never interrupt onboarding
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isOpen && phase === 'tour') {
      document.body.dataset.edutrackTourActive = 'true';
    } else {
      delete document.body.dataset.edutrackTourActive;
    }
    return () => {
      delete document.body.dataset.edutrackTourActive;
    };
  }, [isOpen, phase]);

  // Reset per-session auto-prompt guard on logout or user switch
  useEffect(() => {
    if (!currentUser) {
      autoPromptedUidRef.current = null;
      setIsOpen(false);
      setIsReplayMode(false);
      return;
    }
    if (autoPromptedUidRef.current && autoPromptedUidRef.current !== currentUser.id) {
      autoPromptedUidRef.current = null;
      setIsOpen(false);
      setIsReplayMode(false);
    }
  }, [currentUser]);

  // Track visualViewport & orientation changes reliably (Android WebView, iOS, desktop resize)
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const syncViewport = () => {
      const next = getLiveViewportMetrics();
      setViewport((prev) =>
        prev.width === next.width && prev.height === next.height && prev.offsetTop === next.offsetTop
          ? prev
          : next
      );
      const chrome = measureStickyChromeHeights(next.width);
      setChromeHeights((prev) =>
        prev.mobileHeaderHeight === chrome.mobileHeaderHeight &&
        prev.mobileBottomDockHeight === chrome.mobileBottomDockHeight
          ? prev
          : chrome
      );
    };

    syncViewport();
    window.addEventListener('resize', syncViewport, { passive: true });
    window.addEventListener('orientationchange', syncViewport, { passive: true });
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      window.visualViewport?.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('scroll', syncViewport);
    };
  }, [isOpen]);

  // Measure live tour card dimensions with ResizeObserver so popovers/sheets never clip or overlap
  useEffect(() => {
    if (!isOpen || phase !== 'tour') return;
    const card = tourCardRef.current;
    if (!card) return;

    const updateCardSize = () => {
      const rect = card.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nextW = Math.round(rect.width);
      const nextH = Math.round(rect.height);
      setCardSize((prev) =>
        prev.width === nextW && prev.height === nextH ? prev : { width: nextW, height: nextH }
      );
    };

    updateCardSize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateCardSize);
    observer.observe(card);
    return () => observer.disconnect();
  }, [isOpen, phase, stepIndex, viewport.width]);

  // Auto-trigger once on first authenticated dashboard visit when eligible
  useEffect(() => {
    if (!currentUser || !tourRole) return;
    if (isOpen) return;

    const eligible = shouldAutoStartQuickStartTour({
      isInitialized,
      user: currentUser,
      pathname: location.pathname,
      hasOpenModal: hasOpenBlockingDialog(),
      alreadyAutoPromptedForUid: autoPromptedUidRef.current,
    });

    if (!eligible) return;

    const timer = window.setTimeout(() => {
      if (hasOpenBlockingDialog()) return;
      const recheck = shouldAutoStartQuickStartTour({
        isInitialized: useAppStore.getState().isInitialized,
        user: useAppStore.getState().currentUser,
        pathname: window.location.pathname,
        hasOpenModal: hasOpenBlockingDialog(),
        alreadyAutoPromptedForUid: autoPromptedUidRef.current,
      });
      if (!recheck) return;

      autoPromptedUidRef.current = currentUser.id;
      setIsReplayMode(false);
      setPhase('welcome');
      setStepIndex(0);
      setIsOpen(true);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [currentUser, tourRole, isInitialized, location.pathname, isOpen]);

  // Listen to manual replay requests from Dashboard header or Navbar profile menu
  useEffect(() => {
    const handleStartTour = (event: Event) => {
      const storeUser = useAppStore.getState().currentUser;
      const role = getQuickStartTourRole(storeUser);
      if (!storeUser || !role) return;

      const custom = event as CustomEvent<{ replay?: boolean }>;
      const statusCheck = resolveQuickStartTourStatus(storeUser);
      const replay =
        Boolean(custom.detail?.replay) || !statusCheck.isEligibleForAutoStart;

      setIsReplayMode(replay);
      setPhase('welcome');
      setStepIndex(0);
      setIsOpen(true);
    };

    window.addEventListener('start-edutrack-tour', handleStartTour);
    return () => window.removeEventListener('start-edutrack-tour', handleStartTour);
  }, []);

  const persistIfFirstRun = useCallback(
    (status: 'in_progress' | 'dismissed' | 'completed') => {
      if (!currentUser) return;
      if (isReplayMode) {
        // Replaying an already completed/dismissed tour must never re-enable auto-popup
        return;
      }
      updateQuickStartTourState(status);
    },
    [currentUser, isReplayMode, updateQuickStartTourState]
  );

  const handleCloseTour = useCallback(
    (reason: 'dismissed' | 'completed') => {
      setIsOpen(false);
      setTargetRect(null);
      lastScrolledTargetRef.current = null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('edutrack-tour-drawer', { detail: { open: false } }));
        window.dispatchEvent(
          new CustomEvent('edutrack-tour-student-ui', { detail: { closeFilters: true } })
        );
      }
      persistIfFirstRun(reason);
    },
    [persistIfFirstRun]
  );

  const handleStartWalkthrough = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.edutrackTourActive = 'true';
    }
    persistIfFirstRun('in_progress');
    lastScrolledTargetRef.current = null;
    setTargetRect(null);
    setStepIndex(0);
    setPhase('tour');
  }, [persistIfFirstRun]);

  const handleNext = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setTargetRect(null);
      setStepIndex((prev) => prev + 1);
    } else {
      handleCloseTour('completed');
    }
  }, [stepIndex, steps.length, handleCloseTour]);

  const handleBack = useCallback(() => {
    if (stepIndex > 0) {
      setTargetRect(null);
      setStepIndex((prev) => prev - 1);
    }
  }, [stepIndex]);

  // Coordinate route navigation, subtabs, mobile drawers, async primary wait, smooth safe scroll, and tracking
  useEffect(() => {
    if (!isOpen || phase !== 'tour' || !activeStep || !tourRole) {
      setTargetRect(null);
      return;
    }

    // Close mobile sidebar drawer & mobile filter sheets on step entry unless explicitly requested later
    window.dispatchEvent(new CustomEvent('edutrack-tour-drawer', { detail: { open: false } }));
    window.dispatchEvent(
      new CustomEvent('edutrack-tour-student-ui', { detail: { closeFilters: true } })
    );

    const navConfig = activeStep.navigateTo;
    if (navConfig?.path && location.pathname !== navConfig.path) {
      navigate(navConfig.path, { state: { fromTour: true } });
    }

    const dispatchSubTab = () => {
      if (!navConfig?.marketplaceSubTab) return;
      window.dispatchEvent(
        new CustomEvent('edutrack-tour-marketplace-subtab', {
          detail: {
            mode: tourRole === 'tutor' ? 'tutor' : 'student',
            subTab: navConfig.marketplaceSubTab,
          },
        })
      );
    };

    dispatchSubTab();
    const subTabRetry1 = window.setTimeout(dispatchSubTab, 120);
    const subTabRetry2 = window.setTimeout(dispatchSubTab, 340);
    const subTabRetry3 = window.setTimeout(dispatchSubTab, 620);

    const stepEnteredAt = Date.now();
    let disposed = false;
    let rafId = 0;
    let drawerRequested = false;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let observedTarget: HTMLElement | null = null;
    let postScrollRecheckTimer: number | null = null;

    const getCurrentSafeInsets = () => {
      const vp = getLiveViewportMetrics();
      const chrome = measureStickyChromeHeights(vp.width);
      const cardRect = tourCardRef.current?.getBoundingClientRect();
      return computeSafeViewportInsets(vp, {
        mobileHeaderHeight: chrome.mobileHeaderHeight,
        mobileBottomDockHeight: chrome.mobileBottomDockHeight,
        mobileTourCardHeight: cardRect?.height || cardSize.height,
      });
    };

    const resolveStepTarget = (): HTMLElement | null => {
      const primaryEl = findFirstVisibleTarget(activeStep.targetSelectors);
      if (primaryEl) return primaryEl;

      // Allow lazy routes/chunks (e.g. TuitionMarketplaceHub) time to mount before using fallbacks
      if (Date.now() - stepEnteredAt < PRIMARY_TARGET_WAIT_MS) {
        return null;
      }

      const fallbackEl = findFirstVisibleTarget(activeStep.fallbackSelectors);
      if (fallbackEl) return fallbackEl;

      const vp = getLiveViewportMetrics();
      const needsDrawerFallback =
        vp.width < 1024 &&
        (activeStep.requiresMobileDrawer ||
          (activeStep.fallbackSelectors || []).some(isSidebarFallbackSelector));

      if (needsDrawerFallback && !drawerRequested) {
        drawerRequested = true;
        window.dispatchEvent(new CustomEvent('edutrack-tour-drawer', { detail: { open: true } }));
      }
      return null;
    };

    const measureTarget = () => {
      if (disposed) return;

      const vp = getLiveViewportMetrics();
      setViewport((prev) =>
        prev.width === vp.width && prev.height === vp.height && prev.offsetTop === vp.offsetTop
          ? prev
          : vp
      );
      const chrome = measureStickyChromeHeights(vp.width);
      setChromeHeights((prev) =>
        prev.mobileHeaderHeight === chrome.mobileHeaderHeight &&
        prev.mobileBottomDockHeight === chrome.mobileBottomDockHeight
          ? prev
          : chrome
      );

      const el = resolveStepTarget();
      if (!el) {
        setTargetRect(null);
        return;
      }

      if (observedTarget !== el) {
        observedTarget = el;
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver.observe(el);
        }
      }

      const prevScroll = lastScrolledTargetRef.current;
      if (!prevScroll || prevScroll.stepId !== activeStep.id || prevScroll.el !== el) {
        lastScrolledTargetRef.current = { stepId: activeStep.id, el };
        const safeInsets = getCurrentSafeInsets();
        const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
        scrollTargetIntoSafeViewport(el, safeInsets, scrollBehavior);

        if (postScrollRecheckTimer !== null) {
          window.clearTimeout(postScrollRecheckTimer);
        }
        postScrollRecheckTimer = window.setTimeout(() => {
          if (disposed || !el.isConnected) return;
          const liveVp = getLiveViewportMetrics();
          const latestInsets = getCurrentSafeInsets();
          const recheckRect = el.getBoundingClientRect();
          const adj = computeScrollAdjustment(
            recheckRect,
            { top: 0, left: 0, width: liveVp.width, height: liveVp.height },
            latestInsets,
            14
          );
          if (!adj.isAlreadyComfortablyVisible) {
            scrollTargetIntoSafeViewport(el, latestInsets, scrollBehavior);
          }
        }, prefersReducedMotion ? 120 : POST_SCROLL_RECHECK_MS);
      }

      const rect = el.getBoundingClientRect();
      const nextTop = Math.round(rect.top);
      const nextLeft = Math.round(rect.left);
      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);

      setTargetRect((prev) => {
        if (
          prev &&
          prev.top === nextTop &&
          prev.left === nextLeft &&
          prev.width === nextWidth &&
          prev.height === nextHeight
        ) {
          return prev;
        }
        return {
          top: nextTop,
          left: nextLeft,
          width: nextWidth,
          height: nextHeight,
        };
      });
    };

    const scheduleMeasure = () => {
      if (disposed) return;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(measureTarget);
    };

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
    }
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(scheduleMeasure);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
      });
    }

    scheduleMeasure();
    const settle1 = window.setTimeout(scheduleMeasure, 160);
    const settle2 = window.setTimeout(scheduleMeasure, 380);
    const settle3 = window.setTimeout(scheduleMeasure, 650);
    const fallbackTick = window.setTimeout(scheduleMeasure, PRIMARY_TARGET_WAIT_MS + 30);
    const drawerSettle = window.setTimeout(scheduleMeasure, PRIMARY_TARGET_WAIT_MS + 260);

    window.addEventListener('resize', scheduleMeasure, { passive: true });
    window.addEventListener('scroll', scheduleMeasure, true);
    window.addEventListener('scrollend', scheduleMeasure, true);

    return () => {
      disposed = true;
      window.clearTimeout(subTabRetry1);
      window.clearTimeout(subTabRetry2);
      window.clearTimeout(subTabRetry3);
      window.clearTimeout(settle1);
      window.clearTimeout(settle2);
      window.clearTimeout(settle3);
      window.clearTimeout(fallbackTick);
      window.clearTimeout(drawerSettle);
      if (postScrollRecheckTimer !== null) window.clearTimeout(postScrollRecheckTimer);
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
      window.removeEventListener('scrollend', scheduleMeasure, true);
    };
  }, [
    isOpen,
    phase,
    activeStep,
    tourRole,
    location.pathname,
    navigate,
    prefersReducedMotion,
    cardSize.height,
  ]);

  // Focus trap, Escape, ArrowRight/ArrowLeft shortcuts, and focus restoration during spotlight phase
  useEffect(() => {
    if (!isOpen || phase !== 'tour' || typeof document === 'undefined') return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const rafFocus = window.requestAnimationFrame(() => {
      const card = tourCardRef.current;
      if (!card) return;
      const focusables = getFocusableElements(card);
      if (focusables.length > 0) {
        const primaryBtn = focusables[focusables.length - 1];
        primaryBtn.focus({ preventScroll: true });
      } else {
        card.focus({ preventScroll: true });
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleCloseTour('dismissed');
        return;
      }

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (!isTyping && event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
        return;
      }
      if (!isTyping && event.key === 'ArrowLeft') {
        event.preventDefault();
        handleBack();
        return;
      }

      if (event.key === 'Tab') {
        const card = tourCardRef.current;
        if (!card) return;
        const focusables = getFocusableElements(card);
        if (focusables.length === 0) {
          event.preventDefault();
          card.focus({ preventScroll: true });
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = document.activeElement;
        if (event.shiftKey) {
          if (current === first || current === card || !card.contains(current)) {
            event.preventDefault();
            last.focus({ preventScroll: true });
          }
        } else if (current === last || !card.contains(current)) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(rafFocus);
      document.removeEventListener('keydown', handleKeyDown, true);
      const prev = previousFocusRef.current;
      window.requestAnimationFrame(() => {
        if (prev && prev.isConnected) {
          prev.focus({ preventScroll: true });
        }
      });
    };
  }, [isOpen, phase, handleCloseTour, handleNext, handleBack]);

  if (!currentUser || !tourRole || steps.length === 0) return null;

  const isMobileViewport = viewport.width < 640;
  const spotlightPadding = 6;
  const cutoutRect = targetRect
    ? {
        top: Math.max(4, targetRect.top - spotlightPadding),
        left: Math.max(4, targetRect.left - spotlightPadding),
        width: Math.max(24, targetRect.width + spotlightPadding * 2),
        height: Math.max(24, targetRect.height + spotlightPadding * 2),
      }
    : null;

  const safeInsets = computeSafeViewportInsets(viewport, {
    mobileHeaderHeight: chromeHeights.mobileHeaderHeight,
    mobileBottomDockHeight: chromeHeights.mobileBottomDockHeight,
    mobileTourCardHeight: cardSize.height,
  });

  const desktopPopoverPos = computePopoverPosition(
    cutoutRect,
    viewport,
    { width: Math.min(344, Math.max(260, viewport.width - 32)), height: cardSize.height },
    16,
    safeInsets
  );

  const mobilePlacement = computeMobileSheetPlacement(
    cutoutRect,
    viewport,
    cardSize.height,
    chromeHeights.mobileHeaderHeight
  );

  const roleEyebrow =
    tourRole === 'tutor'
      ? 'Tutor Quick Guide'
      : tourRole === 'guardian'
      ? 'Guardian Quick Guide'
      : 'Student Quick Guide';

  const progressPct = Math.round(((stepIndex + 1) / steps.length) * 100);
  const motionOpacityClass = prefersReducedMotion ? '' : 'transition-opacity duration-200 ease-out';

  return (
    <>
      {/* Phase 1: Compact Welcome Dialog */}
      <ModalPortal
        isOpen={isOpen && phase === 'welcome'}
        onClose={() => handleCloseTour('dismissed')}
        level="top"
        labelledBy={welcomeTitleId}
        describedBy={welcomeDescId}
        initialFocusRef={startTourBtnRef}
        overlayClassName="bg-[#0B132B]/55 backdrop-blur-[2px] p-4"
      >
        <div
          data-tour-dialog="true"
          className={`w-full max-w-[420px] rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/90 dark:border-slate-700/80 shadow-[0_24px_64px_rgba(11,19,43,0.24)] p-6 sm:p-7 relative ${
            prefersReducedMotion ? '' : 'transition-all duration-200'
          }`}
        >
          <button
            type="button"
            onClick={() => handleCloseTour('dismissed')}
            aria-label="Close welcome dialog"
            className="absolute top-3.5 right-3.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5 mb-4 pr-10">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 text-[#0D5BFF] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0D5BFF] dark:text-blue-400">
                {roleEyebrow}
              </p>
              <h2
                id={welcomeTitleId}
                className="font-heading text-lg sm:text-xl font-extrabold text-[#0B132B] dark:text-white tracking-tight leading-snug"
              >
                Welcome to EduTrack
              </h2>
            </div>
          </div>

          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
            A quick guide to get you started.
          </p>

          <p
            id={welcomeDescId}
            lang="bn"
            className="font-bn text-[14px] sm:text-[15px] text-slate-700 dark:text-slate-200 leading-[1.7] mb-6"
          >
            EduTrack-এ স্বাগতম! কয়েকটি সহজ ধাপে আপনার Dashboard-এর গুরুত্বপূর্ণ ফিচারগুলো চিনে নিন।
          </p>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => handleCloseTour('dismissed')}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
            >
              Skip for Now
            </button>
            <button
              ref={startTourBtnRef}
              type="button"
              onClick={handleStartWalkthrough}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Start Tour</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Phase 2: Interactive Spotlight Walkthrough */}
      {isOpen &&
        phase === 'tour' &&
        activeStep &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-tour-dialog="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby={stepTitleId}
            aria-describedby={stepDescId}
            onClick={() => handleCloseTour('dismissed')}
            className="fixed inset-0 z-[1200] font-sans"
          >
            {/* Dimmed backdrop with smooth SVG spotlight cutout around target */}
            <svg
              aria-hidden="true"
              className="fixed inset-0 w-full h-full pointer-events-none"
            >
              <defs>
                <mask id={maskId}>
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {cutoutRect && (
                    <rect
                      x={cutoutRect.left}
                      y={cutoutRect.top}
                      width={cutoutRect.width}
                      height={cutoutRect.height}
                      rx="14"
                      ry="14"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(11, 19, 43, 0.58)"
                mask={`url(#${maskId})`}
              />
            </svg>

            {/* Compositor-synced Highlight Focus Ring (zero lag during smooth auto-scroll) */}
            {cutoutRect && (
              <div
                aria-hidden="true"
                className={`fixed top-0 left-0 pointer-events-none rounded-[14px] border-2 border-[#0D5BFF] will-change-transform ${motionOpacityClass}`}
                style={{
                  transform: `translate3d(${cutoutRect.left}px, ${cutoutRect.top}px, 0)`,
                  width: `${cutoutRect.width}px`,
                  height: `${cutoutRect.height}px`,
                  boxShadow: '0 0 0 4px rgba(13, 91, 255, 0.22)',
                }}
              />
            )}

            {/* Floating Popover (Desktop/Tablet) or Anti-Overlap Smart Sheet (Mobile) */}
            <div
              ref={tourCardRef}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              style={
                isMobileViewport
                  ? {
                      maxHeight: `${mobilePlacement.maxHeight}px`,
                      ...(mobilePlacement.dock === 'top'
                        ? { top: `${viewport.offsetTop + mobilePlacement.topOffset}px` }
                        : { bottom: `${mobilePlacement.bottomOffset}px` }),
                    }
                  : {
                      top: 0,
                      left: 0,
                      width: `${desktopPopoverPos.width}px`,
                      transform: `translate3d(${desktopPopoverPos.left}px, ${desktopPopoverPos.top}px, 0)`,
                    }
              }
              className={
                isMobileViewport
                  ? `fixed inset-x-2.5 sm:inset-x-3 overflow-y-auto rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(11,19,43,0.3)] p-4 pb-safe outline-none ${motionOpacityClass}`
                  : `fixed rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-700/80 shadow-[0_20px_50px_rgba(11,19,43,0.28)] p-5 outline-none will-change-transform ${motionOpacityClass}`
              }
            >
              {/* Thin Progress Track */}
              <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
                <div
                  className={`h-full bg-[#0D5BFF] rounded-full ${
                    prefersReducedMotion ? '' : 'transition-all duration-200 ease-out'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Header Row */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D5BFF] dark:text-blue-400 tabular-nums">
                  Step {stepIndex + 1} of {steps.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleCloseTour('dismissed')}
                  aria-label="Close tour"
                  className="-mr-2 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3
                id={stepTitleId}
                className="font-heading text-base sm:text-lg font-extrabold text-[#0B132B] dark:text-white tracking-tight mb-1.5"
              >
                {activeStep.title}
              </h3>

              <p
                id={stepDescId}
                lang="bn"
                className="font-bn text-[13.5px] sm:text-sm text-slate-600 dark:text-slate-300 leading-[1.65] mb-4"
              >
                {activeStep.descriptionBn}
              </p>

              {/* Controls Footer (wraps gracefully down to 320px width while preserving >= 44px touch targets) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCloseTour('dismissed')}
                    className="min-h-[44px] px-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Skip
                  </button>
                  {stepIndex > 0 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="min-h-[44px] px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[44px] px-4 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                >
                  <span>{stepIndex === steps.length - 1 ? 'Finish' : 'Next'}</span>
                  {stepIndex < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

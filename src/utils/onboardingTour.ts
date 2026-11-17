export type QuickStartTourStatus =
  | 'not_started'
  | 'in_progress'
  | 'dismissed'
  | 'completed';

export type QuickStartTourRole = 'student' | 'guardian' | 'tutor';

export interface QuickStartTourMeta {
  status: QuickStartTourStatus;
  role?: QuickStartTourRole | string;
  updatedAt?: string;
  completedAt?: string;
  dismissedAt?: string;
}

export interface UserOnboardingState {
  quickStartTour?: QuickStartTourMeta;
}

export interface OnboardingUserLike {
  id: string;
  role?: 'student' | 'tutor' | 'admin' | string;
  accountType?: 'student' | 'guardian' | string;
  isBlocked?: boolean;
  showTour?: boolean;
  onboarding?: UserOnboardingState;
}

export interface TourStepConfig {
  id: string;
  title: string;
  descriptionBn: string;
  targetSelectors: string[];
  fallbackSelectors?: string[];
  requiresMobileDrawer?: boolean;
  navigateTo?: {
    path: string;
    marketplaceSubTab?: 'browse' | 'post' | 'my_posts' | 'my_applications' | 'recommended';
  };
}

export interface TourTargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface SafeViewportInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ScrollAdjustmentResult {
  deltaX: number;
  deltaY: number;
  isAlreadyComfortablyVisible: boolean;
}

export interface PopoverPlacementResult {
  top: number;
  left: number;
  width: number;
  placement: 'bottom' | 'top' | 'right' | 'left' | 'center';
}

export interface MobileSheetPlacementResult {
  dock: 'bottom' | 'top';
  topOffset: number;
  bottomOffset: number;
  maxHeight: number;
}

const VALID_TOUR_STATUSES = new Set<QuickStartTourStatus>([
  'not_started',
  'in_progress',
  'dismissed',
  'completed',
]);

export function getLocalTourStatusStorageKey(uid: string): string {
  return `edutrack_tour_state_${uid}`;
}

export function getLegacyTourCompletedStorageKey(uid: string): string {
  return `edutrack_tour_completed_${uid}`;
}

export function readLocalQuickStartTourStatus(uid?: string | null): QuickStartTourStatus | null {
  if (!uid || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getLocalTourStatusStorageKey(uid));
    if (raw && VALID_TOUR_STATUSES.has(raw as QuickStartTourStatus)) {
      return raw as QuickStartTourStatus;
    }
    const legacy = window.localStorage.getItem(getLegacyTourCompletedStorageKey(uid));
    if (legacy === 'true') {
      return 'completed';
    }
  } catch {
    // Ignore storage access restrictions
  }
  return null;
}

export function writeLocalQuickStartTourStatus(uid: string, status: QuickStartTourStatus): void {
  if (!uid || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getLocalTourStatusStorageKey(uid), status);
    if (status === 'dismissed' || status === 'completed' || status === 'in_progress') {
      window.localStorage.setItem(getLegacyTourCompletedStorageKey(uid), 'true');
    } else if (status === 'not_started') {
      window.localStorage.removeItem(getLegacyTourCompletedStorageKey(uid));
    }
  } catch {
    // Ignore storage access restrictions
  }
}

export function getQuickStartTourRole(
  user?: OnboardingUserLike | null
): QuickStartTourRole | null {
  if (!user || user.isBlocked) return null;
  if (user.role === 'admin') return null;
  if (user.role === 'tutor') return 'tutor';
  if (user.role === 'student') {
    return user.accountType === 'guardian' ? 'guardian' : 'student';
  }
  return null;
}

export function resolveQuickStartTourStatus(
  user?: OnboardingUserLike | null,
  localStatusOverride?: QuickStartTourStatus | null
): {
  status: QuickStartTourStatus;
  isEligibleForAutoStart: boolean;
} {
  const role = getQuickStartTourRole(user);
  if (!user || !role) {
    return { status: 'dismissed', isEligibleForAutoStart: false };
  }

  const remoteStatus = user.onboarding?.quickStartTour?.status;
  const validRemoteStatus =
    remoteStatus && VALID_TOUR_STATUSES.has(remoteStatus) ? remoteStatus : undefined;
  const localStatus =
    localStatusOverride !== undefined
      ? localStatusOverride
      : readLocalQuickStartTourStatus(user.id);

  if (validRemoteStatus === 'completed' || localStatus === 'completed') {
    return { status: 'completed', isEligibleForAutoStart: false };
  }

  if (
    validRemoteStatus === 'dismissed' ||
    localStatus === 'dismissed' ||
    user.showTour === false
  ) {
    return { status: 'dismissed', isEligibleForAutoStart: false };
  }

  if (validRemoteStatus === 'in_progress' || localStatus === 'in_progress') {
    return { status: 'in_progress', isEligibleForAutoStart: false };
  }

  if (validRemoteStatus === 'not_started') {
    return { status: 'not_started', isEligibleForAutoStart: true };
  }

  if (user.showTour === true) {
    return { status: 'not_started', isEligibleForAutoStart: true };
  }

  return { status: 'dismissed', isEligibleForAutoStart: false };
}

export interface AutoStartGuardInput {
  isInitialized: boolean;
  user?: OnboardingUserLike | null;
  pathname: string;
  hasOpenModal?: boolean;
  alreadyAutoPromptedForUid?: string | null;
  localStatusOverride?: QuickStartTourStatus | null;
}

export function shouldAutoStartQuickStartTour(input: AutoStartGuardInput): boolean {
  if (!input.isInitialized || !input.user) return false;
  if (!input.pathname.startsWith('/dashboard')) return false;
  if (input.hasOpenModal) return false;
  if (input.alreadyAutoPromptedForUid === input.user.id) return false;

  const { isEligibleForAutoStart } = resolveQuickStartTourStatus(
    input.user,
    input.localStatusOverride
  );
  return isEligibleForAutoStart;
}

export function buildQuickStartTourPersistencePatch(
  user: OnboardingUserLike,
  status: QuickStartTourStatus,
  nowIso: string = new Date().toISOString()
): {
  showTour: boolean;
  onboarding: UserOnboardingState;
} {
  const resolvedRole = getQuickStartTourRole(user) || user.role || 'student';
  const prevMeta = user.onboarding?.quickStartTour;

  const nextMeta: QuickStartTourMeta = {
    ...(prevMeta || {}),
    status,
    role: resolvedRole,
    updatedAt: nowIso,
    ...(status === 'completed' ? { completedAt: nowIso } : {}),
    ...(status === 'dismissed' ? { dismissedAt: nowIso } : {}),
  };

  return {
    showTour: status === 'not_started',
    onboarding: {
      ...(user.onboarding || {}),
      quickStartTour: nextMeta,
    },
  };
}

export function getQuickStartTourSteps(role: QuickStartTourRole): TourStepConfig[] {
  if (role === 'tutor') {
    return [
      {
        id: 'complete-profile',
        title: 'Complete Your Profile',
        descriptionBn:
          'আপনার বিশ্ববিদ্যালয়, বিষয়, ক্লাস ও এলাকা ঠিকমতো যোগ করলে অভিভাবকেরা সহজেই আপনাকে খুঁজে পাবেন।',
        targetSelectors: [
          '[data-tour-id="tutor-profile-completion-card"]',
          '#tutor-tab-btn-pro_profile',
        ],
        fallbackSelectors: [
          '[data-tour-id="sidebar-pro_profile"]',
        ],
        navigateTo: { path: '/dashboard/profile' },
      },
      {
        id: 'identity-verification',
        title: 'Identity Verification',
        descriptionBn:
          'বিশ্বাসযোগ্যতা বাড়াতে প্রোফাইল থেকে আপনার NID অথবা বিশ্ববিদ্যালয়ের আইডি কার্ড যাচাইয়ের জন্য জমা দিন।',
        targetSelectors: [
          '[data-tour-id="tutor-verification-card"]',
          '#tutor-identity-verification-section',
        ],
        fallbackSelectors: [
          '[data-tour-id="sidebar-pro_profile"]',
        ],
        navigateTo: { path: '/dashboard/profile' },
      },
      {
        id: 'find-tuition',
        title: 'Find Tuition',
        descriptionBn:
          'আপনার বিষয় ও পছন্দের এলাকা অনুযায়ী প্রকাশিত টিউশন সার্কুলার দেখে সরাসরি আবেদন করুন।',
        targetSelectors: [
          '[data-tour-id="tutor-browse-tuitions-btn"]',
          '[data-tour-id="tutor-marketplace-hub"]',
        ],
        fallbackSelectors: [
          '#tutor-tab-btn-find_students',
          '[data-tour-id="sidebar-find_students"]',
        ],
        navigateTo: { path: '/dashboard/find-students', marketplaceSubTab: 'browse' },
      },
      {
        id: 'my-applications',
        title: 'My Applications',
        descriptionBn:
          'আপনি কোন কোন টিউশনে আবেদন করেছেন এবং ট্রায়াল বা কনফার্মেশন স্ট্যাটাস কী, তা এখান থেকেই দেখুন।',
        targetSelectors: [
          '[data-tour-id="tutor-my-applications-btn"]',
          '[data-tour-id="tutor-tuition-pipeline"]',
          '[data-tour-id="tutor-marketplace-hub"]',
        ],
        fallbackSelectors: [
          '#tutor-tab-btn-my_session',
          '[data-tour-id="sidebar-my_session"]',
        ],
        navigateTo: { path: '/dashboard/find-students', marketplaceSubTab: 'my_applications' },
      },
    ];
  }

  const isGuardian = role === 'guardian';

  return [
    {
      id: 'find-tutor',
      title: 'Find a Tutor',
      descriptionBn: isGuardian
        ? 'আপনার সন্তানের ক্লাস, বিষয় ও এলাকা অনুযায়ী যাচাইকৃত শিক্ষক সহজেই খুঁজে নিন।'
        : 'আপনার ক্লাস, বিষয় ও এলাকা অনুযায়ী যাচাইকৃত শিক্ষক সহজেই খুঁজে নিন।',
      targetSelectors: [
        '[data-tour-id="student-find-tutor-controls"]',
        '[data-tour-id="student-find-tutor-filters"]',
        '[data-tour-id="student-find-tutor-tab"]',
        '#student-tab-btn-find',
      ],
      fallbackSelectors: [
        '[data-tour-id="sidebar-find"]',
      ],
      navigateTo: { path: '/dashboard/search' },
    },
    {
      id: 'post-tuition',
      title: 'Post Tuition',
      descriptionBn: isGuardian
        ? 'বিষয়, সময় ও মাসিক বেতন উল্লেখ করে সন্তানের জন্য একটি নতুন টিউশন পোস্ট প্রকাশ করুন।'
        : 'বিষয়, সময় ও মাসিক বেতন উল্লেখ করে আপনার প্রয়োজন অনুযায়ী নতুন টিউশন পোস্ট প্রকাশ করুন।',
      targetSelectors: [
        '[data-tour-id="student-post-tuition-btn"]',
        '[data-tour-id="student-marketplace-hub"]',
      ],
      fallbackSelectors: [
        '#student-tab-btn-overview',
        '[data-tour-id="sidebar-overview"]',
      ],
      navigateTo: { path: '/dashboard', marketplaceSubTab: 'post' },
    },
    {
      id: 'applications-requests',
      title: 'Applications & Requests',
      descriptionBn:
        'শিক্ষকদের আবেদন, পাঠানো রিকোয়েস্ট এবং ট্রায়াল ক্লাসের আপডেট এক জায়গা থেকেই পরিচালনা করুন।',
      targetSelectors: [
        '[data-tour-id="student-my-posts-btn"]',
        '#student-tuition-pipeline',
        '[data-tour-id="student-marketplace-hub"]',
      ],
      fallbackSelectors: [
        '#student-tab-btn-overview',
        '[data-tour-id="sidebar-overview"]',
      ],
      navigateTo: { path: '/dashboard', marketplaceSubTab: 'my_posts' },
    },
    {
      id: 'my-tuition',
      title: 'My Tuition',
      descriptionBn: isGuardian
        ? 'নিশ্চিত হওয়া টিউশন, সন্তানের ক্লাস ক্যালেন্ডার ও সেশনগুলোর তথ্য এখান থেকে নিয়মিত দেখুন।'
        : 'আপনার নিশ্চিত হওয়া টিউশন, ক্লাস ক্যালেন্ডার ও সেশনগুলোর তথ্য এখান থেকে নিয়মিত দেখুন।',
      targetSelectors: [
        '[data-tour-id="student-overview-metrics"]',
        '[data-tour-id="student-overview-tab"]',
        '#student-tab-btn-overview',
      ],
      fallbackSelectors: [
        '[data-tour-id="sidebar-overview"]',
      ],
      navigateTo: { path: '/dashboard' },
    },
  ];
}

export function computeSafeViewportInsets(
  viewport: { width: number; height: number },
  options?: {
    mobileHeaderHeight?: number;
    mobileBottomDockHeight?: number;
    mobileTourCardHeight?: number;
  }
): SafeViewportInsets {
  const isMobile = viewport.width < 640;
  const isTabletOrMobile = viewport.width < 1024;
  const headerH = isTabletOrMobile ? Math.max(0, options?.mobileHeaderHeight ?? 64) : 0;
  const dockH = isTabletOrMobile ? Math.max(0, options?.mobileBottomDockHeight ?? 72) : 0;

  if (isMobile) {
    const cardReserve = Math.min(
      Math.round(viewport.height * 0.45),
      Math.max(180, options?.mobileTourCardHeight ?? 215) + 20
    );
    return {
      top: headerH + 12,
      right: 12,
      bottom: Math.max(dockH + 12, cardReserve),
      left: 12,
    };
  }

  return {
    top: headerH + 20,
    right: 20,
    bottom: dockH + 20,
    left: 20,
  };
}

export function computeScrollAdjustment(
  targetRect: TourTargetRect,
  containerRect: TourTargetRect,
  safeInsets: SafeViewportInsets,
  comfortMargin: number = 14
): ScrollAdjustmentResult {
  const safeTop = containerRect.top + safeInsets.top;
  const safeBottom = containerRect.top + containerRect.height - safeInsets.bottom;
  const safeLeft = containerRect.left + safeInsets.left;
  const safeRight = containerRect.left + containerRect.width - safeInsets.right;

  const safeHeight = Math.max(80, safeBottom - safeTop);
  const safeWidth = Math.max(120, safeRight - safeLeft);

  const targetBottom = targetRect.top + targetRect.height;
  const targetRight = targetRect.left + targetRect.width;

  const fitsVerticallyComfortably =
    targetRect.height <= safeHeight
      ? targetRect.top >= safeTop + comfortMargin &&
        targetBottom <= safeBottom - comfortMargin
      : targetRect.top >= safeTop &&
        targetRect.top <= safeTop + comfortMargin * 2;

  const fitsHorizontallyComfortably =
    targetRect.width <= safeWidth
      ? targetRect.left >= safeLeft + 8 && targetRight <= safeRight - 8
      : targetRect.left >= safeLeft && targetRect.left <= safeLeft + 24;

  let deltaY = 0;
  if (!fitsVerticallyComfortably) {
    if (targetRect.height <= safeHeight) {
      const targetCenterY = targetRect.top + targetRect.height / 2;
      const safeCenterY = safeTop + safeHeight / 2;
      deltaY = Math.round(targetCenterY - safeCenterY);
    } else {
      deltaY = Math.round(targetRect.top - (safeTop + 12));
    }
  }

  let deltaX = 0;
  if (!fitsHorizontallyComfortably) {
    if (targetRect.width <= safeWidth) {
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const safeCenterX = safeLeft + safeWidth / 2;
      deltaX = Math.round(targetCenterX - safeCenterX);
    } else {
      deltaX = Math.round(targetRect.left - (safeLeft + 8));
    }
  }

  return {
    deltaX,
    deltaY,
    isAlreadyComfortablyVisible: Math.abs(deltaX) <= 2 && Math.abs(deltaY) <= 2,
  };
}

export function computeMobileSheetPlacement(
  targetRect: TourTargetRect | null,
  viewport: { width: number; height: number },
  cardHeight: number = 220,
  mobileHeaderHeight: number = 64
): MobileSheetPlacementResult {
  const safeTop = Math.max(12, mobileHeaderHeight + 10);
  const maxHeight = Math.max(180, Math.min(Math.round(viewport.height * 0.62), viewport.height - safeTop - 16));
  const effectiveCardH = Math.min(cardHeight, maxHeight);
  const bottomEdge = viewport.height - 12;
  const bottomCardTop = bottomEdge - effectiveCardH;

  if (!targetRect) {
    return {
      dock: 'bottom',
      topOffset: safeTop,
      bottomOffset: 12,
      maxHeight,
    };
  }

  const targetBottom = targetRect.top + targetRect.height;
  const overlapsBottomSheet = targetBottom > bottomCardTop - 10;

  if (!overlapsBottomSheet) {
    return {
      dock: 'bottom',
      topOffset: safeTop,
      bottomOffset: 12,
      maxHeight,
    };
  }

  const topCardBottom = safeTop + effectiveCardH;
  const overlapWithBottom = Math.max(0, targetBottom - bottomCardTop);
  const overlapWithTop = Math.max(0, topCardBottom - targetRect.top);

  if (overlapWithTop < overlapWithBottom) {
    return {
      dock: 'top',
      topOffset: safeTop,
      bottomOffset: 12,
      maxHeight,
    };
  }

  return {
    dock: 'bottom',
    topOffset: safeTop,
    bottomOffset: 12,
    maxHeight,
  };
}

export function computePopoverPosition(
  targetRect: TourTargetRect | null,
  viewport: { width: number; height: number },
  popoverSize: { width: number; height: number } = { width: 344, height: 224 },
  padding: number = 16,
  safeInsets?: Partial<SafeViewportInsets>
): PopoverPlacementResult {
  const leftInset = Math.max(padding, safeInsets?.left ?? padding);
  const rightInset = Math.max(padding, safeInsets?.right ?? padding);
  const topInset = Math.max(padding, safeInsets?.top ?? padding);
  const bottomInset = Math.max(padding, safeInsets?.bottom ?? padding);

  const availWidth = Math.max(240, viewport.width - leftInset - rightInset);
  const availHeight = Math.max(160, viewport.height - topInset - bottomInset);
  const maxWidth = Math.min(popoverSize.width, availWidth);
  const estHeight = Math.min(popoverSize.height, availHeight);

  if (!targetRect || viewport.width < 640) {
    return {
      top: Math.max(topInset, Math.round(topInset + (availHeight - estHeight) / 2)),
      left: Math.max(leftInset, Math.round(leftInset + (availWidth - maxWidth) / 2)),
      width: maxWidth,
      placement: 'center',
    };
  }

  const gap = 14;
  const maxLeft = Math.max(leftInset, viewport.width - maxWidth - rightInset);
  const maxTop = Math.max(topInset, viewport.height - estHeight - bottomInset);
  const clampLeft = (idealLeft: number) => Math.min(Math.max(leftInset, idealLeft), maxLeft);
  const clampTop = (idealTop: number) => Math.min(Math.max(topInset, idealTop), maxTop);

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  const candidates: Array<{
    placement: 'bottom' | 'top' | 'right' | 'left';
    top: number;
    left: number;
    fits: boolean;
    availableSpace: number;
  }> = [
    {
      placement: 'bottom',
      top: Math.round(targetRect.top + targetRect.height + gap),
      left: Math.round(clampLeft(targetCenterX - maxWidth / 2)),
      fits: viewport.height - bottomInset - (targetRect.top + targetRect.height) >= estHeight + gap,
      availableSpace: viewport.height - bottomInset - (targetRect.top + targetRect.height),
    },
    {
      placement: 'top',
      top: Math.round(targetRect.top - estHeight - gap),
      left: Math.round(clampLeft(targetCenterX - maxWidth / 2)),
      fits: targetRect.top - topInset >= estHeight + gap,
      availableSpace: targetRect.top - topInset,
    },
    {
      placement: 'right',
      top: Math.round(clampTop(targetCenterY - estHeight / 2)),
      left: Math.round(targetRect.left + targetRect.width + gap),
      fits: viewport.width - rightInset - (targetRect.left + targetRect.width) >= maxWidth + gap,
      availableSpace: viewport.width - rightInset - (targetRect.left + targetRect.width),
    },
    {
      placement: 'left',
      top: Math.round(clampTop(targetCenterY - estHeight / 2)),
      left: Math.round(targetRect.left - maxWidth - gap),
      fits: targetRect.left - leftInset >= maxWidth + gap,
      availableSpace: targetRect.left - leftInset,
    },
  ];

  const fitting = candidates.find((c) => c.fits);
  if (fitting) {
    return {
      top: clampTop(fitting.top),
      left: clampLeft(fitting.left),
      width: maxWidth,
      placement: fitting.placement,
    };
  }

  // Large target fallback: pick non-overlapping corner/edge with maximum free space
  const best = candidates.slice().sort((a, b) => b.availableSpace - a.availableSpace)[0];
  return {
    top: clampTop(best.top),
    left: clampLeft(best.left),
    width: maxWidth,
    placement: 'center',
  };
}

function getScrollableAncestors(el: HTMLElement): HTMLElement[] {
  if (typeof window === 'undefined') return [];
  const ancestors: HTMLElement[] = [];
  let current: HTMLElement | null = el.parentElement;

  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const canScrollY =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight + 2;
    const canScrollX =
      (overflowX === 'auto' || overflowX === 'scroll') &&
      current.scrollWidth > current.clientWidth + 2;

    if (canScrollY || canScrollX) {
      ancestors.push(current);
    }
    current = current.parentElement;
  }

  return ancestors;
}

export function scrollTargetIntoSafeViewport(
  el: HTMLElement,
  safeInsets: SafeViewportInsets,
  behavior: ScrollBehavior = 'smooth'
): boolean {
  if (typeof window === 'undefined') return false;
  let didScroll = false;

  // 1. Scroll any scrollable container ancestors first (e.g., horizontal tab bars, drawers, overflow-y panels)
  const scrollableAncestors = getScrollableAncestors(el);
  for (const container of scrollableAncestors) {
    const targetRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const adj = computeScrollAdjustment(
      targetRect,
      containerRect,
      { top: 12, right: 12, bottom: 12, left: 12 },
      10
    );
    if (!adj.isAlreadyComfortablyVisible) {
      didScroll = true;
      try {
        container.scrollBy({
          top: adj.deltaY,
          left: adj.deltaX,
          behavior,
        });
      } catch {
        container.scrollTop += adj.deltaY;
        container.scrollLeft += adj.deltaX;
      }
    }
  }

  // 2. Scroll the main viewport into the safe visible band (clearing sticky headers, bottom dock, and tour sheet)
  const vpHeight = window.visualViewport?.height || window.innerHeight;
  const vpWidth = window.visualViewport?.width || window.innerWidth;
  const rectAfterContainers = el.getBoundingClientRect();
  const windowAdj = computeScrollAdjustment(
    rectAfterContainers,
    { top: 0, left: 0, width: vpWidth, height: vpHeight },
    safeInsets,
    14
  );

  if (!windowAdj.isAlreadyComfortablyVisible) {
    didScroll = true;
    try {
      window.scrollBy({
        top: windowAdj.deltaY,
        left: windowAdj.deltaX,
        behavior,
      });
    } catch {
      window.scrollTo(window.scrollX + windowAdj.deltaX, window.scrollY + windowAdj.deltaY);
    }
  }

  return didScroll;
}

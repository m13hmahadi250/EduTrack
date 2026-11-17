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

export interface PopoverPlacementResult {
  top: number;
  left: number;
  width: number;
  placement: 'bottom' | 'top' | 'right' | 'left' | 'center';
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

  // Explicit permanent terminal or already-entered states on either Firestore or per-uid storage
  if (
    validRemoteStatus === 'completed' ||
    localStatus === 'completed'
  ) {
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

  // Legacy accounts without structured onboarding metadata: rely strictly on showTour === true
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
          '[data-tour-id="sidebar-pro_profile"]',
          '#tutor-tab-btn-pro_profile',
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
          '[data-tour-id="sidebar-find_students"]',
          '#tutor-tab-btn-find_students',
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
          '[data-tour-id="sidebar-my_session"]',
          '#tutor-tab-btn-my_session',
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
        '[data-tour-id="student-find-tutor-tab"]',
        '#student-tab-btn-find',
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
        '[data-tour-id="sidebar-overview"]',
        '#student-tab-btn-overview',
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
        '[data-tour-id="sidebar-overview"]',
        '#student-tab-btn-overview',
      ],
      navigateTo: { path: '/dashboard' },
    },
  ];
}

export function computePopoverPosition(
  targetRect: TourTargetRect | null,
  viewport: { width: number; height: number },
  popoverSize: { width: number; height: number } = { width: 340, height: 220 },
  padding: number = 14
): PopoverPlacementResult {
  const maxWidth = Math.max(260, Math.min(popoverSize.width, viewport.width - padding * 2));
  const estHeight = Math.min(popoverSize.height, viewport.height - padding * 2);

  if (!targetRect || viewport.width < 640) {
    return {
      top: Math.max(padding, Math.round((viewport.height - estHeight) / 2)),
      left: Math.max(padding, Math.round((viewport.width - maxWidth) / 2)),
      width: maxWidth,
      placement: 'center',
    };
  }

  const gap = 14;
  const spaceBelow = viewport.height - (targetRect.top + targetRect.height) - padding;
  const spaceAbove = targetRect.top - padding;
  const spaceRight = viewport.width - (targetRect.left + targetRect.width) - padding;
  const spaceLeft = targetRect.left - padding;

  const clampLeft = (idealLeft: number) =>
    Math.min(Math.max(padding, idealLeft), Math.max(padding, viewport.width - maxWidth - padding));
  const clampTop = (idealTop: number) =>
    Math.min(Math.max(padding, idealTop), Math.max(padding, viewport.height - estHeight - padding));

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  if (spaceBelow >= estHeight + gap) {
    return {
      top: Math.round(targetRect.top + targetRect.height + gap),
      left: Math.round(clampLeft(targetCenterX - maxWidth / 2)),
      width: maxWidth,
      placement: 'bottom',
    };
  }

  if (spaceAbove >= estHeight + gap) {
    return {
      top: Math.round(targetRect.top - estHeight - gap),
      left: Math.round(clampLeft(targetCenterX - maxWidth / 2)),
      width: maxWidth,
      placement: 'top',
    };
  }

  if (spaceRight >= maxWidth + gap) {
    return {
      top: Math.round(clampTop(targetCenterY - estHeight / 2)),
      left: Math.round(targetRect.left + targetRect.width + gap),
      width: maxWidth,
      placement: 'right',
    };
  }

  if (spaceLeft >= maxWidth + gap) {
    return {
      top: Math.round(clampTop(targetCenterY - estHeight / 2)),
      left: Math.round(targetRect.left - maxWidth - gap),
      width: maxWidth,
      placement: 'left',
    };
  }

  return {
    top: Math.round(clampTop(viewport.height - estHeight - padding)),
    left: Math.round(clampLeft(targetCenterX - maxWidth / 2)),
    width: maxWidth,
    placement: 'center',
  };
}

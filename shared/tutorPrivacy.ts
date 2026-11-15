export type BookingStatusType =
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'proposed_by_tutor'
  | 'requested_by_student'
  | 'rejected';

export interface ViewerContext {
  id: string;
  role: 'student' | 'tutor' | 'admin';
}

export interface SessionSummary {
  id?: string;
  studentId: string;
  tutorId: string;
  status: BookingStatusType | string;
}

export interface TutorPrivacySettings {
  hidePhotoFromPublic?: boolean;
  hideExpectedSalaryPublic?: boolean;
  hideFromSearch?: boolean;
}

export const CONFIRMED_CONTACT_STATUSES: ReadonlySet<string> = new Set([
  'scheduled',
  'active',
  'completed',
]);

export const PENDING_OR_ACTIVE_BOOKING_STATUSES: ReadonlySet<string> = new Set([
  'requested_by_student',
  'proposed_by_tutor',
  'scheduled',
  'active',
]);

const PERMANENT_RESTRICTED_KEYS = [
  'nidNumber',
  'nidFrontImg',
  'nidBackImg',
  'documents',
  'balance',
  'fcmToken',
  'password',
  'birthDate',
] as const;

const CONTACT_CHANNEL_KEYS = [
  'phone',
  'whatsappNumber',
  'email',
  'address',
] as const;

/**
 * Determines whether a viewer is permitted to access unlocked tutor contact details
 * (phone, whatsappNumber, email, address).
 * Allowed ONLY when:
 * - Viewer is Admin
 * - Viewer is the Tutor owner themselves
 * - Viewer is a Student with at least one confirmed session ('scheduled' | 'active' | 'completed') with this tutor
 */
export function canUnlockTutorContact(
  viewer: ViewerContext | null | undefined,
  tutorId: string,
  sessions: SessionSummary[] = []
): boolean {
  if (!viewer || !tutorId) return false;
  if (viewer.role === 'admin') return true;
  if (viewer.id === tutorId) return true;
  if (viewer.role === 'student') {
    return sessions.some(
      (s) =>
        s.studentId === viewer.id &&
        s.tutorId === tutorId &&
        CONFIRMED_CONTACT_STATUSES.has(s.status)
    );
  }
  return false;
}

/**
 * Finds the most relevant booking/session status between a student viewer and a tutor.
 */
export function getViewerTutorBookingStatus(
  viewer: ViewerContext | null | undefined,
  tutorId: string,
  sessions: SessionSummary[] = []
): SessionSummary | null {
  if (!viewer || viewer.role !== 'student' || !tutorId) return null;
  const matching = sessions.filter(
    (s) => s.studentId === viewer.id && s.tutorId === tutorId
  );
  if (matching.length === 0) return null;

  const priority = [
    'active',
    'scheduled',
    'requested_by_student',
    'proposed_by_tutor',
    'completed',
    'rejected',
    'cancelled',
  ];

  for (const st of priority) {
    const found = matching.find((s) => s.status === st);
    if (found) return found;
  }
  return matching[0];
}

/**
 * Prevents duplicate pending/active booking requests between the same student and tutor.
 */
export function hasActiveOrPendingBooking<T extends SessionSummary>(
  studentId: string,
  tutorId: string,
  sessions: T[] = []
): T | null {
  if (!studentId || !tutorId) return null;
  return (
    sessions.find(
      (s) =>
        s.studentId === studentId &&
        s.tutorId === tutorId &&
        PENDING_OR_ACTIVE_BOOKING_STATUSES.has(s.status)
    ) || null
  );
}

/**
 * Strips sensitive/restricted fields BEFORE any tutor record is placed into React state or API responses.
 * - NID numbers, NID images, academic documents, balances, FCM tokens, DOB, and passwords are ALWAYS stripped
 *   unless viewer is Admin or the Tutor owner.
 * - Direct contact channels (phone, whatsappNumber, email, address) are stripped unless `canUnlockTutorContact` is true.
 * - Tutor privacy preferences (`hidePhotoFromPublic`, `hideExpectedSalaryPublic`) are enforced for guests/non-confirmed viewers.
 */
export function sanitizeTutorProfileForViewer<T extends Record<string, any>>(
  rawTutor: T | null | undefined,
  viewer: ViewerContext | null | undefined,
  sessions: SessionSummary[] = []
): {
  tutor: T | null;
  contactUnlocked: boolean;
  bookingSession: SessionSummary | null;
} {
  if (!rawTutor) {
    return { tutor: null, contactUnlocked: false, bookingSession: null };
  }

  const tutorId = String(rawTutor.id || '');
  const isOwnerOrAdmin = Boolean(
    viewer && (viewer.role === 'admin' || viewer.id === tutorId)
  );
  const contactUnlocked = canUnlockTutorContact(viewer, tutorId, sessions);
  const bookingSession = getViewerTutorBookingStatus(viewer, tutorId, sessions);
  const privacy: TutorPrivacySettings = rawTutor.privacySettings || {};

  const sanitized: Record<string, any> = { ...rawTutor };

  // Permanently strip sensitive identity/financial docs for anyone except owner/admin
  if (!isOwnerOrAdmin) {
    for (const key of PERMANENT_RESTRICTED_KEYS) {
      delete sanitized[key];
    }
    // Strip fine-grained GPS coordinates for public guests unless confirmed or tracking on own session
    if (!contactUnlocked) {
      delete sanitized.location;
      delete sanitized.lastLocation;
    }
  }

  // Strip direct contact channels unless unlocked via confirmed booking / owner / admin
  if (!contactUnlocked) {
    for (const key of CONTACT_CHANNEL_KEYS) {
      delete sanitized[key];
    }
  }

  // Enforce tutor-controlled privacy preferences for public/guest & non-confirmed viewers
  if (!isOwnerOrAdmin && !contactUnlocked) {
    if (privacy.hidePhotoFromPublic && !viewer) {
      delete sanitized.profileImage;
    }
    if (privacy.hideExpectedSalaryPublic && !viewer) {
      delete sanitized.hourlyRate;
      delete sanitized.expectedSalary;
    }
  }

  return {
    tutor: sanitized as T,
    contactUnlocked,
    bookingSession,
  };
}

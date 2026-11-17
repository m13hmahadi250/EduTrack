import { formatDateStringDisplay } from './availabilityUtils';

export type SessionStatusValue =
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'proposed_by_tutor'
  | 'requested_by_student'
  | 'rejected';

export type TuitionApplicationStatusValue =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'trial_scheduled'
  | 'selected'
  | 'rejected'
  | 'pending';

export type TrialScheduleStatus =
  | 'proposed_by_student'
  | 'rescheduled_by_tutor'
  | 'confirmed'
  | 'cancelled';

export type CanonicalLifecycleStageKey =
  | 'requested'
  | 'under_review'
  | 'shortlisted'
  | 'trial_scheduled'
  | 'selected'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface LifecycleStepItem {
  key: CanonicalLifecycleStageKey;
  label: string;
  done: boolean;
  current: boolean;
}

export interface LifecycleTrackerState {
  stageKey: CanonicalLifecycleStageKey;
  stageLabel: string;
  stageIndex: number;
  isTerminal: boolean;
  badgeTone: 'blue' | 'amber' | 'emerald' | 'rose' | 'slate';
  nextActionHint: string;
  nextActionBn: string;
  steps: LifecycleStepItem[];
}

export interface ScheduleConflictInputSession {
  id: string;
  studentId: string;
  tutorId: string;
  subject?: string;
  status: string;
  scheduledTime: string;
  duration?: number;
  isTrial?: boolean;
  trialStatus?: string;
}

const NON_BLOCKING_SESSION_STATUSES = new Set(['cancelled', 'rejected', 'completed']);

const ORDERED_PIPELINE_STEPS: Array<{ key: CanonicalLifecycleStageKey; label: string }> = [
  { key: 'requested', label: 'Requested / Applied' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'trial_scheduled', label: 'Trial Scheduled' },
  { key: 'selected', label: 'Selected' },
  { key: 'confirmed', label: 'Hiring Confirmed' },
  { key: 'active', label: 'Active Tuition' },
  { key: 'completed', label: 'Completed' },
];

/**
 * Parses a 12-hour ("05:00 PM", "5 PM") or 24-hour ("17:00", "17:00:00") time string
 * into normalized `{ hour24, minute, hhmm }`, or returns null if invalid.
 */
export function parseTimeSlotTo24Hour(rawSlot: unknown): {
  hour24: number;
  minute: number;
  hhmm: string;
} | null {
  if (typeof rawSlot !== 'string') return null;
  const trimmed = rawSlot.trim();
  if (!trimmed) return null;

  // Match 12-hour format like "05:00 PM", "5:30 am", "5 PM"
  const ampmMatch = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)$/i.exec(trimmed);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2] ?? '0');
    const period = ampmMatch[3].toUpperCase();
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return {
      hour24: hour,
      minute,
      hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    };
  }

  // Match 24-hour format like "17:00" or "9:30:00"
  const h24Match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
  if (h24Match) {
    const hour = Number(h24Match[1]);
    const minute = Number(h24Match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return {
      hour24: hour,
      minute,
      hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    };
  }

  return null;
}

/**
 * Converts a local Bangladesh (Asia/Dhaka, UTC+06:00) date ("YYYY-MM-DD") and time slot
 * ("17:00" or "05:00 PM") OR a "YYYY-MM-DDTHH:mm" datetime-local string into a valid UTC ISO string.
 * Returns null when invalid so callers can show clear validation feedback instead of storing "Invalid Date".
 */
export function normalizeBangladeshScheduleIso(
  dateOrDateTime: string,
  optionalTimeSlot?: string
): string | null {
  const rawDate = String(dateOrDateTime || '').trim();
  if (!rawDate) return null;

  // Case 1: Combined datetime-local ("2026-11-20T17:00") or ISO with offset/Z
  if (!optionalTimeSlot && rawDate.includes('T')) {
    if (/(Z|[+-]\d{2}:\d{2})$/i.test(rawDate)) {
      const parsed = new Date(rawDate);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    const [datePart, timePart] = rawDate.split('T');
    return normalizeBangladeshScheduleIso(datePart, timePart);
  }

  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawDate);
  if (!ymdMatch) {
    const fallback = new Date(rawDate);
    return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
  }

  const parsedTime = optionalTimeSlot
    ? parseTimeSlotTo24Hour(optionalTimeSlot)
    : { hour24: 17, minute: 0, hhmm: '17:00' };
  if (!parsedTime) return null;

  const dhakaIsoWithOffset = `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}T${parsedTime.hhmm}:00+06:00`;
  const parsed = new Date(dhakaIsoWithOffset);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/**
 * Formats an ISO timestamp strictly in Bangladesh Standard Time (Asia/Dhaka).
 */
export function formatDhakaDateTime(isoOrDate: unknown): string {
  if (typeof isoOrDate !== 'string' || !isoOrDate.trim()) return 'Schedule pending';
  const raw = isoOrDate.trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    const normalized = normalizeBangladeshScheduleIso(raw);
    if (!normalized) return raw;
    return formatDhakaDateTime(normalized);
  }
  const datePart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);
  return `${datePart} at ${timePart} (BDT)`;
}

export function formatDhakaDateInputValue(isoOrDate: unknown): string {
  if (typeof isoOrDate !== 'string' || !isoOrDate.trim()) {
    return '';
  }
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) {
    return /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate.trim()) ? isoOrDate.trim() : '';
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

export function formatDhakaTimeInputValue(isoOrDate: unknown): string {
  if (typeof isoOrDate !== 'string' || !isoOrDate.trim()) return '';
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(parsed);
  const hh = parts.find((p) => p.type === 'hour')?.value || '17';
  const mm = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${hh}:${mm}`;
}

export function isFutureDhakaSchedule(isoString: string, nowMs: number = Date.now()): boolean {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return false;
  // Allow 5 minutes tolerance for immediate same-slot confirmations
  return parsed.getTime() >= nowMs - 5 * 60 * 1000;
}

/**
 * Checks whether a candidate booking/trial ISO time overlaps with any active/scheduled/pending
 * session for either participant (preventing double-booking of the same time window).
 */
export function hasScheduleConflict(
  candidateIso: string,
  sessions: ScheduleConflictInputSession[],
  options: {
    tutorId?: string;
    studentId?: string;
    ignoreSessionId?: string;
    windowMinutes?: number;
  } = {}
): {
  conflict: boolean;
  conflictingSession?: ScheduleConflictInputSession;
  reason?: string;
} {
  const candidateMs = new Date(candidateIso).getTime();
  if (!Number.isFinite(candidateMs)) {
    return {
      conflict: true,
      reason: 'Please choose a valid date and time in Bangladesh Standard Time.',
    };
  }

  const windowMs = (options.windowMinutes ?? 60) * 60 * 1000;

  for (const s of sessions || []) {
    if (!s || (options.ignoreSessionId && s.id === options.ignoreSessionId)) continue;
    if (NON_BLOCKING_SESSION_STATUSES.has(String(s.status || ''))) continue;
    if (s.trialStatus === 'cancelled') continue;

    const involvesTutor = options.tutorId && s.tutorId === options.tutorId;
    const involvesStudent = options.studentId && s.studentId === options.studentId;
    if (!involvesTutor && !involvesStudent) continue;

    const existingMs = new Date(s.scheduledTime).getTime();
    if (!Number.isFinite(existingMs)) continue;

    if (Math.abs(candidateMs - existingMs) < windowMs) {
      return {
        conflict: true,
        conflictingSession: s,
        reason: involvesTutor
          ? `Schedule conflict: ${formatDhakaDateTime(s.scheduledTime)} already overlaps with an active or pending booking.`
          : `You already have another session or trial around ${formatDhakaDateTime(s.scheduledTime)}.`,
      };
    }
  }

  return { conflict: false };
}

/**
 * Trials and classes must be explicitly confirmed/completed by participants —
 * elapsed clock time alone must never auto-complete a session or trial.
 */
export function canAutoCompleteOnElapsedTime(): false {
  return false;
}

function buildStepsForStage(currentKey: CanonicalLifecycleStageKey, isCancelled: boolean): LifecycleStepItem[] {
  if (isCancelled) {
    return ORDERED_PIPELINE_STEPS.slice(0, 4).map((step, index) => ({
      key: step.key,
      label: step.label,
      done: index === 0,
      current: false,
    }));
  }

  const currentIdx = ORDERED_PIPELINE_STEPS.findIndex((s) => s.key === currentKey);
  const resolvedIdx = currentIdx >= 0 ? currentIdx : 0;

  return ORDERED_PIPELINE_STEPS.map((step, index) => ({
    key: step.key,
    label: step.label,
    done: index < resolvedIdx || (currentKey === 'completed' && index === resolvedIdx),
    current: index === resolvedIdx && currentKey !== 'completed',
  }));
}

/**
 * Resolves a human-readable, role-aware lifecycle tracker state for direct booking/trial Sessions.
 */
export function resolveSessionTrackerState(
  session: {
    status: string;
    isTrial?: boolean;
    trialStatus?: TrialScheduleStatus | string;
    scheduledTime?: string;
  },
  viewerRole: 'student' | 'tutor' | 'admin' = 'student'
): LifecycleTrackerState {
  const status = String(session.status || 'requested_by_student');
  const isTrial = Boolean(session.isTrial);
  const trialStatus = session.trialStatus;

  if (status === 'cancelled' || status === 'rejected' || trialStatus === 'cancelled') {
    const label = status === 'rejected' ? 'Declined' : 'Cancelled';
    return {
      stageKey: 'cancelled',
      stageLabel: label,
      stageIndex: -1,
      isTerminal: true,
      badgeTone: 'rose',
      nextActionHint:
        status === 'rejected'
          ? 'This request was declined. You can explore other matching tutors or tuition circulars.'
          : 'This booking has been cancelled.',
      nextActionBn:
        status === 'rejected'
          ? 'এই অনুরোধটি প্রত্যাখ্যান করা হয়েছে। আপনি অন্য উপযুক্ত অপশন দেখতে পারেন।'
          : 'এই সেশনটি বাতিল করা হয়েছে।',
      steps: buildStepsForStage('cancelled', true),
    };
  }

  if (status === 'completed') {
    return {
      stageKey: 'completed',
      stageLabel: isTrial ? 'Trial Completed' : 'Completed',
      stageIndex: 7,
      isTerminal: true,
      badgeTone: 'emerald',
      nextActionHint:
        viewerRole === 'student'
          ? 'Class completed. Share a rating or confirm regular tuition if you want to continue.'
          : 'Lesson completed. Keep your class logs and schedule updated.',
      nextActionBn:
        viewerRole === 'student'
          ? 'ক্লাস সম্পন্ন হয়েছে। চাইলে রিভিউ দিন বা নিয়মিত টিউশন নিশ্চিত করুন।'
          : 'ক্লাস সম্পন্ন হয়েছে। নিয়মিত ক্লাস লগ আপডেট রাখুন।',
      steps: buildStepsForStage('completed', false),
    };
  }

  if (status === 'active') {
    return {
      stageKey: 'active',
      stageLabel: 'Active Tuition',
      stageIndex: 6,
      isTerminal: false,
      badgeTone: 'emerald',
      nextActionHint:
        viewerRole === 'student'
          ? 'Live class is active. Grant completion permission when the lesson ends.'
          : 'Live class is active. Request student completion permission when finished.',
      nextActionBn:
        viewerRole === 'student'
          ? 'ক্লাস চলমান রয়েছে। ক্লাস শেষে সমাপ্তির অনুমতি দিন।'
          : 'ক্লাস চলমান রয়েছে। ক্লাস শেষে শিক্ষার্থীর অনুমতি নিয়ে সমাপ্ত করুন।',
      steps: buildStepsForStage('active', false),
    };
  }

  if (status === 'scheduled') {
    const trialConfirmedPendingHire = isTrial && trialStatus === 'confirmed';
    return {
      stageKey: trialConfirmedPendingHire ? 'trial_scheduled' : 'confirmed',
      stageLabel: trialConfirmedPendingHire ? 'Trial Confirmed' : 'Hiring Confirmed',
      stageIndex: trialConfirmedPendingHire ? 3 : 5,
      isTerminal: false,
      badgeTone: 'emerald',
      nextActionHint:
        viewerRole === 'tutor'
          ? trialConfirmedPendingHire
            ? 'Trial schedule is agreed. Start the demo class at the scheduled Bangladesh time.'
            : 'Hiring confirmed. Contact details are unlocked and you can start scheduled lessons.'
          : trialConfirmedPendingHire
          ? 'Trial class confirmed! After the trial, you can confirm full tuition hiring.'
          : 'Tuition confirmed! You can coordinate class timing and view verified contact details.',
      nextActionBn:
        viewerRole === 'tutor'
          ? 'সময়সূচি নিশ্চিত হয়েছে। নির্ধারিত সময়ে ক্লাস শুরু করুন।'
          : 'সময়সূচি নিশ্চিত হয়েছে। ক্লাসের প্রস্তুতি ও সমন্বয় করুন।',
      steps: buildStepsForStage(trialConfirmedPendingHire ? 'trial_scheduled' : 'confirmed', false),
    };
  }

  if (isTrial || trialStatus === 'proposed_by_student' || trialStatus === 'rescheduled_by_tutor') {
    const waitingForTutor = trialStatus !== 'rescheduled_by_tutor';
    return {
      stageKey: 'trial_scheduled',
      stageLabel: waitingForTutor ? 'Trial Proposed' : 'Alternate Time Suggested',
      stageIndex: 3,
      isTerminal: false,
      badgeTone: 'amber',
      nextActionHint:
        viewerRole === 'tutor'
          ? waitingForTutor
            ? 'Review the proposed trial date and time—confirm it or suggest an alternate slot.'
            : 'Waiting for the student or guardian to confirm your suggested trial time.'
          : waitingForTutor
          ? 'Waiting for the tutor to confirm your proposed trial class time.'
          : 'The tutor suggested an alternate trial time. Confirm or propose another time.',
      nextActionBn:
        viewerRole === 'tutor'
          ? waitingForTutor
            ? 'প্রস্তাবিত ট্রায়াল ক্লাসের সময় নিশ্চিত করুন অথবা নতুন সময় প্রস্তাব করুন।'
            : 'অভিভাবক আপনার প্রস্তাবিত সময় নিশ্চিত করলে ট্রায়াল চূড়ান্ত হবে।'
          : waitingForTutor
          ? 'শিক্ষক ট্রায়াল ক্লাসের সময় নিশ্চিত করার অপেক্ষায় আছেন।'
          : 'শিক্ষক নতুন একটি ট্রায়াল সময় প্রস্তাব করেছেন—অনুগ্রহ করে যাচাই করুন।',
      steps: buildStepsForStage('trial_scheduled', false),
    };
  }

  if (status === 'proposed_by_tutor') {
    return {
      stageKey: 'requested',
      stageLabel: 'Tutor Proposal Sent',
      stageIndex: 0,
      isTerminal: false,
      badgeTone: 'blue',
      nextActionHint:
        viewerRole === 'student'
          ? 'Review this tutor proposal and accept or decline from your dashboard.'
          : 'Waiting for the student or guardian to review your proposal.',
      nextActionBn:
        viewerRole === 'student'
          ? 'শিক্ষকের প্রস্তাবটি দেখুন এবং গ্রহণ বা বাতিল করুন।'
          : 'শিক্ষার্থী বা অভিভাবকের সিদ্ধান্তের অপেক্ষায় রয়েছে।',
      steps: buildStepsForStage('requested', false),
    };
  }

  // Default: requested_by_student
  return {
    stageKey: 'requested',
    stageLabel: 'Requested',
    stageIndex: 0,
    isTerminal: false,
    badgeTone: 'amber',
    nextActionHint:
      viewerRole === 'tutor'
        ? 'Review this request, accept it, or suggest a suitable schedule.'
        : 'Request sent! Waiting for the tutor to review and respond.',
    nextActionBn:
      viewerRole === 'tutor'
        ? 'নতুন টিউশনের অনুরোধটি পর্যালোচনা করে গ্রহণ করুন বা সময় জানান।'
        : 'আপনার অনুরোধ পাঠানো হয়েছে—শিক্ষকের সাড়া পাওয়ার অপেক্ষায় রয়েছে।',
    steps: buildStepsForStage('requested', false),
  };
}

/**
 * Resolves a unified tracker state for Tuition Circular Applications.
 */
export function resolveApplicationTrackerState(
  application: {
    status: string;
    trialDate?: string;
    trialStatus?: TrialScheduleStatus | string;
  },
  options: {
    viewerRole?: 'student' | 'tutor' | 'admin';
    tuitionStatus?: string;
    linkedSessionStatus?: string;
  } = {}
): LifecycleTrackerState {
  const viewerRole = options.viewerRole || 'tutor';
  const appStatus = String(application.status || 'submitted');

  if (appStatus === 'rejected') {
    return {
      stageKey: 'cancelled',
      stageLabel: 'Not Selected',
      stageIndex: -1,
      isTerminal: true,
      badgeTone: 'rose',
      nextActionHint:
        viewerRole === 'tutor'
          ? 'This tuition circular moved forward with another candidate. Explore open matching tuitions.'
          : 'You marked this application as not selected.',
      nextActionBn:
        viewerRole === 'tutor'
          ? 'এই টিউশন সার্কুলারে অন্য শিক্ষক নির্বাচন করা হয়েছে। অন্যান্য সুযোগ দেখুন।'
          : 'আবেদনটি বাতিল হিসেবে চিহ্নিত করা হয়েছে।',
      steps: buildStepsForStage('cancelled', true),
    };
  }

  if (options.linkedSessionStatus === 'completed') {
    return resolveSessionTrackerState({ status: 'completed' }, viewerRole);
  }
  if (options.linkedSessionStatus === 'active') {
    return resolveSessionTrackerState({ status: 'active' }, viewerRole);
  }

  if (appStatus === 'selected' || options.tuitionStatus === 'assigned') {
    return {
      stageKey: 'confirmed',
      stageLabel: 'Hiring Confirmed',
      stageIndex: 5,
      isTerminal: false,
      badgeTone: 'emerald',
      nextActionHint:
        viewerRole === 'tutor'
          ? 'Congratulations! You were selected for this tuition. Check your Live Schedule to begin.'
          : 'Tutor confirmed! Your scheduled tuition session is ready in your dashboard.',
      nextActionBn:
        viewerRole === 'tutor'
          ? 'অভিনন্দন! আপনাকে এই টিউশনের জন্য নির্বাচন করা হয়েছে।'
          : 'শিক্ষক চূড়ান্ত করা হয়েছে—ড্যাশবোর্ডে সেশন বিস্তারিত দেখুন।',
      steps: buildStepsForStage('confirmed', false),
    };
  }

  if (appStatus === 'trial_scheduled') {
    const trialConfirmed = application.trialStatus === 'confirmed';
    const rescheduledByTutor = application.trialStatus === 'rescheduled_by_tutor';
    return {
      stageKey: 'trial_scheduled',
      stageLabel: trialConfirmed
        ? 'Trial Confirmed'
        : rescheduledByTutor
        ? 'Alternate Trial Suggested'
        : 'Trial Scheduled',
      stageIndex: 3,
      isTerminal: false,
      badgeTone: trialConfirmed ? 'emerald' : 'amber',
      nextActionHint:
        viewerRole === 'tutor'
          ? trialConfirmed
            ? 'Trial confirmed! Attend the demo class at the agreed time.'
            : rescheduledByTutor
            ? 'Waiting for the guardian to confirm your alternate trial slot.'
            : 'Confirm the proposed trial schedule or propose an alternate time.'
          : rescheduledByTutor
          ? 'The tutor suggested an alternate trial time—please review and confirm.'
          : trialConfirmed
          ? 'Trial class confirmed! After the trial, click Confirm Hiring if satisfied.'
          : 'Waiting for the tutor to confirm the trial date, or confirm hiring after the demo.',
      nextActionBn:
        viewerRole === 'tutor'
          ? trialConfirmed
            ? 'ট্রায়াল ক্লাসের সময় চূড়ান্ত হয়েছে—নির্ধারিত সময়ে অংশ নিন।'
            : 'ট্রায়াল ক্লাসের সময় নিশ্চিত করুন অথবা বিকল্প সময় প্রস্তাব করুন।'
          : rescheduledByTutor
          ? 'শিক্ষক নতুন একটি ট্রায়াল সময় দিয়েছেন—দয়া করে নিশ্চিত করুন।'
          : 'ট্রায়াল ক্লাস শেষে সন্তুষ্ট হলে শিক্ষক নিয়োগ চূড়ান্ত করুন।',
      steps: buildStepsForStage('trial_scheduled', false),
    };
  }

  if (appStatus === 'shortlisted') {
    return {
      stageKey: 'shortlisted',
      stageLabel: 'Shortlisted',
      stageIndex: 2,
      isTerminal: false,
      badgeTone: 'blue',
      nextActionHint:
        viewerRole === 'student'
          ? 'Schedule a quick trial/demo class or confirm hiring directly.'
          : 'You are shortlisted! Watch for a message or trial class invitation.',
      nextActionBn:
        viewerRole === 'student'
          ? 'ট্রায়াল ক্লাসের সময় নির্ধারণ করুন অথবা সরাসরি নিয়োগ নিশ্চিত করুন।'
          : 'আপনাকে শর্টলিস্ট করা হয়েছে—শীঘ্রই ট্রায়াল ক্লাসের আমন্ত্রণ পেতে পারেন।',
      steps: buildStepsForStage('shortlisted', false),
    };
  }

  if (appStatus === 'under_review') {
    return {
      stageKey: 'under_review',
      stageLabel: 'Under Review',
      stageIndex: 1,
      isTerminal: false,
      badgeTone: 'blue',
      nextActionHint:
        viewerRole === 'student'
          ? 'Shortlist this tutor, schedule a trial class, or decline if not suitable.'
          : 'The student or guardian is currently reviewing your application.',
      nextActionBn:
        viewerRole === 'student'
          ? 'আবেদনটি যাচাই করে শর্টলিস্ট বা ট্রায়াল ক্লাস নির্ধারণ করুন।'
          : 'অভিভাবক আপনার আবেদনটি পর্যালোচনা করছেন।',
      steps: buildStepsForStage('under_review', false),
    };
  }

  return {
    stageKey: 'requested',
    stageLabel: 'Applied',
    stageIndex: 0,
    isTerminal: false,
    badgeTone: 'amber',
    nextActionHint:
      viewerRole === 'student'
        ? 'Review tutor qualifications, shortlist, or schedule a trial class.'
        : 'Application submitted! Waiting for the student or guardian to review.',
    nextActionBn:
      viewerRole === 'student'
        ? 'শিক্ষকের প্রোফাইল ও যোগ্যতা দেখে পরবর্তী সিদ্ধান্ত নিন।'
        : 'আপনার আবেদন জমা হয়েছে—অভিভাবকের পর্যালোচনার অপেক্ষায়।',
    steps: buildStepsForStage('requested', false),
  };
}

export { formatDateStringDisplay };

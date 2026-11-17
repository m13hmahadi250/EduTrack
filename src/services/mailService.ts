import { auth } from '../lib/firebase';

export interface WelcomeEmailData {
  userId?: string;
  email: string;
  name: string;
  role: 'student' | 'tutor' | 'admin' | 'guardian' | string;
  accountType?: string;
  studentClass?: string;
  school?: string;
  university?: string;
  course?: string;
  district?: string;
  customMessage?: string;
  profileUrl?: string;
  baseUrl?: string;
  forceSend?: boolean;
}

export type WorkflowNotificationEventType =
  | 'tutor_request_created'
  | 'tuition_application_received'
  | 'tutor_shortlisted'
  | 'request_accepted'
  | 'request_declined'
  | 'trial_scheduled'
  | 'trial_rescheduled'
  | 'trial_confirmed'
  | 'trial_cancelled'
  | 'tuition_confirmed'
  | 'booking_cancelled'
  | 'schedule_changed'
  | 'tuition_alert_digest';

export interface SendWorkflowNotificationParams {
  eventType: WorkflowNotificationEventType;
  sessionId?: string;
  tuitionId?: string;
  targetTutorId?: string;
  idempotencyKey?: string;
  summaryNote?: string;
  scheduleIso?: string;
  baseUrl?: string;
}

const sessionWelcomeDispatched = new Set<string>();

export async function sendWelcomeMail(data: WelcomeEmailData) {
  try {
    const normalizedEmail = String(data.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, error: 'Recipient email is required' };
    }

    const storageKey = `edutrack_welcome_sent_${data.userId || normalizedEmail}`;
    if (!data.forceSend && !data.customMessage) {
      if (sessionWelcomeDispatched.has(storageKey)) {
        return { success: true, alreadySent: true };
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage?.getItem(storageKey) === '1') {
          sessionWelcomeDispatched.add(storageKey);
          return { success: true, alreadySent: true };
        }
      } catch (e) {}
    }

    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : "https://edutrackbd.vercel.app";
    const payload: WelcomeEmailData = {
      ...data,
      email: normalizedEmail,
      baseUrl: data.baseUrl || origin,
      profileUrl: data.profileUrl || (data.userId && data.role === 'tutor' ? `${data.baseUrl || origin}/teachers/${data.userId}` : undefined),
    };

    const res = await fetch('/api/mail/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result?.success && !data.customMessage) {
      sessionWelcomeDispatched.add(storageKey);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage?.setItem(storageKey, '1');
        }
      } catch (e) {}
    }
    return result;
  } catch (error) {
    console.error("[Mail Service Client] Failed to send welcome email:", error);
    return { success: false, error: String(error) };
  }
}

export async function sendWorkflowEmailNotification(params: SendWorkflowNotificationParams) {
  try {
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    if (!idToken) {
      return { success: false, dispatched: false, code: 'AUTH_TOKEN_UNAVAILABLE' };
    }
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://edutrackbd.vercel.app';

    const res = await fetch('/api/notifications/workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        ...params,
        baseUrl: params.baseUrl || origin,
      }),
    });
    const result = await res.json().catch(() => ({ success: false, dispatched: false }));
    return result;
  } catch (error) {
    console.warn('[Mail Service Client] Non-blocking workflow email dispatch failed:', error);
    return { success: false, dispatched: false, error: String(error) };
  }
}

export async function dispatchMatchingTuitionAlerts(
  tuitionId: string,
  recipientTutorIds: string[]
) {
  try {
    if (!tuitionId || !Array.isArray(recipientTutorIds) || recipientTutorIds.length === 0) {
      return { success: true, notifiedCount: 0, skippedCount: 0 };
    }
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    if (!idToken) {
      return { success: false, notifiedCount: 0, skippedCount: recipientTutorIds.length };
    }
    const res = await fetch('/api/notifications/tuition-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        tuitionId,
        recipientTutorIds: Array.from(new Set(recipientTutorIds)).slice(0, 12),
      }),
    });
    const result = await res.json().catch(() => ({ success: false, notifiedCount: 0, skippedCount: 0 }));
    return result;
  } catch (error) {
    console.warn('[Mail Service Client] Non-blocking tuition alert dispatch failed:', error);
    return { success: false, notifiedCount: 0, skippedCount: 0 };
  }
}

export async function sendCustomAdminMail({
  userId,
  toEmail,
  toName,
  subject,
  messageBody,
  role,
  district,
  studentClass,
  school,
  university,
  course,
  profileUrl,
  baseUrl,
}: {
  userId?: string;
  toEmail: string;
  toName: string;
  subject: string;
  messageBody: string;
  role?: string;
  district?: string;
  studentClass?: string;
  school?: string;
  university?: string;
  course?: string;
  profileUrl?: string;
  baseUrl?: string;
}) {
  try {
    const computedProfileUrl = profileUrl || (userId && role === 'tutor' ? `https://edutrackbd.vercel.app/teachers/${userId}` : undefined);
    const res = await fetch('/api/mail/send-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        toEmail,
        toName,
        subject,
        messageBody,
        role,
        district,
        studentClass,
        school,
        university,
        course,
        profileUrl: computedProfileUrl,
        baseUrl: baseUrl || "https://edutrackbd.vercel.app",
      }),
    });
    const result = await res.json();

    return result;
  } catch (error) {
    console.error("[Mail Service Client] Failed to send custom admin email:", error);
    return { success: false, error: String(error) };
  }
}

export interface BulkCampaignMailParams {
  recipients: Array<{
    id?: string;
    email: string;
    name?: string;
    role?: string;
    district?: string;
  }>;
  subject: string;
  preheader?: string;
  headline?: string;
  messageBody: string;
  category?: 'promotional' | 'announcement' | 'update' | 'custom';
  actionButtonText?: string;
  actionButtonUrl?: string;
  adminEmail?: string;
  campaignName?: string;
}

export async function sendBulkCampaignMail(params: BulkCampaignMailParams) {
  try {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : "https://edutrackbd.vercel.app";
    const res = await fetch('/api/mail/send-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        baseUrl: origin,
      }),
    });
    const result = await res.json();
    return result;
  } catch (error) {
    console.error("[Mail Service Client] Failed to dispatch bulk campaign:", error);
    return { 
      success: false, 
      error: String(error), 
      total: params.recipients.length,
      sentCount: 0, 
      failedCount: params.recipients.length,
      results: [] 
    };
  }
}

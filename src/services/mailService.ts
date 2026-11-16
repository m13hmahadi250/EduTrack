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

import { mirrorAdminDataToMongoDB } from './mongoSyncService';

export interface WelcomeEmailData {
  userId?: string;
  email: string;
  name: string;
  role: 'student' | 'tutor' | 'admin';
  studentClass?: string;
  school?: string;
  university?: string;
  course?: string;
  district?: string;
  customMessage?: string;
  profileUrl?: string;
  baseUrl?: string;
}

export async function sendWelcomeMail(data: WelcomeEmailData) {
  try {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : "https://edutrackbd.vercel.app";
    const payload: WelcomeEmailData = {
      ...data,
      baseUrl: data.baseUrl || origin,
      profileUrl: data.profileUrl || (data.userId && data.role === 'tutor' ? `${data.baseUrl || origin}/teachers/${data.userId}` : undefined),
    };

    const res = await fetch('/api/mail/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
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

    // Secondary DB mirror trigger
    mirrorAdminDataToMongoDB({
      actionType: 'SEND_ADMIN_MAIL',
      entityType: 'mail',
      payload: { userId, toEmail, toName, subject, messageBody, role, district, profileUrl: computedProfileUrl }
    });

    return result;
  } catch (error) {
    console.error("[Mail Service Client] Failed to send custom admin email:", error);
    return { success: false, error: String(error) };
  }
}

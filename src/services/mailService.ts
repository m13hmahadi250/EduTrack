import { mirrorAdminDataToMongoDB } from './mongoSyncService';

export interface WelcomeEmailData {
  email: string;
  name: string;
  role: 'student' | 'tutor' | 'admin';
  studentClass?: string;
  school?: string;
  university?: string;
  course?: string;
  district?: string;
  customMessage?: string;
}

export async function sendWelcomeMail(data: WelcomeEmailData) {
  try {
    const res = await fetch('/api/mail/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result;
  } catch (error) {
    console.error("[Mail Service Client] Failed to send welcome email:", error);
    return { success: false, error: String(error) };
  }
}

export async function sendCustomAdminMail({
  toEmail,
  toName,
  subject,
  messageBody,
  role,
  district,
}: {
  toEmail: string;
  toName: string;
  subject: string;
  messageBody: string;
  role?: string;
  district?: string;
}) {
  try {
    const res = await fetch('/api/mail/send-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail,
        toName,
        subject,
        messageBody,
        role,
        district,
      }),
    });
    const result = await res.json();

    // Secondary DB mirror trigger
    mirrorAdminDataToMongoDB({
      actionType: 'SEND_ADMIN_MAIL',
      entityType: 'mail',
      payload: { toEmail, toName, subject, messageBody, role, district }
    });

    return result;
  } catch (error) {
    console.error("[Mail Service Client] Failed to send custom admin email:", error);
    return { success: false, error: String(error) };
  }
}

import "dotenv/config";

export interface SendWelcomeEmailParams {
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

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Generates the official EduTrack Bangladesh 6-Digit Email Verification HTML template.
 * 100% text-only, table-based layout with inline CSS (zero images, SVGs, icons, emojis,
 * gradients, pill badges, dashed borders, or heavy shadows) for flawless Gmail/Outlook/mobile rendering.
 */
export function generateOtpEmailHtml({
  email,
  otpCode,
  expiresMinutes = 5,
}: {
  email: string;
  otpCode: string;
  expiresMinutes?: number;
  baseUrl?: string;
}): string {
  const cleanDigits = String(otpCode || "").replace(/\D/g, "");
  const safeOtp = escapeHtml(cleanDigits);
  const safeEmail = escapeHtml(email || "");
  const safeExpiresMinutes = Number.isFinite(Number(expiresMinutes)) && Number(expiresMinutes) > 0
    ? Math.round(Number(expiresMinutes))
    : 5;
  const currentYear = new Date().getFullYear();
  const preheaderText = "Use your 6-digit verification code to complete your EduTrack Bangladesh registration.";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Verify your email | EduTrack Bangladesh</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F1F5F9; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .card-padding { padding: 28px 20px !important; }
      .otp-code-text { font-size: 32px !important; letter-spacing: 6px !important; }
      .main-heading { font-size: 22px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #0B132B !important; }
      .email-card { background-color: #101828 !important; border-color: #1E293B !important; }
      .brand-title, .main-heading, .otp-code-text, .strong-text { color: #FFFFFF !important; }
      .body-text, .footer-text { color: #CBD5E1 !important; }
      .otp-box { background-color: #172554 !important; border-color: #1E3A8A !important; }
      .otp-label, .brand-link, .brand-sub { color: #60A5FA !important; }
      .divider-line { border-color: #1E293B !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #101828; -webkit-font-smoothing: antialiased;">
  <div style="display: none; font-size: 1px; color: #F1F5F9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${preheaderText}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-bg" style="background-color: #F1F5F9; width: 100%; margin: 0; padding: 32px 16px;">
    <tr>
      <td align="center" valign="top">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-container email-card" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px;">
          <tr>
            <td class="card-padding" style="padding: 36px 36px 32px 36px; text-align: left;">

              <!-- 1. Brand Header (Text-Only) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="left" style="padding-bottom: 20px; border-bottom: 1px solid #E2E8F0;" class="divider-line">
                    <div class="brand-title" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 800; color: #101828; letter-spacing: -0.4px; line-height: 1.1;">
                      Edu<span class="brand-link" style="color: #155DFC;">Track</span>
                    </div>
                    <div class="brand-sub" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 700; color: #155DFC; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px; line-height: 1;">
                      BANGLADESH
                    </div>
                  </td>
                </tr>
              </table>

              <!-- 2. Main Heading -->
              <h1 class="main-heading" style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 800; color: #101828; letter-spacing: -0.3px; line-height: 1.25;">
                Verify your email address
              </h1>

              <!-- 3. Description -->
              <p class="body-text" style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 400; color: #475569; line-height: 1.6;">
                Welcome to EduTrack! Use the verification code below to complete your registration.
              </p>

              <!-- 4. OTP Section (Clean Light-Blue Container, Solid Subtle Border) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td class="otp-box" align="center" style="background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 10px; padding: 24px 20px;">
                    <div class="otp-label" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; color: #155DFC; letter-spacing: 1.8px; text-transform: uppercase; margin: 0 0 12px 0;">
                      YOUR VERIFICATION CODE
                    </div>
                    <div class="otp-code-text" style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; color: #101828; letter-spacing: 8px; text-indent: 8px; line-height: 1.2; margin: 0 0 12px 0; user-select: all; -webkit-user-select: all; -moz-user-select: all;">${safeOtp}</div>
                    <div class="body-text" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 500; color: #475569; line-height: 1.4; margin: 0;">
                      Valid for ${safeExpiresMinutes} ${safeExpiresMinutes === 1 ? "minute" : "minutes"}.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- 5. Security Message -->
              <p class="body-text" style="margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #475569; line-height: 1.6;">
                Never share this verification code with anyone. EduTrack staff will never ask for this code.
              </p>

              <!-- 6. Unrequested Email -->
              <p class="body-text" style="margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #475569; line-height: 1.6;">
                Didn't request this? You can safely ignore this email.
              </p>

              <!-- 7. Footer (Minimal) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="divider-line" style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: left;">
                    <p class="strong-text" style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; color: #101828; line-height: 1.5;">
                      EduTrack Bangladesh
                    </p>
                    <p class="footer-text" style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #475569; line-height: 1.5;">
                      <a href="mailto:edutrackbangladesh@gmail.com" class="brand-link" style="color: #155DFC; font-weight: 600; text-decoration: underline;">Contact Support</a>
                      <span style="color: #94A3B8;"> &middot; </span>
                      <span>${safeEmail}</span>
                    </p>
                    <p class="footer-text" style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #475569; line-height: 1.5;">
                      &copy; ${currentYear} EduTrack Bangladesh
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generatePasswordResetEmailHtml({
  email,
  resetLink,
  expiresMinutes = 15,
}: {
  email: string;
  resetLink: string;
  expiresMinutes?: number;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your EduTrack BD Password</title>
  <style>
    .btn-reset:hover {
      background-color: #0b4ad6 !important;
      box-shadow: 0 10px 25px rgba(13, 91, 255, 0.4) !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 12px;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
          
          <!-- Top Accent Branding Stripe -->
          <tr>
            <td style="background: linear-gradient(90deg, #0D5BFF 0%, #3B82F6 50%, #7C3AED 100%); height: 6px;"></td>
          </tr>

          <!-- Hero Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0B132B 0%, #111A2E 60%, #0D5BFF 100%); padding: 38px 32px; text-align: center;">
              
              <!-- Brand Badge -->
              <div style="display: inline-flex; align-items: center; background: rgba(255, 255, 255, 0.1); padding: 8px 20px; border-radius: 50px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 16px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                <span style="color: #ffffff; font-size: 18px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">EduTrack</span>
                <span style="background-color: #0D5BFF; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase; margin-left: 8px;">BANGLADESH</span>
              </div>

              <!-- Main Title -->
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                Password Reset Request
              </h1>

              <!-- Subtitle -->
              <p style="color: #93c5fd; font-size: 12px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                Secure Account Access Recovery
              </p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              
              <div style="margin-bottom: 24px;">
                <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;">
                  Need to reset your password?
                </h2>
                <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
                  We received a request to reset the password for your EduTrack Bangladesh account associated with <strong>${email}</strong>. Click the button below to set a new password.
                </p>
              </div>

              <!-- Primary Action CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" target="_blank" class="btn-reset" style="display: inline-block; background-color: #0D5BFF; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 900; padding: 16px 36px; border-radius: 14px; letter-spacing: 1px; text-transform: uppercase; transition: all 0.2s ease-in-out; box-shadow: 0 8px 20px rgba(13, 91, 255, 0.3);">
                  Reset Your Password Now
                </a>
              </div>

              <!-- Notice Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                <p style="font-size: 12px; font-weight: 700; color: #64748b; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  ⏰ Important Security Details:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
                  <li>This link will automatically expire in <strong>${expiresMinutes} minutes</strong>.</li>
                  <li>This link is single-use and will be invalidated once used.</li>
                  <li>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</li>
                </ul>
              </div>

              <!-- Fallback Direct URL -->
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0;">
                  If the button above does not work, copy and paste this URL into your browser:
                </p>
                <div style="word-break: break-all; font-family: monospace; font-size: 11px; color: #0D5BFF; background-color: #f1f5f9; padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1;">
                  ${resetLink}
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 32px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; font-weight: 700; margin: 0 0 6px 0;">
                EduTrack Bangladesh Security Team
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0 0 12px 0;">
                Empowering Education & Tuition Management across Bangladesh
              </p>
              <p style="color: #cbd5e1; font-size: 10px; margin: 0;">
                © ${new Date().getFullYear()} EduTrack Bangladesh. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateWelcomeEmailHtml({
  userId,
  name,
  role,
  studentClass,
  school,
  university,
  course,
  district,
  customMessage,
  profileUrl,
  baseUrl,
}: SendWelcomeEmailParams): string {
  const isTutor = role === 'tutor';
  const productionBaseUrl = "https://edutrackbd.vercel.app";
  const targetDashboardUrl = `${productionBaseUrl}/dashboard`;
  
  // Real teacher profile URL format: https://edutrackbd.vercel.app/teachers/{userId}
  const teacherProfileUrl = profileUrl || (userId ? `https://edutrackbd.vercel.app/teachers/${userId}` : (isTutor ? `https://edutrackbd.vercel.app/teachers` : `${productionBaseUrl}/dashboard`));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isTutor ? 'Welcome Teacher - EduTrack Bangladesh' : 'Welcome to EduTrack Bangladesh'}</title>
  <style>
    @keyframes glowPulse {
      0% { box-shadow: 0 0 8px rgba(13, 91, 255, 0.3); }
      50% { box-shadow: 0 0 20px rgba(52, 211, 153, 0.6); }
      100% { box-shadow: 0 0 8px rgba(13, 91, 255, 0.3); }
    }
    .creator-badge {
      animation: glowPulse 3s infinite ease-in-out;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased;">
  <!-- Main Email Background Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 12px;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 640px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
          
          <!-- Top Accent Branding Stripe -->
          <tr>
            <td style="background: linear-gradient(90deg, #0D5BFF 0%, #00C853 50%, #7C3AED 100%); height: 6px;"></td>
          </tr>

          <!-- Hero Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0B132B 0%, #111A2E 55%, #0D5BFF 100%); padding: 44px 36px 36px 36px; text-align: center; position: relative;">
              
              <!-- Brand Badge -->
              <div style="display: inline-flex; align-items: center; background: rgba(255, 255, 255, 0.1); padding: 8px 20px; border-radius: 50px; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 20px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                <span style="color: #ffffff; font-size: 18px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">EduTrack</span>
                <span style="background-color: #0D5BFF; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase; margin-left: 8px;">BANGLADESH</span>
              </div>

              <!-- Main Title -->
              <h1 style="color: #ffffff; font-size: 26px; font-weight: 900; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">
                ${isTutor ? 'Welcome to EduTrack Teacher Network!' : 'Welcome to the Future of Education!'}
              </h1>

              <!-- Subtitle -->
              <p style="color: #93c5fd; font-size: 13px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                ${isTutor ? 'Your Teacher Profile is Live & Ready to Connect with Students' : "Bangladesh's #1 Security-First Home & Online Tutoring Ecosystem"}
              </p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              
              <!-- Greeting -->
              <div style="margin-bottom: 24px;">
                <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">
                  Hello ${name || (isTutor ? 'Honorable Teacher' : 'Valued Member')},
                </h2>
                <p style="font-size: 14px; line-height: 1.65; color: #475569; margin: 0;">
                  Congratulations and welcome to <strong>EduTrack Bangladesh</strong>! Your account has been officially registered as a <span style="display: inline-block; background-color: ${isTutor ? '#fef3c7' : '#dbeafe'}; color: ${isTutor ? '#b45309' : '#1d4ed8'}; font-weight: 800; padding: 2px 10px; border-radius: 8px; font-size: 11px; text-transform: uppercase; border: 1px solid ${isTutor ? '#fcd34d' : '#bfdbfe'};">${isTutor ? 'Verified Tutor / Teacher' : role}</span>.
                </p>
              </div>

              ${customMessage ? `
              <!-- Special Admin Announcement Box -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%); border-left: 5px solid #0D5BFF; border-radius: 16px; padding: 20px; margin-bottom: 28px; box-shadow: 0 4px 12px rgba(13, 91, 255, 0.06);">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e40af; letter-spacing: 1px;">Official Notice from Administration:</span>
                </div>
                <p style="font-size: 14px; line-height: 1.6; color: #1e293b; margin: 0; font-weight: 600; font-style: italic;">
                  "${customMessage}"
                </p>
              </div>
              ` : ''}

              <!-- Account Summary Card -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 20px; margin-bottom: 28px;">
                <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px; display: flex; align-items: center;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">
                    Your Profile Overview
                  </span>
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                  <tr>
                    <td width="35%" style="padding: 4px 0; color: #64748b; font-weight: 600;">Full Name:</td>
                    <td width="65%" style="padding: 4px 0; color: #0f172a; font-weight: 800;">${name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Registered Role:</td>
                    <td style="padding: 4px 0; color: #0D5BFF; font-weight: 800; text-transform: capitalize;">${isTutor ? 'Tutor / Teacher' : role}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 600;">District / Area:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${district || 'Bangladesh (All Districts)'}</td>
                  </tr>
                  ${isTutor ? `
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Institution / Degree:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${university || course || 'University Scholar'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Teacher Profile Link:</td>
                    <td style="padding: 4px 0;">
                      <a href="${teacherProfileUrl}" target="_blank" style="color: #0D5BFF; font-weight: 800; text-decoration: underline; font-size: 12px; word-break: break-all;">
                        ${teacherProfileUrl}
                      </a>
                    </td>
                  </tr>
                  ` : `
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Class / School:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${studentClass ? 'Class ' + studentClass : ''} ${school ? '(' + school + ')' : 'General Student'}</td>
                  </tr>
                  `}
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Security Status:</td>
                    <td style="padding: 4px 0; color: #059669; font-weight: 800;">
                      <span style="display: inline-block; background-color: #d1fae5; color: #047857; padding: 1px 8px; border-radius: 6px; font-size: 10px; text-transform: uppercase;">Protected Account</span>
                    </td>
                  </tr>
                </table>
              </div>

              ${isTutor ? `
              <!-- TEACHER-EXCLUSIVE PROFILE ACCESS CARD -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 2px solid #bfdbfe; border-radius: 20px; padding: 26px 22px; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(13, 91, 255, 0.08); text-align: center;">
                
                <div style="display: inline-flex; align-items: center; background-color: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 900; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border: 1px solid #bfdbfe;">
                  <span style="margin-right: 6px;">🌟</span> YOUR OFFICIAL TEACHER PROFILE
                </div>

                <h3 style="font-size: 17px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  Access & Share Your Teacher Profile
                </h3>

                <p style="font-size: 13px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
                  Your dedicated teacher profile has been created! Use the button below to review your live profile or share your link with students, parents, and guardians across Bangladesh.
                </p>

                <!-- Primary Big Action Button for Teacher Profile -->
                <div style="margin-bottom: 16px;">
                  <a href="${teacherProfileUrl}" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0D5BFF 0%, #0040C9 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; padding: 16px 36px; border-radius: 14px; box-shadow: 0 8px 20px rgba(13, 91, 255, 0.35); border: 1px solid rgba(255,255,255,0.3);">
                    <span>VIEW YOUR TEACHER PROFILE</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                </div>

                <!-- Monospace Direct Profile Link Box -->
                <div style="background-color: #ffffff; border: 1px dashed #3b82f6; border-radius: 12px; padding: 12px 16px; margin: 14px auto 0 auto; max-width: 520px; text-align: center;">
                  <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0 0 4px 0; letter-spacing: 1px;">
                    Direct Teacher Profile URL (Click or Copy):
                  </p>
                  <a href="${teacherProfileUrl}" target="_blank" style="font-family: 'Courier New', Courier, monospace; font-size: 12px; font-weight: 700; color: #0D5BFF; text-decoration: underline; word-break: break-all;">
                    ${teacherProfileUrl}
                  </a>
                </div>

                <!-- Secondary Dashboard Link -->
                <div style="margin-top: 14px;">
                  <a href="${targetDashboardUrl}" target="_blank" style="font-size: 12px; font-weight: 700; color: #047857; text-decoration: none; display: inline-flex; align-items: center;">
                    <span style="text-decoration: underline;">Or access your full Teacher Dashboard</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </a>
                </div>

              </div>
              ` : `
              <!-- Primary Action Button Section for Non-Tutors (Students) -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${targetDashboardUrl}" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0D5BFF 0%, #0040C9 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; padding: 18px 42px; border-radius: 16px; box-shadow: 0 10px 25px rgba(13, 91, 255, 0.4); border: 1px solid rgba(255,255,255,0.2);">
                  <span>OPEN YOUR DASHBOARD</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 10px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
                <p style="font-size: 11px; color: #94a3b8; margin-top: 10px; font-weight: 600;">
                  Direct Portal URL: <a href="${targetDashboardUrl}" style="color: #0D5BFF; text-decoration: none;">${targetDashboardUrl}</a>
                </p>
              </div>
              `}

              <!-- Tailored Walkthrough for Role -->
              <div style="background-color: #f1f5f9; border-radius: 20px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
                <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 0 0 16px 0; letter-spacing: 0.5px; display: flex; align-items: center;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D5BFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span>${isTutor ? 'Action Items for Tutors & Educators:' : 'Quick Start Guide for Students & Guardians:'}</span>
                </h3>

                ${isTutor ? `
                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">1</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Check Your Profile:</strong> Use the profile link above to review your live teaching credentials, expected salary, and bio.
                  </div>
                </div>

                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">2</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Complete Verification:</strong> Upload your NID / University Student ID Card in your dashboard to earn the official <em>Verified Badge</em>.
                  </div>
                </div>

                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">3</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Set Subjects & Salary:</strong> Specify your preferred teaching classes, subjects, district areas, and expected monthly salary.
                  </div>
                </div>

                <div style="display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">4</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Accept Tuition Inquiries:</strong> Receive tuition booking requests from students and start managing sessions.
                  </div>
                </div>
                ` : `
                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">1</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Search & Filter Tutors:</strong> Explore thousands of verified teachers filtered by District, Subject, Class, Institution, and Gender preference.
                  </div>
                </div>

                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">2</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Hire & Track Live Location:</strong> Monitor your tutor's live GPS route to your house and get real-time lesson arrival updates.
                  </div>
                </div>

                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">3</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Digital Class Diary:</strong> Access detailed lesson logs, homework assignments, class duration reports, and performance metrics.
                  </div>
                </div>

                <div style="display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">4</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Safe Mobile Payments:</strong> Pay tuition fees securely via bKash, Nagad, or Bank transfer with automated digital receipts.
                  </div>
                </div>
                `}
              </div>

              <!-- Feature Highlights Showcase Grid -->
              <div style="margin-bottom: 32px;">
                <p style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 1px; margin: 0 0 16px 0; text-align: center;">
                  Why EduTrack Bangladesh leads the nation:
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="50%" style="padding: 6px;">
                      <div style="background-color: #ffffff; border-radius: 16px; padding: 18px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                        <div style="margin-bottom: 8px;">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D5BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 11 12 14 22 4"/></svg>
                        </div>
                        <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">100% Verified Tutors</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">NID, Student ID, and institutional credentials audited.</div>
                      </div>
                    </td>
                    <td width="50%" style="padding: 6px;">
                      <div style="background-color: #ffffff; border-radius: 16px; padding: 18px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                        <div style="margin-bottom: 8px;">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                        <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">Live GPS Security</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">Real-time location map monitoring for complete safety.</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="padding: 6px;">
                      <div style="background-color: #ffffff; border-radius: 16px; padding: 18px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                        <div style="margin-bottom: 8px;">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        </div>
                        <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">Digital Class Logger</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">Automated diary logs, topic history, and student progress.</div>
                      </div>
                    </td>
                    <td width="50%" style="padding: 6px;">
                      <div style="background-color: #ffffff; border-radius: 16px; padding: 18px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                        <div style="margin-bottom: 8px;">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                        </div>
                        <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">bKash & Nagad</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">Instant mobile wallet payouts and safe digital escrow.</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Support Footer Section inside Card -->
              <div style="border-top: 1px border-dashed #e2e8f0; padding-top: 20px; text-align: center;">
                <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0;">
                  Need assistance or have questions about your account?
                </p>
                <p style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0;">
                  Contact Support: <a href="mailto:edutrackbangladesh@gmail.com" style="color: #0D5BFF; text-decoration: underline;">edutrackbangladesh@gmail.com</a>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer Banner -->
          <tr>
            <td style="background-color: #0b132b; padding: 28px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="color: #94a3b8; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">
                EduTrack Bangladesh
              </p>
              <p style="color: #64748b; font-size: 11px; margin: 0 0 12px 0; line-height: 1.5;">
                Empowering Education, Security & Academic Excellence across all 64 Districts of Bangladesh
              </p>
              <p style="color: #475569; font-size: 10px; margin: 0 0 16px 0;">
                © ${new Date().getFullYear()} EduTrack Bangladesh. All rights reserved.
              </p>

              <!-- Designer & Developer Signature Badge -->
              <div style="display: inline-block;">
                <div class="creator-badge" style="background: linear-gradient(135deg, rgba(13, 91, 255, 0.15) 0%, rgba(124, 58, 237, 0.2) 100%); border: 1px solid rgba(96, 165, 250, 0.25); border-radius: 50px; padding: 3px 12px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(13, 91, 255, 0.15);">
                  <span style="color: #64748b; font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-right: 4px;">
                    Designed & Built by
                  </span>
                  <span style="color: #60a5fa; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; display: inline-flex; align-items: center;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="#60a5fa" stroke="#60a5fa" stroke-width="1" style="vertical-align: middle; margin-right: 3px;"><path d="M12 2l2.4 7.2L21.6 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8z"/></svg>
                    <span>MOHAMMED MAHADI HOSSAIN</span>
                  </span>
                </div>
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface BulkCampaignEmailParams {
  recipientName?: string;
  recipientEmail: string;
  recipientRole?: string;
  recipientDistrict?: string;
  subject: string;
  preheader?: string;
  headline?: string;
  messageBody: string;
  category?: 'promotional' | 'announcement' | 'update' | 'custom';
  actionButtonText?: string;
  actionButtonUrl?: string;
  baseUrl?: string;
}

export function generateBulkCampaignEmailHtml({
  recipientName,
  recipientEmail,
  recipientRole = 'member',
  recipientDistrict,
  subject,
  preheader,
  headline,
  messageBody,
  category = 'update',
  actionButtonText,
  actionButtonUrl,
  baseUrl = "https://edutrackbd.vercel.app",
}: BulkCampaignEmailParams): string {
  const displayName = recipientName?.trim() || recipientEmail.split('@')[0];
  const roleLabel = recipientRole === 'tutor' ? 'Tutor / Educator' : recipientRole === 'student' ? 'Student / Guardian' : 'Platform Member';
  
  // Replace dynamic template variables in message body
  let processedBody = messageBody
    .replace(/\{\{\s*name\s*\}\}/gi, displayName)
    .replace(/\{\{\s*email\s*\}\}/gi, recipientEmail)
    .replace(/\{\{\s*role\s*\}\}/gi, roleLabel)
    .replace(/\{\{\s*district\s*\}\}/gi, recipientDistrict || 'Bangladesh');

  // Convert double newlines to paragraph blocks and lines starting with - or • to styled list items
  const paragraphs = processedBody.split(/\n\s*\n/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      const items = trimmed.split('\n').map(line => {
        const clean = line.replace(/^[•\-]\s*/, '').trim();
        return clean ? `<li style="margin-bottom: 8px; color: #334155; line-height: 1.6;">${clean}</li>` : '';
      }).join('');
      return `<ul style="margin: 16px 0; padding-left: 24px; color: #0D5BFF;">${items}</ul>`;
    }
    return `<p style="margin: 0 0 16px 0; line-height: 1.7; color: #334155; font-size: 15px;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  // Category Theme Attributes
  let badgeText = "Platform Announcement";
  let badgeBg = "rgba(13, 91, 255, 0.15)";
  let badgeColor = "#60a5fa";
  let topGradient = "linear-gradient(90deg, #0D5BFF 0%, #00C853 50%, #7C3AED 100%)";
  let headerBg = "linear-gradient(135deg, #0B132B 0%, #111A2E 55%, #0D5BFF 100%)";
  let ctaBg = "#0D5BFF";

  if (category === 'promotional') {
    badgeText = "Special Promotion & Offer";
    badgeBg = "rgba(16, 185, 129, 0.2)";
    badgeColor = "#34d399";
    topGradient = "linear-gradient(90deg, #10B981 0%, #0D5BFF 50%, #F59E0B 100%)";
    headerBg = "linear-gradient(135deg, #064E3B 0%, #0B132B 60%, #10B981 100%)";
    ctaBg = "#059669";
  } else if (category === 'announcement') {
    badgeText = "Important Announcement";
    badgeBg = "rgba(124, 58, 237, 0.25)";
    badgeColor = "#c084fc";
    topGradient = "linear-gradient(90deg, #7C3AED 0%, #0D5BFF 100%)";
    headerBg = "linear-gradient(135deg, #1E1B4B 0%, #0B132B 55%, #7C3AED 100%)";
    ctaBg = "#7C3AED";
  } else if (category === 'custom') {
    badgeText = "Official Notice";
    badgeBg = "rgba(255, 255, 255, 0.15)";
    badgeColor = "#93c5fd";
    topGradient = "linear-gradient(90deg, #3B82F6 0%, #6366F1 100%)";
    headerBg = "linear-gradient(135deg, #0B132B 0%, #1E293B 100%)";
    ctaBg = "#0B132B";
  }

  const defaultHeadline = headline || subject;
  const snippet = preheader || defaultHeadline;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased;">
  <!-- Hidden inbox preheader snippet -->
  <div style="display:none;font-size:1px;color:#0f172a;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${snippet}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 36px 12px;">
    <tr>
      <td align="center">
        
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08);">
          
          <!-- Top Accent Stripe -->
          <tr>
            <td style="background: ${topGradient}; height: 6px;"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="background: ${headerBg}; padding: 40px 32px 36px 32px; text-align: center;">
              
              <!-- Brand Badge -->
              <div style="display: inline-flex; align-items: center; background: rgba(255, 255, 255, 0.1); padding: 8px 18px; border-radius: 50px; border: 1px solid rgba(255, 255, 255, 0.18); margin-bottom: 20px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                <span style="color: #ffffff; font-size: 16px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">EduTrack</span>
                <span style="background-color: #0D5BFF; color: #ffffff; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 8px; letter-spacing: 1px; text-transform: uppercase; margin-left: 8px;">BANGLADESH</span>
              </div>

              <!-- Category Tag -->
              <div style="margin-bottom: 12px;">
                <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.5px; border: 1px solid rgba(255,255,255,0.1);">
                  ${badgeText}
                </span>
              </div>

              <!-- Main Title -->
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3;">
                ${defaultHeadline}
              </h1>

              <p style="color: rgba(255, 255, 255, 0.7); font-size: 13px; margin: 0; font-weight: 500;">
                Official Platform Dispatch • ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              
              <!-- Greeting & Recipient Pill -->
              <div style="margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">
                    Hello ${displayName},
                  </h3>
                  <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">
                    Role: <strong style="color: #0D5BFF;">${roleLabel}</strong> ${recipientDistrict ? `• District: <strong>${recipientDistrict}</strong>` : ''}
                  </p>
                </div>
              </div>

              <!-- Main Message Paragraphs -->
              <div style="color: #334155; font-size: 15px; line-height: 1.7;">
                ${paragraphs}
              </div>

              <!-- Call to Action Button (if configured) -->
              ${actionButtonText && actionButtonUrl ? `
              <div style="text-align: center; margin: 34px 0 24px 0;">
                <a href="${actionButtonUrl}" style="display: inline-block; background: ${ctaBg}; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 14px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 8px 24px rgba(13, 91, 255, 0.35);">
                  ${actionButtonText} →
                </a>
              </div>
              ` : ''}

              <!-- Platform Assurance Callout Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 20px; margin-top: 28px; text-align: left;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="32" valign="top" style="padding-top: 2px;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D5BFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </td>
                    <td style="padding-left: 10px;">
                      <p style="margin: 0; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                        Verified Platform Communication
                      </p>
                      <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                        This notice is dispatched via EduTrack Bangladesh Brevo email relay. If you have questions, reach our 24/7 administrative desk at 
                        <a href="mailto:edutrackbangladesh@gmail.com" style="color: #0D5BFF; text-decoration: none; font-weight: 600;">edutrackbangladesh@gmail.com</a>.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 1px;">
                EduTrack Bangladesh
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #64748b;">
                The Premier Verified Tuition & Educator Network • Dhaka, Bangladesh
              </p>
              <div style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
                <span>Web: <a href="${baseUrl}" style="color: #0D5BFF; text-decoration: none;">${baseUrl.replace('https://', '')}</a></span> •
                <span>Inquiries: <a href="mailto:edutrackbangladesh@gmail.com" style="color: #0D5BFF; text-decoration: none;">edutrackbangladesh@gmail.com</a></span>
              </div>
              <p style="margin: 14px 0 0 0; font-size: 10px; color: #94a3b8;">
                You received this operational update as a registered member of EduTrack Bangladesh.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateOtpEmailText({
  email,
  otpCode,
  expiresMinutes = 5,
}: {
  email: string;
  otpCode: string;
  expiresMinutes?: number;
}): string {
  const cleanDigits = String(otpCode || "").replace(/\D/g, "");
  const safeExpiresMinutes = Number.isFinite(Number(expiresMinutes)) && Number(expiresMinutes) > 0
    ? Math.round(Number(expiresMinutes))
    : 5;
  const currentYear = new Date().getFullYear();

  return [
    "EduTrack BANGLADESH",
    "",
    "Verify your email address",
    "",
    "Welcome to EduTrack! Use the verification code below to complete your registration.",
    "",
    `YOUR VERIFICATION CODE: ${cleanDigits}`,
    `Valid for ${safeExpiresMinutes} ${safeExpiresMinutes === 1 ? "minute" : "minutes"}.`,
    "",
    "Never share this verification code with anyone. EduTrack staff will never ask for this code.",
    "Didn't request this? You can safely ignore this email.",
    "",
    "EduTrack Bangladesh",
    `Contact Support: edutrackbangladesh@gmail.com (${email})`,
    `© ${currentYear} EduTrack Bangladesh`,
  ].join("\n");
}

export async function sendBrevoEmail({
  toEmail,
  toName,
  subject,
  htmlContent,
  textContent,
}: {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "edutrackbangladesh@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "EduTrack Bangladesh";

  if (!apiKey || apiKey === "MY_BREVO_API_KEY" || apiKey === "undefined" || apiKey === "null") {
    console.warn(`[Brevo Email Service] BREVO_API_KEY is not configured. Email to ${toEmail} logged.`);
    return {
      success: true,
      simulated: true,
      message: "Brevo API Key is not configured. Email logged successfully.",
    };
  }

  try {
    const payload: Record<string, any> = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: toEmail,
          name: toName || toEmail.split("@")[0],
        },
      ],
      subject: subject,
      htmlContent: htmlContent,
    };

    if (textContent) {
      payload.textContent = textContent;
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody: any = await response.json().catch(() => ({}));
      console.warn("[Brevo Email API Warning]:", JSON.stringify(errorBody));
      
      const errMsg = errorBody.message || errorBody.code || `Brevo API error (HTTP ${response.status})`;
      const lowerMsg = String(errMsg).toLowerCase();

      if (lowerMsg.includes("unrecognised ip") || lowerMsg.includes("authorised_ips") || lowerMsg.includes("authorised ip")) {
        return {
          success: false,
          isIpError: true,
          error: "Brevo IP Whitelist Restriction Active",
          message: "Brevo Security Notice: Your Brevo API key has IP restrictions enabled. Please go to https://app.brevo.com/security/authorised_ips and disable IP restrictions or authorize server IPs.",
          brevoLink: "https://app.brevo.com/security/authorised_ips",
          rawError: errMsg
        };
      }

      if (lowerMsg.includes("key not found") || lowerMsg.includes("unauthorized") || lowerMsg.includes("invalid api key") || lowerMsg.includes("unregistered sender")) {
        return {
          success: false,
          isKeyError: true,
          error: "Brevo API Key / Account Configuration Notice",
          message: `Brevo Notice: ${errMsg}. Please verify BREVO_API_KEY and verified sender email in Brevo dashboard.`,
          rawError: errMsg
        };
      }

      return {
        success: false,
        isEmailError: true,
        error: "Brevo Delivery Warning",
        message: errMsg,
        rawError: errMsg
      };
    }

    const data = await response.json();
    console.log(`[Brevo Email Sent] Successfully sent email to ${toEmail}. ID:`, data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (err: any) {
    console.warn("[Brevo Email Network Exception]:", err?.message || err);
    return {
      success: false,
      isNetworkError: true,
      error: "Email Service Network Exception",
      message: err?.message || "Failed to reach Brevo email service.",
    };
  }
}

export default function mailModuleHandler(_req: any, res: any) {
  res.status(200).json({ status: "EduTrack Mail Service Module Active" });
}


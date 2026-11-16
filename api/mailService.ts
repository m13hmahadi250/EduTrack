import "dotenv/config";

export interface SendWelcomeEmailParams {
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

export interface EduTrackEmailLayoutParams {
  title: string;
  preheader: string;
  recipientEmail: string;
  heading: string;
  bodyHtml: string;
}

export function renderEduTrackEmailLayout({
  title,
  preheader,
  recipientEmail,
  heading,
  bodyHtml,
}: EduTrackEmailLayoutParams): string {
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader);
  const safeEmail = escapeHtml(recipientEmail || "");
  const safeHeading = escapeHtml(heading);
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${safeTitle}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #0B1120 !important; }
      .email-card { background-color: #111827 !important; border-color: #1E293B !important; }
      .text-primary { color: #F8FAFC !important; }
      .text-secondary { color: #94A3B8 !important; }
      .brand-track { color: #3B82F6 !important; }
      .accent-box { background-color: #1E293B !important; border-color: #334155 !important; }
      .accent-label { color: #60A5FA !important; }
      .info-box { background-color: #0F172A !important; border-color: #1E293B !important; }
      .divider { border-top-color: #1E293B !important; }
      .text-muted { color: #64748B !important; }
    }
    @media screen and (max-width: 600px) {
      .email-wrapper { padding: 20px 12px !important; }
      .email-card-pad { padding: 28px 20px !important; }
    }
  </style>
</head>
  <body class="email-bg" style="margin: 0; padding: 0; width: 100%; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #101828; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <div style="display: none; font-size: 1px; color: #F1F5F9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${safePreheader}
  </div>

  <table role="presentation" class="email-bg email-wrapper" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
          <tr>
            <td class="email-card-pad" style="padding: 36px 36px 32px 36px;">

              <!-- Top Brand Header -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="padding-bottom: 20px; border-bottom: 1px solid #E2E8F0; margin-bottom: 24px;" class="divider">
                    <div class="text-primary" style="font-size: 22px; font-weight: 800; color: #101828; letter-spacing: -0.4px; line-height: 1.1;">
                      Edu<span class="brand-link" style="color: #155DFC;">Track</span>
                    </div>
                    <div class="brand-link" style="margin-top: 4px; font-size: 10px; font-weight: 700; color: #155DFC; letter-spacing: 3px; text-transform: uppercase; line-height: 1;">
                      BANGLADESH
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Main Heading -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="padding-top: 24px; padding-bottom: 12px;">
                    <h1 class="text-primary" style="margin: 0; font-size: 24px; font-weight: 800; color: #101828; letter-spacing: -0.3px; line-height: 1.25;">
                      ${safeHeading}
                    </h1>
                  </td>
                </tr>
              </table>

              ${bodyHtml}

              <!-- Footer -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="divider" style="border-top: 1px solid #E2E8F0; padding-top: 20px;">
                    <p class="text-primary" style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #101828; line-height: 1.5;">
                      EduTrack Bangladesh
                    </p>
                    <p class="text-muted" style="margin: 0 0 6px 0; font-size: 12px; line-height: 1.5; color: #475569;">
                      <a href="mailto:edutrackbangladesh@gmail.com" class="brand-link" style="color: #155DFC; text-decoration: underline; font-weight: 600;">Contact Support</a>
                      ${safeEmail ? `<span style="color: #94A3B8;"> &middot; </span><span>${safeEmail}</span>` : ""}
                    </p>
                    <p class="text-muted" style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
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

export function renderEmailPrimaryButton(label: string, url: string): string {
  const safeLabel = escapeHtml(label);
  const safeUrl = escapeHtml(url);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td align="center" style="padding: 8px 0 24px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="background-color: #155DFC; border-radius: 8px;">
            <a href="${safeUrl}" target="_blank" style="display: inline-block; background-color: #155DFC; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #155DFC; line-height: 1.2;">
              ${safeLabel}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
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
  const safeExpiresMinutes =
    Number.isFinite(Number(expiresMinutes)) && Number(expiresMinutes) > 0
      ? Math.round(Number(expiresMinutes))
      : 15;
  const safeResetLink = escapeHtml(resetLink || "");

  const bodyHtml = `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="padding-bottom: 24px;">
                    <p class="text-secondary" style="margin: 0; font-size: 15px; line-height: 1.6; color: #475569;">
                      We received a request to reset your EduTrack account password. Click the button below to choose a new password.
                    </p>
                  </td>
                </tr>
              </table>

              ${renderEmailPrimaryButton("Reset Password", resetLink)}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div class="text-secondary" style="font-size: 13px; font-weight: 500; color: #475569;">
                      Valid for ${safeExpiresMinutes} ${safeExpiresMinutes === 1 ? "minute" : "minutes"}. This reset link can only be used once.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Warning -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <table role="presentation" class="info-box" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                      <tr>
                        <td style="padding: 14px 16px;">
                          <p class="text-secondary" style="margin: 0; font-size: 13px; line-height: 1.55; color: #475569;">
                            Never share this password reset link with anyone. EduTrack staff will never ask for your password or reset link.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p class="text-muted" style="margin: 0 0 6px 0; font-size: 12px; line-height: 1.5; color: #64748B;">
                      If the button above does not work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; word-break: break-all; color: #155DFC;">
                      <a href="${safeResetLink}" style="color: #155DFC; text-decoration: underline;">${safeResetLink}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Ignore Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 28px;">
                    <p class="text-muted" style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748B;">
                      Didn&#39;t request this? You can safely ignore this email. Your password will remain unchanged.
                    </p>
                  </td>
                </tr>
              </table>`;

  return renderEduTrackEmailLayout({
    title: "Reset your password | EduTrack Bangladesh",
    preheader: `Reset your EduTrack Bangladesh password. Valid for ${safeExpiresMinutes} ${safeExpiresMinutes === 1 ? "minute" : "minutes"}.`,
    recipientEmail: email,
    heading: "Reset your password",
    bodyHtml,
  });
}

export function generatePasswordResetEmailText({
  email,
  resetLink,
  expiresMinutes = 15,
}: {
  email: string;
  resetLink: string;
  expiresMinutes?: number;
}): string {
  const safeExpiresMinutes =
    Number.isFinite(Number(expiresMinutes)) && Number(expiresMinutes) > 0
      ? Math.round(Number(expiresMinutes))
      : 15;
  const currentYear = new Date().getFullYear();

  return [
    "EduTrack BANGLADESH",
    "",
    "Reset your password",
    "",
    "We received a request to reset your EduTrack account password.",
    "",
    `Reset Password: ${resetLink}`,
    `Valid for ${safeExpiresMinutes} ${safeExpiresMinutes === 1 ? "minute" : "minutes"}. This reset link can only be used once.`,
    "",
    "Never share this password reset link with anyone. EduTrack staff will never ask for your password or reset link.",
    "Didn't request this? You can safely ignore this email. Your password will remain unchanged.",
    "",
    "EduTrack Bangladesh",
    `Contact Support: edutrackbangladesh@gmail.com (${email})`,
    `© ${currentYear} EduTrack Bangladesh`,
  ].join("\n");
}

function stripDecorativeSymbols(input: string): string {
  return String(input || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function generateWelcomeEmailHtml({
  userId,
  email,
  name,
  role,
  accountType,
  studentClass,
  school,
  university,
  course,
  district,
  customMessage,
  profileUrl,
  baseUrl = "https://edutrackbd.vercel.app",
}: SendWelcomeEmailParams): string {
  const normalizedRole = String(role || "student").toLowerCase();
  const normalizedAccountType = String(accountType || "").toLowerCase();
  const isTutor = normalizedRole === "tutor";
  const isGuardian = normalizedRole === "guardian" || normalizedAccountType === "guardian";
  const cleanName = stripDecorativeSymbols(name || "").trim();
  const safeGreetingName = escapeHtml(cleanName || (isTutor ? "Educator" : "there"));

  const cleanBaseUrl = String(baseUrl || "https://edutrackbd.vercel.app").replace(/\/+$/, "");
  const dashboardUrl = "https://edutrackbd.vercel.app/dashboard";
  const computedProfileUrl =
    profileUrl || (userId && isTutor ? `${cleanBaseUrl}/teachers/${encodeURIComponent(userId)}` : undefined);

  const roleLabel = isTutor
    ? "Tutor"
    : isGuardian
      ? "Guardian"
      : normalizedRole === "admin"
        ? "Administrator"
        : "Student";

  let guidanceLabel = "GETTING STARTED AS A STUDENT";
  let guidanceText =
    "Find verified tutors by subject, class, and location, post your tuition needs in the marketplace, and manage your scheduled sessions and class logs from your dashboard.";

  if (isTutor) {
    guidanceLabel = "GETTING STARTED AS A TUTOR";
    guidanceText =
      "Complete your academic profile, upload your verification documents (National ID and institutional ID card), and explore matching tuition opportunities across Bangladesh.";
  } else if (isGuardian) {
    guidanceLabel = "GETTING STARTED AS A GUARDIAN";
    guidanceText =
      "Find suitable verified tutors for your child by subject, class, and area, post specific tuition requirements, and monitor scheduled sessions in one place.";
  }

  const summaryRows: Array<{ label: string; value: string }> = [];
  if (cleanName) {
    summaryRows.push({ label: "Full Name", value: escapeHtml(cleanName) });
  }
  summaryRows.push({ label: "Account Role", value: escapeHtml(roleLabel) });
  if (district) {
    summaryRows.push({ label: "District / Location", value: escapeHtml(district) });
  }
  if (isTutor && (university || course)) {
    const inst = [university, course].filter(Boolean).join(" — ");
    summaryRows.push({ label: "Institution", value: escapeHtml(inst) });
  } else if (!isTutor && (studentClass || school)) {
    const academic = [studentClass, school].filter(Boolean).join(" — ");
    summaryRows.push({ label: "Academic Details", value: escapeHtml(academic) });
  }
  if (isTutor && computedProfileUrl) {
    const safeProfUrl = escapeHtml(computedProfileUrl);
    summaryRows.push({
      label: "Teacher Profile",
      value: `<a href="${safeProfUrl}" style="color: #155DFC; text-decoration: none; font-weight: 600;">${safeProfUrl}</a>`,
    });
  }

  const summaryTableHtml = `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding-bottom: 24px;">
                <tr>
                  <td>
                    <table role="presentation" class="info-box" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                      ${summaryRows
                        .map(
                          (row, idx) => `<tr>
                        <td style="padding: 10px 16px; font-size: 13px; color: #64748B; font-weight: 600; width: 38%; ${idx > 0 ? "border-top: 1px solid #E2E8F0;" : ""}">
                          ${row.label}
                        </td>
                        <td class="text-primary" style="padding: 10px 16px; font-size: 13px; color: #101828; font-weight: 600; ${idx > 0 ? "border-top: 1px solid #E2E8F0;" : ""}">
                          ${row.value}
                        </td>
                      </tr>`
                        )
                        .join("")}
                    </table>
                  </td>
                </tr>
              </table>`;

  let customMessageHtml = "";
  if (customMessage && customMessage.trim()) {
    const paragraphs = customMessage
      .split(/\n\s*\n/)
      .map((block) => {
        const trimmed = stripDecorativeSymbols(block);
        if (!trimmed) return "";
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const isBulletBlock = lines.every((l) => l.startsWith("•") || l.startsWith("-"));
        if (isBulletBlock) {
          const listItems = lines
            .map((l) => {
              const itemText = escapeHtml(stripDecorativeSymbols(l.replace(/^[•\-]\s*/, "")));
              return itemText
                ? `<li style="margin-bottom: 6px; color: #475569; font-size: 14px; line-height: 1.6;">${itemText}</li>`
                : "";
            })
            .join("");
          return `<ul style="margin: 0 0 16px 0; padding-left: 20px; color: #155DFC;">${listItems}</ul>`;
        }
        const safeBlock = lines.map((l) => escapeHtml(stripDecorativeSymbols(l))).join("<br/>");
        return `<p class="text-secondary" style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #475569;">${safeBlock}</p>`;
      })
      .join("");

    customMessageHtml = `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding-bottom: 20px;">
                <tr>
                  <td>
                    <table role="presentation" class="accent-box" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px;">
                      <tr>
                        <td style="padding: 18px 20px;">
                          <div class="accent-label" style="font-size: 11px; font-weight: 700; color: #155DFC; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px;">
                            ACCOUNT NOTICE
                          </div>
                          ${paragraphs}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;
  } else {
    customMessageHtml = `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding-bottom: 20px;">
                <tr>
                  <td>
                    <table role="presentation" class="accent-box" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px;">
                      <tr>
                        <td style="padding: 18px 20px;">
                          <div class="accent-label" style="font-size: 11px; font-weight: 700; color: #155DFC; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 8px;">
                            ${guidanceLabel}
                          </div>
                          <p class="text-secondary" style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569;">
                            ${escapeHtml(guidanceText)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;
  }

  const bodyHtml = `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="padding-bottom: 20px;">
                    <p class="text-primary" style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #101828;">
                      Hello ${safeGreetingName},
                    </p>
                    <p class="text-secondary" style="margin: 0; font-size: 15px; line-height: 1.6; color: #475569;">
                      Your EduTrack Bangladesh account is ready. You can now access your dashboard to manage your profile, tuition connections, and academic sessions.
                    </p>
                  </td>
                </tr>
              </table>

              ${customMessageHtml}

              ${summaryTableHtml}

              ${renderEmailPrimaryButton("Go to Dashboard", dashboardUrl)}`;

  return renderEduTrackEmailLayout({
    title: "Welcome to EduTrack! | EduTrack Bangladesh",
    preheader: `Welcome to EduTrack! Your ${roleLabel} account on EduTrack Bangladesh is ready.`,
    recipientEmail: email,
    heading: "Welcome to EduTrack!",
    bodyHtml,
  });
}

export function generateWelcomeEmailText({
  userId,
  email,
  name,
  role,
  accountType,
  studentClass,
  school,
  university,
  course,
  district,
  customMessage,
  profileUrl,
  baseUrl = "https://edutrackbd.vercel.app",
}: SendWelcomeEmailParams): string {
  const normalizedRole = String(role || "student").toLowerCase();
  const normalizedAccountType = String(accountType || "").toLowerCase();
  const isTutor = normalizedRole === "tutor";
  const isGuardian = normalizedRole === "guardian" || normalizedAccountType === "guardian";
  const cleanName = stripDecorativeSymbols(name || "").trim() || (isTutor ? "Educator" : "there");
  const roleLabel = isTutor
    ? "Tutor"
    : isGuardian
      ? "Guardian"
      : normalizedRole === "admin"
        ? "Administrator"
        : "Student";

  const cleanBaseUrl = String(baseUrl || "https://edutrackbd.vercel.app").replace(/\/+$/, "");
  const dashboardUrl = "https://edutrackbd.vercel.app/dashboard";
  const computedProfileUrl =
    profileUrl || (userId && isTutor ? `${cleanBaseUrl}/teachers/${encodeURIComponent(userId)}` : undefined);

  let guidanceText =
    "Find verified tutors by subject, class, and location, post your tuition needs in the marketplace, and manage your scheduled sessions and class logs from your dashboard.";
  if (isTutor) {
    guidanceText =
      "Complete your academic profile, upload your verification documents (National ID and institutional ID card), and explore matching tuition opportunities across Bangladesh.";
  } else if (isGuardian) {
    guidanceText =
      "Find suitable verified tutors for your child by subject, class, and area, post specific tuition requirements, and monitor scheduled sessions in one place.";
  }

  const currentYear = new Date().getFullYear();
  const lines: string[] = [
    "EduTrack BANGLADESH",
    "",
    "Welcome to EduTrack!",
    "",
    `Hello ${cleanName},`,
    "Your EduTrack Bangladesh account is ready. You can now access your dashboard to manage your profile, tuition connections, and academic sessions.",
    "",
    customMessage && customMessage.trim() ? stripDecorativeSymbols(customMessage) : guidanceText,
    "",
    `Account Role: ${roleLabel}`,
  ];

  if (district) lines.push(`District / Location: ${district}`);
  if (isTutor && (university || course)) {
    lines.push(`Institution: ${[university, course].filter(Boolean).join(" - ")}`);
  } else if (!isTutor && (studentClass || school)) {
    lines.push(`Academic Details: ${[studentClass, school].filter(Boolean).join(" - ")}`);
  }
  if (isTutor && computedProfileUrl) {
    lines.push(`Teacher Profile: ${computedProfileUrl}`);
  }

  lines.push(
    "",
    `Go to Dashboard: ${dashboardUrl}`,
    "",
    "EduTrack Bangladesh",
    `Contact Support: edutrackbangladesh@gmail.com (${email})`,
    `© ${currentYear} EduTrack Bangladesh`
  );

  return lines.join("\n");
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
  category?: "promotional" | "announcement" | "update" | "custom";
  actionButtonText?: string;
  actionButtonUrl?: string;
  baseUrl?: string;
}

export function generateBulkCampaignEmailHtml({
  recipientName,
  recipientEmail,
  recipientRole = "member",
  recipientDistrict,
  subject,
  preheader,
  headline,
  messageBody,
  category = "update",
  actionButtonText,
  actionButtonUrl,
  baseUrl = "https://edutrackbd.vercel.app",
}: BulkCampaignEmailParams): string {
  const displayName = stripDecorativeSymbols(recipientName?.trim() || recipientEmail.split("@")[0]);
  const roleLabel =
    recipientRole === "tutor"
      ? "Tutor"
      : recipientRole === "student"
        ? "Student / Guardian"
        : "Platform Member";

  const processedBody = String(messageBody || "")
    .replace(/\{\{\s*name\s*\}\}/gi, displayName)
    .replace(/\{\{\s*email\s*\}\}/gi, recipientEmail)
    .replace(/\{\{\s*role\s*\}\}/gi, roleLabel)
    .replace(/\{\{\s*district\s*\}\}/gi, recipientDistrict || "Bangladesh");

  const paragraphs = processedBody
    .split(/\n\s*\n/)
    .map((block) => {
      const trimmed = stripDecorativeSymbols(block);
      if (!trimmed) return "";
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.every((l) => l.startsWith("•") || l.startsWith("-"))) {
        const items = lines
          .map((line) => {
            const clean = escapeHtml(stripDecorativeSymbols(line.replace(/^[•\-]\s*/, "")));
            return clean
              ? `<li style="margin-bottom: 8px; color: #475569; font-size: 15px; line-height: 1.6;">${clean}</li>`
              : "";
          })
          .join("");
        return `<ul style="margin: 0 0 16px 0; padding-left: 20px; color: #155DFC;">${items}</ul>`;
      }
      const safeBlock = lines.map((l) => escapeHtml(stripDecorativeSymbols(l))).join("<br/>");
      return `<p class="text-secondary" style="margin: 0 0 16px 0; line-height: 1.6; color: #475569; font-size: 15px;">${safeBlock}</p>`;
    })
    .join("");

  let categoryLabel = "PLATFORM UPDATE";
  if (category === "promotional") {
    categoryLabel = "SPECIAL OFFER";
  } else if (category === "announcement") {
    categoryLabel = "IMPORTANT ANNOUNCEMENT";
  } else if (category === "custom") {
    categoryLabel = "OFFICIAL NOTICE";
  }

  const cleanHeadline = stripDecorativeSymbols(headline || subject || "EduTrack Bangladesh Update");
  const cleanSnippet = stripDecorativeSymbols(preheader || cleanHeadline);
  const cleanButtonLabel = actionButtonText ? stripDecorativeSymbols(actionButtonText) : "";
  const cleanButtonUrl = actionButtonUrl || `${String(baseUrl).replace(/\/+$/, "")}/dashboard`;

  const bodyHtml = `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="padding-bottom: 12px;">
                    <div class="accent-label" style="font-size: 11px; font-weight: 700; color: #155DFC; letter-spacing: 1.4px; text-transform: uppercase;">
                      ${escapeHtml(categoryLabel)}
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="padding-bottom: 18px;">
                    <p class="text-primary" style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #101828;">
                      Hello ${escapeHtml(displayName)},
                    </p>
                    <p class="text-muted" style="margin: 0; font-size: 13px; color: #64748B;">
                      Account Role: ${escapeHtml(roleLabel)}${recipientDistrict ? ` | District: ${escapeHtml(recipientDistrict)}` : ""}
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="padding-bottom: 12px;">
                    ${paragraphs}
                  </td>
                </tr>
              </table>

              ${cleanButtonLabel && cleanButtonUrl ? renderEmailPrimaryButton(cleanButtonLabel, cleanButtonUrl) : ""}`;

  return renderEduTrackEmailLayout({
    title: stripDecorativeSymbols(subject || cleanHeadline),
    preheader: cleanSnippet,
    recipientEmail,
    heading: cleanHeadline,
    bodyHtml,
  });
}

export function generateBulkCampaignEmailText({
  recipientName,
  recipientEmail,
  recipientRole = "member",
  recipientDistrict,
  subject,
  headline,
  messageBody,
  actionButtonText,
  actionButtonUrl,
}: BulkCampaignEmailParams): string {
  const displayName = stripDecorativeSymbols(recipientName?.trim() || recipientEmail.split("@")[0]);
  const roleLabel =
    recipientRole === "tutor"
      ? "Tutor"
      : recipientRole === "student"
        ? "Student / Guardian"
        : "Platform Member";
  const processedBody = stripDecorativeSymbols(
    String(messageBody || "")
      .replace(/\{\{\s*name\s*\}\}/gi, displayName)
      .replace(/\{\{\s*email\s*\}\}/gi, recipientEmail)
      .replace(/\{\{\s*role\s*\}\}/gi, roleLabel)
      .replace(/\{\{\s*district\s*\}\}/gi, recipientDistrict || "Bangladesh")
  );
  const currentYear = new Date().getFullYear();

  const lines = [
    "EduTrack BANGLADESH",
    "",
    stripDecorativeSymbols(headline || subject || "EduTrack Bangladesh Update"),
    "",
    `Hello ${displayName},`,
    "",
    processedBody,
  ];

  if (actionButtonText && actionButtonUrl) {
    lines.push("", `${stripDecorativeSymbols(actionButtonText)}: ${actionButtonUrl}`);
  }

  lines.push(
    "",
    "EduTrack Bangladesh",
    `Contact Support: edutrackbangladesh@gmail.com (${recipientEmail})`,
    `© ${currentYear} EduTrack Bangladesh`
  );

  return lines.join("\n");
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


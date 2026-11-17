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

function maskEmail(email: string): string {
  const parts = String(email || "").split("@");
  if (parts.length !== 2) return "***";
  const local = parts[0];
  return `${local.slice(0, Math.min(2, local.length))}***@${parts[1]}`;
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
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || "edutrackbangladesh@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "EduTrack Bangladesh";

  if (!apiKey || apiKey === "MY_BREVO_API_KEY" || apiKey === "undefined" || apiKey === "null") {
    console.warn(`[Brevo Email Service] BREVO_API_KEY is not configured. Email to ${maskEmail(toEmail)} logged.`);
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
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      const errorBody: any = await response.json().catch(() => ({}));
      console.warn("[Brevo Email API Warning]:", JSON.stringify({ status: response.status, code: errorBody?.code, message: errorBody?.message }));
      
      const errMsg = errorBody.message || errorBody.code || `Brevo API error (HTTP ${response.status})`;
      const lowerMsg = String(errMsg).toLowerCase();

      if (lowerMsg.includes("unrecognised ip") || lowerMsg.includes("authorised_ips") || lowerMsg.includes("authorised ip")) {
        return {
          success: false,
          code: "EMAIL_IP_RESTRICTED",
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
          code: "EMAIL_AUTH_ERROR",
          isKeyError: true,
          error: "Brevo API Key / Account Configuration Notice",
          message: `Brevo Notice: ${errMsg}. Please verify BREVO_API_KEY and verified sender email in Brevo dashboard.`,
          rawError: errMsg
        };
      }

      return {
        success: false,
        code: "EMAIL_PROVIDER_ERROR",
        isEmailError: true,
        error: "Brevo Delivery Warning",
        message: errMsg,
        rawError: errMsg
      };
    }

    const data = await response.json();
    console.log(`[Brevo Email Sent] Successfully sent email to ${maskEmail(toEmail)}. ID:`, data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (err: any) {
    console.warn("[Brevo Email Network Exception]:", err?.message || err);
    return {
      success: false,
      code: "EMAIL_NETWORK_ERROR",
      isNetworkError: true,
      error: "Email Service Network Exception",
      message: err?.message || "Failed to reach email delivery service.",
    };
  }
}

export type WorkflowNotificationEventType =
  | "tutor_request_created"
  | "tuition_application_received"
  | "tutor_shortlisted"
  | "request_accepted"
  | "request_declined"
  | "trial_scheduled"
  | "trial_rescheduled"
  | "trial_confirmed"
  | "trial_cancelled"
  | "tuition_confirmed"
  | "booking_cancelled"
  | "schedule_changed"
  | "tuition_alert_digest";

export interface WorkflowEmailParams {
  eventType: WorkflowNotificationEventType;
  recipientEmail: string;
  recipientName?: string;
  actorName?: string;
  actorInstitution?: string;
  tuitionTitle?: string;
  subjectLabel?: string;
  classLabel?: string;
  areaDistrictLabel?: string;
  scheduleLabel?: string;
  proposedSalaryLabel?: string;
  summaryNote?: string;
  actionUrl?: string;
  baseUrl?: string;
}

export function redactSensitiveContactText(input: unknown): string {
  const cleaned = stripDecorativeSymbols(String(input || ""));
  if (!cleaned) return "";
  return cleaned
    // Redact Bangladesh mobile numbers (+8801..., 8801..., 01XXXXXXXXX with optional dashes/spaces)
    .replace(/(?:\+?88[\s-]?)?0?1[3-9](?:[\s-]?\d){8}/g, "[contact hidden]")
    // Redact other long numeric identifiers (e.g. NID / phone)
    .replace(/\b\d{8,17}\b/g, "[number hidden]")
    // Redact email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email hidden]")
    .trim();
}

interface WorkflowTemplateCopy {
  emailSubject: string;
  preheader: string;
  categoryLabel: string;
  heading: string;
  introEnglish: string;
  bengaliNotice: string;
  ctaLabel: string;
}

function getWorkflowTemplateCopy(params: WorkflowEmailParams): WorkflowTemplateCopy {
  const actor = stripDecorativeSymbols(params.actorName || "an EduTrack member");
  const title = stripDecorativeSymbols(params.tuitionTitle || params.subjectLabel || "your tuition");

  switch (params.eventType) {
    case "tutor_request_created":
      return {
        emailSubject: "New Tutor Request | EduTrack Bangladesh",
        preheader: `${actor} sent you a new tutoring request on EduTrack Bangladesh.`,
        categoryLabel: "NEW TUTOR REQUEST",
        heading: "You Have a New Tutoring Request!",
        introEnglish: `${actor} has sent you a tutoring request${params.subjectLabel ? ` for ${stripDecorativeSymbols(params.subjectLabel)}` : ""}. Review the summary below and respond from your EduTrack Dashboard.`,
        bengaliNotice: "আপনার কাছে একটি নতুন টিউশনের অনুরোধ এসেছে। বিস্তারিত দেখতে EduTrack Dashboard-এ প্রবেশ করুন।",
        ctaLabel: "View Request",
      };
    case "tuition_application_received":
      return {
        emailSubject: "New Tutor Application Received | EduTrack Bangladesh",
        preheader: `${actor} applied to ${title} on EduTrack Bangladesh.`,
        categoryLabel: "NEW TUTOR APPLICATION",
        heading: "A Tutor Has Applied to Your Tuition!",
        introEnglish: `${actor}${params.actorInstitution ? ` (${stripDecorativeSymbols(params.actorInstitution)})` : ""} has applied to your tuition post${params.tuitionTitle ? ` "${stripDecorativeSymbols(params.tuitionTitle)}"` : ""}. Review their verified qualifications in your dashboard.`,
        bengaliNotice: "আপনার টিউশন পোস্টে একজন শিক্ষক আবেদন করেছেন। তাঁর প্রোফাইল ও যোগ্যতা দেখে পরবর্তী সিদ্ধান্ত নিতে পারেন।",
        ctaLabel: "Review Application",
      };
    case "tutor_shortlisted":
      return {
        emailSubject: "Application Shortlisted | EduTrack Bangladesh",
        preheader: `Your application for ${title} has been shortlisted.`,
        categoryLabel: "APPLICATION UPDATE",
        heading: "You Have Been Shortlisted!",
        introEnglish: `${actor} has shortlisted your application for ${title}. Watch for a message or trial class invitation in your dashboard.`,
        bengaliNotice: "অভিনন্দন! আপনার টিউশন আবেদনটি শর্টলিস্ট করা হয়েছে। বিস্তারিত দেখতে EduTrack Dashboard-এ প্রবেশ করুন।",
        ctaLabel: "View Application",
      };
    case "request_accepted":
      return {
        emailSubject: "Tutoring Request Accepted | EduTrack Bangladesh",
        preheader: `${actor} accepted your tutoring request.`,
        categoryLabel: "REQUEST ACCEPTED",
        heading: "Your Tutoring Request Was Accepted!",
        introEnglish: `${actor} has accepted your tutoring request for ${title}. You can now view full coordination details inside your EduTrack Dashboard.`,
        bengaliNotice: "আপনার টিউশন অনুরোধটি গৃহীত হয়েছে। পরবর্তী ক্লাসের সময়সূচি ও সমন্বয়ের জন্য ড্যাশবোর্ড দেখুন।",
        ctaLabel: "View Schedule",
      };
    case "request_declined":
      return {
        emailSubject: "Tutoring Request Update | EduTrack Bangladesh",
        preheader: `Update regarding your tutoring request for ${title}.`,
        categoryLabel: "REQUEST UPDATE",
        heading: "Tutoring Request Update",
        introEnglish: `Thank you for your interest in ${title}. The other party is unable to proceed with this request at the moment. You can explore other matching options in your dashboard.`,
        bengaliNotice: "এই মুহূর্তে অনুরোধটি গৃহীত হয়নি। ড্যাশবোর্ড থেকে অন্যান্য উপযুক্ত শিক্ষক বা টিউশন সার্কুলার দেখতে পারেন।",
        ctaLabel: "Open Dashboard",
      };
    case "trial_scheduled":
      return {
        emailSubject: "Trial Class Scheduled | EduTrack Bangladesh",
        preheader: `A trial class has been proposed for ${title}.`,
        categoryLabel: "TRIAL CLASS SCHEDULE",
        heading: "Trial Class Scheduled!",
        introEnglish: `${actor} has proposed a trial / demo class for ${title}${params.scheduleLabel ? ` on ${stripDecorativeSymbols(params.scheduleLabel)}` : ""}. Please confirm or suggest an alternate time in your dashboard.`,
        bengaliNotice: "একটি ট্রায়াল বা ডেমো ক্লাসের সময় নির্ধারণ করা হয়েছে। বিস্তারিত দেখতে ও সময় নিশ্চিত করতে ড্যাশবোর্ডে প্রবেশ করুন।",
        ctaLabel: "Review Trial Schedule",
      };
    case "trial_rescheduled":
      return {
        emailSubject: "Trial Schedule Updated | EduTrack Bangladesh",
        preheader: `${actor} suggested an alternate trial class time.`,
        categoryLabel: "TRIAL RESCHEDULED",
        heading: "Alternate Trial Time Suggested",
        introEnglish: `${actor} suggested a new trial class time for ${title}${params.scheduleLabel ? `: ${stripDecorativeSymbols(params.scheduleLabel)}` : ""}. Open your dashboard to confirm or adjust the slot.`,
        bengaliNotice: "ট্রায়াল ক্লাসের একটি নতুন সময় প্রস্তাব করা হয়েছে। অনুগ্রহ করে ড্যাশবোর্ডে গিয়ে যাচাই ও নিশ্চিত করুন।",
        ctaLabel: "Confirm Trial Time",
      };
    case "trial_confirmed":
      return {
        emailSubject: "Trial Class Confirmed | EduTrack Bangladesh",
        preheader: `Your trial class for ${title} is confirmed.`,
        categoryLabel: "TRIAL CONFIRMED",
        heading: "Trial Class Schedule Confirmed!",
        introEnglish: `Both parties have agreed on the trial class schedule for ${title}${params.scheduleLabel ? ` (${stripDecorativeSymbols(params.scheduleLabel)})` : ""}.`,
        bengaliNotice: "উভয় পক্ষের সম্মতিতে ট্রায়াল ক্লাসের সময়সূচি নিশ্চিত হয়েছে। নির্ধারিত সময়ে অংশগ্রহণের জন্য ড্যাশবোর্ড দেখুন।",
        ctaLabel: "View Trial Details",
      };
    case "trial_cancelled":
      return {
        emailSubject: "Trial Class Cancelled | EduTrack Bangladesh",
        preheader: `The trial class for ${title} was cancelled.`,
        categoryLabel: "TRIAL CANCELLED",
        heading: "Trial Class Cancelled",
        introEnglish: `${actor} has cancelled the scheduled trial class for ${title}. Visit your dashboard to view other options or reschedule.`,
        bengaliNotice: "নির্ধারিত ট্রায়াল ক্লাসটি বাতিল করা হয়েছে। বিস্তারিত তথ্য আপনার ড্যাশবোর্ডে দেখতে পারেন।",
        ctaLabel: "Open Dashboard",
      };
    case "tuition_confirmed":
      return {
        emailSubject: "Tuition Confirmed | EduTrack Bangladesh",
        preheader: `Your tuition connection for ${title} is confirmed.`,
        categoryLabel: "TUITION CONFIRMED",
        heading: "Your Tuition Connection Is Confirmed!",
        introEnglish: `${actor} has confirmed the tuition engagement for ${title}. You can now manage classes, schedules, and logs in your EduTrack Dashboard.`,
        bengaliNotice: "অভিনন্দন! আপনার টিউশন নিয়োগ চূড়ান্ত হয়েছে। নিয়মিত ক্লাস ও সময়সূচি পরিচালনা করতে ড্যাশবোর্ডে প্রবেশ করুন।",
        ctaLabel: "Go to Dashboard",
      };
    case "booking_cancelled":
      return {
        emailSubject: "Booking Cancelled | EduTrack Bangladesh",
        preheader: `A tuition booking for ${title} was cancelled.`,
        categoryLabel: "BOOKING CANCELLED",
        heading: "Tutoring Booking Cancelled",
        introEnglish: `${actor} has cancelled the tutoring booking for ${title}. Open your dashboard to review your current schedule.`,
        bengaliNotice: "একটি টিউশন বুকিং বাতিল করা হয়েছে। সর্বশেষ অবস্থা দেখতে আপনার ড্যাশবোর্ডে প্রবেশ করুন।",
        ctaLabel: "View Dashboard",
      };
    case "schedule_changed":
      return {
        emailSubject: "Important Schedule Update | EduTrack Bangladesh",
        preheader: `Schedule update for ${title}.`,
        categoryLabel: "SCHEDULE UPDATE",
        heading: "Tutoring Schedule Updated",
        introEnglish: `${actor} updated the schedule details for ${title}${params.scheduleLabel ? ` to ${stripDecorativeSymbols(params.scheduleLabel)}` : ""}. Please check your dashboard to stay synchronized.`,
        bengaliNotice: "আপনার টিউশনের সময়সূচিতে একটি পরিবর্তন করা হয়েছে। আপডেট দেখতে ড্যাশবোর্ডে প্রবেশ করুন।",
        ctaLabel: "View Schedule",
      };
    case "tuition_alert_digest":
    default:
      return {
        emailSubject: "Matching Tuition Opportunity | EduTrack Bangladesh",
        preheader: `A new tuition matches your profile on EduTrack Bangladesh.`,
        categoryLabel: "SMART TUITION ALERT",
        heading: "New Tuition Matches Your Profile!",
        introEnglish: `A new tuition requirement${params.tuitionTitle ? ` (${stripDecorativeSymbols(params.tuitionTitle)})` : ""} matches your subjects, class level, and location preferences on EduTrack Bangladesh.`,
        bengaliNotice: "আপনার বিষয় ও এলাকার সাথে সামঞ্জস্যপূর্ণ একটি নতুন টিউশন সার্কুলার প্রকাশিত হয়েছে। বিস্তারিত দেখে আবেদন করুন।",
        ctaLabel: "Explore Tuition",
      };
  }
}

export function generateWorkflowNotificationEmailHtml(params: WorkflowEmailParams): string {
  const copy = getWorkflowTemplateCopy(params);
  const cleanRecipientName = stripDecorativeSymbols(params.recipientName || "").trim() || "there";
  const cleanBaseUrl = String(params.baseUrl || "https://edutrackbd.vercel.app").replace(/\/+$/, "");
  const actionUrl = params.actionUrl && params.actionUrl.startsWith("https://")
    ? params.actionUrl
    : `${cleanBaseUrl}/dashboard`;

  const detailRows: Array<{ label: string; value: string }> = [];
  if (params.tuitionTitle) {
    detailRows.push({ label: "Tuition", value: escapeHtml(stripDecorativeSymbols(params.tuitionTitle)) });
  }
  if (params.subjectLabel) {
    detailRows.push({ label: "Subject", value: escapeHtml(stripDecorativeSymbols(params.subjectLabel)) });
  }
  if (params.classLabel) {
    detailRows.push({ label: "Class / Level", value: escapeHtml(stripDecorativeSymbols(params.classLabel)) });
  }
  if (params.areaDistrictLabel) {
    detailRows.push({ label: "General Area", value: escapeHtml(stripDecorativeSymbols(params.areaDistrictLabel)) });
  }
  if (params.scheduleLabel) {
    detailRows.push({ label: "Schedule (BDT)", value: escapeHtml(stripDecorativeSymbols(params.scheduleLabel)) });
  }
  if (params.proposedSalaryLabel) {
    detailRows.push({ label: "Monthly Honorarium", value: escapeHtml(stripDecorativeSymbols(params.proposedSalaryLabel)) });
  }
  if (params.actorInstitution) {
    detailRows.push({ label: "Institution", value: escapeHtml(stripDecorativeSymbols(params.actorInstitution)) });
  }

  const safeNote = redactSensitiveContactText(params.summaryNote || "").slice(0, 320);

  const detailsTableHtml = detailRows.length > 0
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding-bottom: 20px;">
                <tr>
                  <td>
                    <table role="presentation" class="info-box" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                      ${detailRows
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
              </table>`
    : "";

  const noteHtml = safeNote
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding-bottom: 20px;">
                <tr>
                  <td>
                    <table role="presentation" class="info-box" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                      <tr>
                        <td style="padding: 14px 16px;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">
                            NOTE SUMMARY
                          </div>
                          <p class="text-secondary" style="margin: 0; font-size: 14px; line-height: 1.55; color: #475569;">
                            ${escapeHtml(safeNote)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`
    : "";

  const bodyHtml = `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="padding-bottom: 10px;">
                    <div class="accent-label" style="font-size: 11px; font-weight: 700; color: #155DFC; letter-spacing: 1.4px; text-transform: uppercase;">
                      ${escapeHtml(copy.categoryLabel)}
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="padding-bottom: 18px;">
                    <p class="text-primary" style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #101828;">
                      Hello ${escapeHtml(cleanRecipientName)},
                    </p>
                    <p class="text-secondary" style="margin: 0; font-size: 15px; line-height: 1.6; color: #475569;">
                      ${escapeHtml(copy.introEnglish)}
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding-bottom: 20px;">
                <tr>
                  <td>
                    <table role="presentation" class="accent-box" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px;">
                      <tr>
                        <td style="padding: 16px 18px;">
                          <p class="text-primary" style="margin: 0; font-size: 14px; line-height: 1.7; color: #101828; font-weight: 500;">
                            ${escapeHtml(copy.bengaliNotice)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${detailsTableHtml}
              ${noteHtml}

              ${renderEmailPrimaryButton(copy.ctaLabel, actionUrl)}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 18px;">
                    <p class="text-muted" style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748B;">
                      For your privacy and safety, direct phone numbers, NID documents, and exact home addresses are never included in notification emails.
                    </p>
                  </td>
                </tr>
              </table>`;

  return renderEduTrackEmailLayout({
    title: copy.emailSubject,
    preheader: copy.preheader,
    recipientEmail: params.recipientEmail,
    heading: copy.heading,
    bodyHtml,
  });
}

export function generateWorkflowNotificationEmailText(params: WorkflowEmailParams): {
  subject: string;
  textContent: string;
} {
  const copy = getWorkflowTemplateCopy(params);
  const cleanRecipientName = stripDecorativeSymbols(params.recipientName || "").trim() || "there";
  const cleanBaseUrl = String(params.baseUrl || "https://edutrackbd.vercel.app").replace(/\/+$/, "");
  const actionUrl = params.actionUrl && params.actionUrl.startsWith("https://")
    ? params.actionUrl
    : `${cleanBaseUrl}/dashboard`;
  const currentYear = new Date().getFullYear();

  const lines: string[] = [
    "EduTrack BANGLADESH",
    "",
    copy.heading,
    "",
    `Hello ${cleanRecipientName},`,
    "",
    copy.introEnglish,
    "",
    copy.bengaliNotice,
    "",
  ];

  if (params.tuitionTitle) lines.push(`Tuition: ${stripDecorativeSymbols(params.tuitionTitle)}`);
  if (params.subjectLabel) lines.push(`Subject: ${stripDecorativeSymbols(params.subjectLabel)}`);
  if (params.classLabel) lines.push(`Class / Level: ${stripDecorativeSymbols(params.classLabel)}`);
  if (params.areaDistrictLabel) lines.push(`General Area: ${stripDecorativeSymbols(params.areaDistrictLabel)}`);
  if (params.scheduleLabel) lines.push(`Schedule (BDT): ${stripDecorativeSymbols(params.scheduleLabel)}`);
  if (params.proposedSalaryLabel) lines.push(`Monthly Honorarium: ${stripDecorativeSymbols(params.proposedSalaryLabel)}`);
  if (params.actorInstitution) lines.push(`Institution: ${stripDecorativeSymbols(params.actorInstitution)}`);

  const safeNote = redactSensitiveContactText(params.summaryNote || "").slice(0, 320);
  if (safeNote) {
    lines.push("", `Note Summary: ${safeNote}`);
  }

  lines.push(
    "",
    `${copy.ctaLabel}: ${actionUrl}`,
    "",
    "For your privacy and safety, direct phone numbers, NID documents, and exact home addresses are never included in notification emails.",
    "",
    "EduTrack Bangladesh",
    `Contact Support: edutrackbangladesh@gmail.com (${params.recipientEmail})`,
    `© ${currentYear} EduTrack Bangladesh`
  );

  return {
    subject: copy.emailSubject,
    textContent: lines.join("\n"),
  };
}

export default function mailModuleHandler(_req: any, res: any) {
  res.status(200).json({ status: "EduTrack Mail Service Module Active" });
}



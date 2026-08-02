import "dotenv/config";

export interface SendWelcomeEmailParams {
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

export function generateWelcomeEmailHtml({
  name,
  role,
  studentClass,
  school,
  university,
  course,
  district,
  customMessage,
}: SendWelcomeEmailParams): string {
  const isTutor = role === 'tutor';
  const targetDashboardUrl = "https://edutrackbd.vercel.app/dashboard";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to EduTrack Bangladesh</title>
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
              
              <!-- Brand Badge with Official Site Logo -->
              <div style="display: inline-flex; align-items: center; background: rgba(255, 255, 255, 0.12); padding: 10px 22px; border-radius: 50px; border: 1px solid rgba(255, 255, 255, 0.25); margin-bottom: 22px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <img src="https://edutrackbd.vercel.app/logo.svg" alt="EduTrack Bangladesh Logo" width="32" height="32" style="width: 32px; height: 32px; border-radius: 8px; vertical-align: middle; margin-right: 10px; display: inline-block; object-fit: contain;" />
                <span style="color: #ffffff; font-size: 19px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">EduTrack</span>
                <span style="background-color: #0D5BFF; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase; margin-left: 8px;">BANGLADESH</span>
              </div>

              <!-- Main Title -->
              <h1 style="color: #ffffff; font-size: 26px; font-weight: 900; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">
                Welcome to the Future of Education!
              </h1>

              <!-- Subtitle -->
              <p style="color: #93c5fd; font-size: 13px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                Bangladesh's #1 Security-First Home & Online Tutoring Ecosystem
              </p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              
              <!-- Greeting -->
              <div style="margin-bottom: 24px;">
                <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">
                  Hello ${name || 'Valued Educator & Scholar'},
                </h2>
                <p style="font-size: 14px; line-height: 1.65; color: #475569; margin: 0;">
                  Congratulations and welcome to <strong>EduTrack Bangladesh</strong>! Your account has been officially created as a <span style="display: inline-block; background-color: ${isTutor ? '#fef3c7' : '#dbeafe'}; color: ${isTutor ? '#b45309' : '#1d4ed8'}; font-weight: 800; padding: 2px 10px; border-radius: 8px; font-size: 11px; text-transform: uppercase; border: 1px solid ${isTutor ? '#fcd34d' : '#bfdbfe'};">${role}</span>.
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
                    <td style="padding: 4px 0; color: #0D5BFF; font-weight: 800; text-transform: capitalize;">${role}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 600;">District / Area:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${district || 'Bangladesh (All Districts)'}</td>
                  </tr>
                  ${isTutor ? `
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Academic Institution:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${university || course || 'University Scholar'}</td>
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
                      <span style="display: inline-block; background-color: #d1fae5; color: #047857; padding: 1px 8px; border-radius: 6px; font-size: 10px; uppercase">Protected Account</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Primary Action Button Section -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${targetDashboardUrl}" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0D5BFF 0%, #0040C9 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; padding: 18px 42px; border-radius: 16px; box-shadow: 0 10px 25px rgba(13, 91, 255, 0.4); border: 1px solid rgba(255,255,255,0.2);">
                  <span>OPEN YOUR DASHBOARD</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 10px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
                <p style="font-size: 11px; color: #94a3b8; margin-top: 10px; font-weight: 600;">
                  Direct Portal URL: <a href="${targetDashboardUrl}" style="color: #0D5BFF; text-decoration: none;">https://edutrackbd.vercel.app/dashboard</a>
                </p>
              </div>

              <!-- Tailored Walkthrough for Role -->
              <div style="background-color: #f1f5f9; border-radius: 20px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
                <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 0 0 16px 0; letter-spacing: 0.5px; display: flex; align-items: center;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D5BFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span>${isTutor ? 'Action Items for Tutors & Educators:' : 'Quick Start Guide for Students & Guardians:'}</span>
                </h3>

                ${isTutor ? `
                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; shrink: 0;">1</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Complete Verification:</strong> Upload your NID / Birth Certificate & Student ID Card under your dashboard's <em>Verification</em> tab for full account badge approval.
                  </div>
                </div>

                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; shrink: 0;">2</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Set Subjects & Salary:</strong> Specify your preferred teaching classes, subjects, district areas, and expected monthly salary.
                  </div>
                </div>

                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; shrink: 0;">3</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Accept Tuition Requests & GPS:</strong> Receive direct tuition booking requests from guardians and use live location tracking for attendance verification.
                  </div>
                </div>

                <div style="display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; shrink: 0;">4</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Instant Payouts:</strong> Request instant withdrawals to <strong>bKash</strong>, <strong>Nagad</strong>, or direct Bank transfer upon class completion.
                  </div>
                </div>
                ` : `
                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; shrink: 0;">1</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Search & Filter Tutors:</strong> Explore thousands of verified teachers filtered by District, Subject, Class, Institution, and Gender preference.
                  </div>
                </div>

                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; shrink: 0;">2</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Hire & Track Live Location:</strong> Monitor your tutor's live GPS route to your house and get real-time lesson arrival updates.
                  </div>
                </div>

                <div style="margin-bottom: 12px; display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; shrink: 0;">3</div>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong>Digital Class Diary:</strong> Access detailed lesson logs, homework assignments, class duration reports, and performance metrics.
                  </div>
                </div>

                <div style="display: flex; align-items: start;">
                  <div style="background: #0D5BFF; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-right: 12px; shrink: 0;">4</div>
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
                <div class="creator-badge" style="background: linear-gradient(135deg, rgba(13, 91, 255, 0.2) 0%, rgba(124, 58, 237, 0.25) 100%); border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 50px; padding: 6px 18px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(13, 91, 255, 0.25);">
                  <span style="color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; margin-right: 6px;">
                    Designed & Built by
                  </span>
                  <span style="color: #60a5fa; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; text-shadow: 0 0 12px rgba(96, 165, 250, 0.5); display: inline-flex; align-items: center;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#60a5fa" stroke="#60a5fa" stroke-width="1" style="vertical-align: middle; margin-right: 4px;"><path d="M12 2l2.4 7.2L21.6 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8z"/></svg>
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

export async function sendBrevoEmail({
  toEmail,
  toName,
  subject,
  htmlContent,
}: {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
}) {
  const apiKey = process.env.BREVO_API_KEY || "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";
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "edutrackbangladesh@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "EduTrack Bangladesh";

  if (!apiKey || apiKey === "MY_BREVO_API_KEY" || apiKey === "undefined" || apiKey === "null") {
    console.warn(`[Brevo Email Service] BREVO_API_KEY is missing. Email to ${toEmail} logged.`);
    return {
      success: true,
      simulated: true,
      message: "Brevo API Key is not configured. Email logged successfully.",
    };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
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
    }),
  });

  if (!response.ok) {
    const errorBody: any = await response.json().catch(() => ({}));
    console.error("[Brevo Email Error]:", errorBody);
    
    const errMsg = errorBody.message || `Brevo API error (HTTP ${response.status})`;

    if (errMsg.includes("unrecognised IP address") || errMsg.includes("authorised_ips") || errMsg.includes("authorised")) {
      return {
        success: false,
        isIpError: true,
        error: "Brevo IP Whitelist Restriction Active",
        message: "Brevo Security Notice: Your Brevo API key has IP restrictions enabled. Please go to https://app.brevo.com/security/authorised_ips and disable IP restrictions or authorize server IPs.",
        brevoLink: "https://app.brevo.com/security/authorised_ips",
        rawError: errMsg
      };
    }

    throw new Error(errMsg);
  }

  const data = await response.json();
  console.log(`[Brevo Email Sent] Successfully sent email to ${toEmail}. ID:`, data.messageId);
  return { success: true, messageId: data.messageId };
}

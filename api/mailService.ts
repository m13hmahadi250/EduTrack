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
  const appUrl = process.env.APP_URL || 'https://edutrack-bangladesh.run.app';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to EduTrack Bangladesh</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <!-- Email Container -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0B132B 0%, #111A2E 50%, #0D5BFF 100%); padding: 36px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); padding: 10px 20px; border-radius: 50px; backdrop-filter: blur(8px); margin-bottom: 16px; border: 1px solid rgba(255, 255, 255, 0.25);">
                <span style="color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">🎓 EduTrack</span>
                <span style="color: #60a5fa; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-left: 6px;">BANGLADESH</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                Welcome to Our Community!
              </h1>
              <p style="color: #93c5fd; font-size: 12px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                Bangladesh's Security-First Home Tutoring Network
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px;">
              
              <!-- Greeting -->
              <p style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0;">
                Hello ${name || 'Valued Member'}, 👋
              </p>

              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                Thank you for registering on <strong>EduTrack Bangladesh</strong> as a <span style="display: inline-block; background-color: ${isTutor ? '#fef3c7' : '#dbeafe'}; color: ${isTutor ? '#d97706' : '#1d4ed8'}; font-weight: 800; padding: 3px 12px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">${role}</span>! We are delighted to welcome you to our platform.
              </p>

              ${customMessage ? `
              <!-- Custom Admin Message Box -->
              <div style="background-color: #eff6ff; border-left: 4px solid #0D5BFF; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1d4ed8; letter-spacing: 1px; margin: 0 0 8px 0;">
                  📢 Message from EduTrack Administration:
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #1e293b; margin: 0; font-weight: 600;">
                  "${customMessage}"
                </p>
              </div>
              ` : ''}

              <!-- Role Overview Box -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 28px;">
                <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0 0 14px 0; letter-spacing: 0.5px;">
                  ${isTutor ? '🚀 Next Steps for Tutors & Educators:' : '📚 Getting Started for Students & Guardians:'}
                </h3>
                
                ${isTutor ? `
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.8;">
                    <li style="margin-bottom: 6px;"><strong>Verification:</strong> Upload your National ID (NID) and Student ID under your dashboard <em>Verification</em> tab.</li>
                    <li style="margin-bottom: 6px;"><strong>Profile Details:</strong> Showcase your academic background (${course || 'Degree'}, ${university || 'University'}), subject expertise, and availability.</li>
                    <li style="margin-bottom: 6px;"><strong>Tuition Matching:</strong> Guardians and students in ${district || 'your district'} can send direct session requests.</li>
                    <li style="margin-bottom: 6px;"><strong>Live GPS & Wallet:</strong> Enable GPS tracking during active classes and request instant withdrawals to <strong>bKash</strong>, <strong>Nagad</strong>, or Bank.</li>
                  </ul>
                ` : `
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.8;">
                    <li style="margin-bottom: 6px;"><strong>Find Verified Tutors:</strong> Filter expert teachers by District, Subject (${school ? 'School: ' + school : ''}), Class (${studentClass || 'All Classes'}), and Gender.</li>
                    <li style="margin-bottom: 6px;"><strong>Live GPS Tracking:</strong> Monitor your tutor's arrival and live location during lessons for student safety.</li>
                    <li style="margin-bottom: 6px;"><strong>Digital Class Diary:</strong> Track lesson logs, class durations, topics taught, and homework assignments.</li>
                    <li style="margin-bottom: 6px;"><strong>Secure Payments:</strong> Pay tuition packages easily via integrated mobile banking (bKash / Nagad).</li>
                  </ul>
                `}
              </div>

              <!-- App Highlights Grid -->
              <p style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 1px; margin: 0 0 16px 0; text-align: center;">
                ⚡ Core EduTrack Pillars:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                <tr>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #f1f5f9; border-radius: 14px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
                      <div style="font-size: 22px; margin-bottom: 4px;">🛡️</div>
                      <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">100% Verified Tutors</div>
                      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">NID & Student ID Audited</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #f1f5f9; border-radius: 14px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
                      <div style="font-size: 22px; margin-bottom: 4px;">📍</div>
                      <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">Live GPS Tracking</div>
                      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Real-Time Safety Map</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #f1f5f9; border-radius: 14px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
                      <div style="font-size: 22px; margin-bottom: 4px;">📝</div>
                      <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">Digital Class Logger</div>
                      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Full Progress Audit Trail</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #f1f5f9; border-radius: 14px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
                      <div style="font-size: 22px; margin-bottom: 4px;">💳</div>
                      <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;">bKash & Nagad</div>
                      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Direct Mobile Wallet Payouts</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${appUrl}/dashboard" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0D5BFF 0%, #0040C9 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 16px 36px; border-radius: 14px; box-shadow: 0 8px 20px rgba(13, 91, 255, 0.35);">
                  Open Your Dashboard →
                </a>
              </div>

              <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
                Questions? Reply directly to this email or contact support at 
                <a href="mailto:edutrackbangladesh@gmail.com" style="color: #0D5BFF; text-decoration: underline; font-weight: 700;">edutrackbangladesh@gmail.com</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0b132b; padding: 24px 32px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px 0;">
                EduTrack Bangladesh
              </p>
              <p style="color: #64748b; font-size: 10px; margin: 0 0 10px 0;">
                Empowering Education with Safety & Trust across All Districts of Bangladesh
              </p>
              <p style="color: #475569; font-size: 10px; margin: 0;">
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

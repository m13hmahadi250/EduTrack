/**
 * Large static HTML blueprint for the welcome email
 * Perfectly aligned with the EduTrack Bangladesh visual brand, layout, and colors.
 */
export function getWelcomeEmailHtml(name: string): string {
  const sanitizedName = name || "Valued Member";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to EduTrack Bangladesh</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">

  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    Welcome to the most secure home tutoring platform in Bangladesh. Let's set up your profile and get started! &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,30,61,0.05); border: 1px solid #e2e8f0;">
          
          <tr>
            <td style="padding: 30px 40px 25px 40px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 26px; font-weight: 800; color: #001e3d; letter-spacing: -0.5px;">
                      <span style="color: #1d63ff;">Edu</span>Track
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #1d63ff; background-color: #eef2ff; padding: 5px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Live in Bangladesh
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 40px 25px 40px; background: linear-gradient(185deg, #ffffff 0%, #fcfdfe 100%);">
              <h1 style="margin: 0 0 15px 0; font-size: 32px; font-weight: 800; color: #001e3d; line-height: 1.2; letter-spacing: -0.5px;">
                EXPERT <span style="color: #1d63ff;">EDUCATION</span><br>AT HOME.
              </h1>
              <p style="margin: 0; font-size: 16px; color: #475569; line-height: 1.6; font-weight: 400;">
                Welcome to the most secure home tutoring platform in Bangladesh. Finding the perfect tutor or managing student connectivity is now simplified, safe, and backed by smart technology.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <div style="background-color: #f8fafc; border-radius: 14px; padding: 28px; border: 1px solid #edf2f7;">
                <h3 style="margin: 0 0 12px 0; font-size: 19px; font-weight: 700; color: #001e3d;">
                  Hello ${sanitizedName},
                </h3>
                <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.65;">
                  Thank you for registering at <span style="font-weight: 600; color: #1d63ff;">EduTrack Bangladesh</span>! We are absolutely thrilled to have you onboard. Whether you are looking for an expert educator or seeking students, your journey towards smarter matching starts right here.
                </p>
                
                <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #001e3d; font-weight: 600;">
                      <span style="color: #1d63ff; font-size: 16px; margin-right: 8px;">✔</span> Science, Commerce, and Arts — Any Tutor, Any Time
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #001e3d; font-weight: 600;">
                      <span style="color: #1d63ff; font-size: 16px; margin-right: 8px;">✔</span> Real-time Live GPS Tracking System
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #001e3d; font-weight: 600;">
                      <span style="color: #1d63ff; font-size: 16px; margin-right: 8px;">✔</span> NID-Verified Educators &amp; Verified Certification
                    </td>
                  </tr>
                </table>
                
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="left" style="padding-top: 5px;">
                      <a href="https://edutrackbd.com/dashboard" style="background-color: #1d63ff; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 5px 15px rgba(29, 99, 255, 0.35);">
                        Complete Your Profile &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px dashed #e2e8f0; padding-top: 25px;">
                <tr>
                  <td valign="middle" style="width: 42px;">
                    <div style="background-color: #ecfdf5; color: #059669; width: 34px; height: 34px; line-height: 34px; text-align: center; border-radius: 50%; font-weight: bold; font-size: 16px;">
                      ✓
                    </div>
                  </td>
                  <td valign="middle" style="padding-left: 12px;">
                    <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #001e3d; text-transform: uppercase; letter-spacing: 0.5px;">
                      Verified Quality &amp; Trust
                    </h4>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">
                      100% of our tutors are manually verified by NID and academic credentials.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #001e3d; padding: 35px 40px; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; text-align: center;">
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #94a3b8;">
                Have questions? Contact us at <a href="mailto:support@edutrackbd.com" style="color: #38bdf8; text-decoration: none; font-weight: 600;">support@edutrackbd.com</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b; letter-spacing: 0.3px;">
                &copy; 2026 EduTrack Bangladesh. All rights reserved.
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

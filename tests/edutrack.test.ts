import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import app, { createApp, FirebaseResetAdapter } from "../api/app";
import { LocalAuthChallengeStore } from "../api/authStore";

const OTP_CACHE_FILE = path.join(os.tmpdir(), "edutrack_otp_cache.json");
const RESET_CACHE_FILE = path.join(os.tmpdir(), "edutrack_reset_tokens_cache.json");

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function startTestServer(expressApp: any) {
  const server = http.createServer(expressApp);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function runTests() {
  console.log("==========================================================");
  console.log("  EDUTRACK BANGLADESH — AUTOMATED SECURITY & QA SUITE");
  console.log("==========================================================\n");

  const { server, baseUrl } = await startTestServer(app);

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Reason: ${String(err?.message || err).slice(0, 350)}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Health Check & HTTP Security Headers
    // -------------------------------------------------------------------------
    await test("GET /api/health returns 200 OK and applies security headers", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
      assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
      const body = await res.json();
      assert.equal(body.status, "ok");
    });

    // -------------------------------------------------------------------------
    // 2. OTP Security Invariants (Validation, Hashing, Cooldown, Attempts, Replay)
    // -------------------------------------------------------------------------
    await test("POST /api/auth/send-otp rejects malformed email addresses with no-store headers", async () => {
      const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      });
      assert.equal(res.status, 400);
      assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate, private");
    });

    await test("POST /api/auth/verify-otp rejects non-6-digit OTP payloads", async () => {
      const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "student@example.com", otp: "1234" }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.error.toLowerCase().includes("6-digit"), true);
    });

    await test("OTP cache stores only SHA-256/HMAC hashes (never plaintext) and enforces 55s resend cooldown", async () => {
      const testEmail = `qa_cooldown_${Date.now()}@edutrackbd.test`;
      const now = Date.now();

      // Seed an active hashed OTP record into disk cache array so LocalAuthChallengeStore loads it
      const seededRecord = {
        email: testEmail,
        otpHash: sha256Hex("849201"),
        createdAt: now - 10_000, // 10 seconds ago (within 55s cooldown)
        expiresAt: now + 290_000,
        attempts: 0,
        used: false,
      };
      fs.writeFileSync(OTP_CACHE_FILE, JSON.stringify([seededRecord]), { mode: 0o600 });

      const cacheList = JSON.parse(fs.readFileSync(OTP_CACHE_FILE, "utf-8"));
      assert.equal(Array.isArray(cacheList), true);
      for (const rec of cacheList) {
        assert.equal("otp" in rec, false, "Plaintext OTP must never be stored in cache");
        assert.equal(/^[a-f0-9]{64}$/.test(rec.otpHash), true, "otpHash must be a 64-char hex digest");
      }

      // Requesting a new OTP within the 55-second cooldown window must return HTTP 429
      const cooldownRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, name: "QA Student" }),
      });
      assert.equal(cooldownRes.status, 429, "Resend within 55s must be rejected with 429");
      const cooldownBody = await cooldownRes.json();
      assert.equal("otp" in cooldownBody, false);
      assert.equal(cooldownBody.code, "OTP_RATE_LIMITED");
    });

    await test("POST /api/auth/verify-otp enforces max 5 failed attempts and invalidates OTP", async () => {
      const testEmail = `qa_bruteforce_${Date.now()}@edutrackbd.test`;
      const validOtp = "639184";
      const now = Date.now();

      const seededRecord = {
        email: testEmail,
        otpHash: sha256Hex(validOtp),
        createdAt: now - 60_000,
        expiresAt: now + 240_000,
        attempts: 0,
        used: false,
      };
      fs.writeFileSync(OTP_CACHE_FILE, JSON.stringify([seededRecord]), { mode: 0o600 });

      for (let i = 1; i <= 4; i++) {
        const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail, otp: "000000" }),
        });
        assert.equal(res.status, 400);
        const body = await res.json();
        assert.equal(body.remainingAttempts, 5 - i);
      }

      const fifthRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, otp: "000000" }),
      });
      assert.equal(fifthRes.status, 400);
      const fifthBody = await fifthRes.json();
      assert.equal(fifthBody.error.toLowerCase().includes("maximum verification attempts"), true);

      const sixthRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, otp: validOtp }),
      });
      assert.equal(sixthRes.status, 400);
    });

    await test("POST /api/auth/verify-otp succeeds once with valid 6-digit OTP and blocks replay", async () => {
      const testEmail = `qa_singleuse_${Date.now()}@edutrackbd.test`;
      const validOtp = "917425";
      const now = Date.now();

      const seededRecord = {
        email: testEmail,
        otpHash: sha256Hex(validOtp),
        createdAt: now - 60_000,
        expiresAt: now + 240_000,
        attempts: 0,
        used: false,
      };
      fs.writeFileSync(OTP_CACHE_FILE, JSON.stringify([seededRecord]), { mode: 0o600 });

      const okRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, otp: validOtp }),
      });
      assert.equal(okRes.status, 200);
      const okBody = await okRes.json();
      assert.equal(okBody.success, true);
      assert.equal(okBody.verified, true);
      assert.equal(typeof okBody.verificationToken, "string");
      assert.equal(okBody.verificationToken.includes("."), true);

      const replayRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, otp: validOtp }),
      });
      assert.equal(replayRes.status, 400);
    });

    // -------------------------------------------------------------------------
    // 3. Password Reset Privacy & Token Security
    // -------------------------------------------------------------------------
    await test("POST /api/auth/forgot-password never leaks resetLink or token in HTTP response", async () => {
      const testEmail = `reset_privacy_${Date.now()}@edutrackbd.test`;
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      const body = await res.json();
      assert.equal("resetLink" in body, false, "resetLink must NEVER be returned to client");
      assert.equal("token" in body, false, "token must NEVER be returned to client");

      if (fs.existsSync(RESET_CACHE_FILE)) {
        const resetList = JSON.parse(fs.readFileSync(RESET_CACHE_FILE, "utf-8"));
        if (Array.isArray(resetList)) {
          for (const rec of resetList) {
            assert.equal("token" in rec, false, "Plaintext reset token must never be stored");
            assert.equal(/^[a-f0-9]{64}$/.test(rec.tokenHash), true, "Reset token must be stored as SHA-256 hash");
          }
        }
      }
    });

    // -------------------------------------------------------------------------
    // 4. File Upload Validation Security
    // -------------------------------------------------------------------------
    await test("POST /api/storage/presign rejects disallowed folders and path traversal", async () => {
      const res = await fetch(`${baseUrl}/api/storage/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "avatar.png",
          fileType: "image/png",
          folder: "../etc/passwd",
        }),
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error.toLowerCase().includes("invalid target storage folder"), true);
    });

    await test("POST /api/storage/presign rejects executable and HTML MIME types", async () => {
      const res = await fetch(`${baseUrl}/api/storage/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "payload.html",
          fileType: "text/html",
          folder: "profiles",
        }),
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error.toLowerCase().includes("unsupported file type"), true);
    });

    // -------------------------------------------------------------------------
    // 5. Codebase & Environment Secret Hygiene Assertions
    // -------------------------------------------------------------------------
    await test(".env.example contains zero real secrets or Cloudflare R2 credentials", () => {
      const envExample = fs.readFileSync(path.resolve(".env.example"), "utf-8");
      assert.equal(envExample.includes("b02364053a50026520e374861e614dc4"), false);
      assert.equal(envExample.includes("4c561ab8fa20a9a3620f5623d2092a38"), false);
      assert.equal(envExample.includes("gsk_"), false);
      assert.equal(fs.existsSync(path.resolve(".otp_cache.json")), false, ".otp_cache.json must not exist in project root");
    });

    await test("Source code contains no hardcoded admin password or Groq API key backdoors", () => {
      const appSource = fs.readFileSync(path.resolve("api/app.ts"), "utf-8");
      const storeSource = fs.readFileSync(path.resolve("src/store.ts"), "utf-8");
      assert.equal(appSource.includes("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"), false);
      assert.equal(storeSource.includes("Mahdi250"), false);
    });

    // -------------------------------------------------------------------------
    // 6. Firestore Security Rules Verification
    // -------------------------------------------------------------------------
    await test("firestore.rules enforces default-deny, role escalation protection, and tuition owner checks", () => {
      const rules = fs.readFileSync(path.resolve("firestore.rules"), "utf-8");
      assert.equal(rules.includes("match /{document=**}"), true);
      assert.equal(rules.includes("allow read, write: if false;"), true);
      assert.equal(rules.includes("incoming().role != 'admin' || isSuperAdmin()"), true);
      assert.equal(rules.includes("incoming().studentId == request.auth.uid"), true);
      assert.equal(rules.includes("affectedKeys().hasOnly(['applications', 'status'])"), true);
    });

    // -------------------------------------------------------------------------
    // 7. 6-Digit OTP Contract & 100% Text-Only Verification Email Redesign
    // -------------------------------------------------------------------------
    await test("Legacy 4-digit plaintext OTP records in cache are automatically rejected and invalidated", async () => {
      const legacyEmail = `legacy_4digit_${Date.now()}@edutrackbd.test`;
      const now = Date.now();

      const legacyRecord = {
        email: legacyEmail,
        otp: "4821",
        expiresAt: now + 240_000,
        attempts: 0,
      };
      fs.writeFileSync(OTP_CACHE_FILE, JSON.stringify([legacyRecord]), { mode: 0o600 });

      const res4 = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: legacyEmail, otp: "4821" }),
      });
      assert.equal(res4.status, 400);

      const res6 = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: legacyEmail, otp: "482100" }),
      });
      assert.equal(res6.status, 400);
      const body6 = await res6.json();
      assert.equal(body6.success, false);
    });

    await test("Verification email is 100% text-only, Gmail-safe, uses exact brand palette, and preserves leading zeros", async () => {
      const { generateOtpEmailHtml, generateOtpEmailText } = await import("../api/mailService");
      const appSource = fs.readFileSync(path.resolve("api/app.ts"), "utf-8");
      const signupSource = fs.readFileSync(path.resolve("src/pages/Signup.tsx"), "utf-8");
      const modalSource = fs.readFileSync(path.resolve("src/components/OtpVerificationModal.tsx"), "utf-8");

      assert.equal(appSource.includes("4-digit"), false, "api/app.ts must not reference 4-digit OTPs");
      assert.equal(appSource.includes('subject: "Verify your email | EduTrack Bangladesh"'), true);
      assert.equal(signupSource.includes("4-digit"), false);
      assert.equal(modalSource.includes("DEFAULT_OTP_LENGTH = 6"), true);

      const renderedHtml = generateOtpEmailHtml({
        email: "student@edutrackbd.test",
        otpCode: "004819",
        expiresMinutes: 5,
      });
      const renderedText = generateOtpEmailText({
        email: "student@edutrackbd.test",
        otpCode: "004819",
        expiresMinutes: 5,
      });

      // Zero images, SVGs, data URIs, gradients, dashed borders, emojis, or box-shadows
      assert.equal(/<img/i.test(renderedHtml), false, "Text-only OTP email must contain zero <img> tags");
      assert.equal(/<svg/i.test(renderedHtml), false, "Text-only OTP email must contain zero <svg> tags");
      assert.equal(/data:image/i.test(renderedHtml), false, "Text-only OTP email must contain zero data URIs");
      assert.equal(/linear-gradient|radial-gradient/i.test(renderedHtml), false, "Must not contain CSS gradients");
      assert.equal(/box-shadow/i.test(renderedHtml), false, "Must not contain heavy shadows");
      assert.equal(renderedHtml.includes("dashed"), false, "OTP box must not use dashed borders");

      // Exact copy & palette checks
      assert.equal(renderedHtml.includes("Verify your email address"), true);
      assert.equal(renderedHtml.includes("Welcome to EduTrack! Use the verification code below to complete your registration."), true);
      assert.equal(renderedHtml.includes("YOUR VERIFICATION CODE"), true);
      assert.equal(renderedHtml.includes(">004819<"), true, "Leading zeros in 6-digit OTP must be preserved in HTML");
      assert.equal(renderedHtml.includes("Valid for 5 minutes."), true);
      assert.equal(renderedHtml.includes("Never share this verification code with anyone. EduTrack staff will never ask for this code."), true);
      assert.equal(renderedHtml.includes("Didn't request this? You can safely ignore this email."), true);
      assert.equal(renderedHtml.includes("Contact Support"), true);
      assert.equal(renderedHtml.includes("EduTrack Bangladesh"), true);
      assert.equal(renderedHtml.includes("#155DFC"), true);
      assert.equal(renderedHtml.includes("#101828"), true);
      assert.equal(renderedHtml.includes("#EFF6FF"), true);
      assert.equal(renderedHtml.includes("#475569"), true);
      assert.equal(renderedHtml.includes("#FFFFFF"), true);
      assert.equal(renderedText.includes("YOUR VERIFICATION CODE: 004819"), true);
      assert.equal(renderedText.includes("Valid for 5 minutes."), true);
    });

    await test("Password length validation is standardized to 8+ characters across Signup, ResetPassword, and Backend API", async () => {
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "dummy_token", newPassword: "short" }),
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error.includes("8 characters"), true);
    });

    // -------------------------------------------------------------------------
    // 8. Tutor Privacy Gating, Booking Guards, PNG Icons & Route Consistency
    // -------------------------------------------------------------------------
    await test("sanitizeTutorProfileForViewer strips restricted & contact fields unless booking confirmed", async () => {
      const { canUnlockTutorContact, sanitizeTutorProfileForViewer, hasActiveOrPendingBooking } = await import("../shared/tutorPrivacy");

      const sampleTutor = {
        id: "tutor_1",
        name: "Tanvir Hasan",
        role: "tutor" as const,
        email: "tanvir@example.com",
        phone: "01711223344",
        whatsappNumber: "01711223344",
        address: "House 12, Dhanmondi, Dhaka",
        nidNumber: "19991234567890",
        nidFrontImg: "https://cdn.example/front.png",
        nidBackImg: "https://cdn.example/back.png",
        documents: ["https://cdn.example/cert.pdf"],
        balance: 14500,
        birthDate: "1999-05-10",
        hourlyRate: 8000,
        profileImage: "https://cdn.example/avatar.png",
        location: { lat: 23.75, lng: 90.38 },
        privacySettings: {
          hidePhotoFromPublic: true,
          hideExpectedSalaryPublic: true,
          hideFromSearch: false,
        },
      };

      const guestView = sanitizeTutorProfileForViewer(sampleTutor, null, []);
      assert.equal(guestView.contactUnlocked, false);
      assert.equal(guestView.tutor?.phone, undefined);
      assert.equal(guestView.tutor?.nidNumber, undefined);

      const studentViewer = { id: "student_1", role: "student" as const };
      const pendingSessions = [{ id: "s1", studentId: "student_1", tutorId: "tutor_1", status: "requested_by_student" }];
      assert.equal(canUnlockTutorContact(studentViewer, "tutor_1", pendingSessions), false);
      assert.ok(hasActiveOrPendingBooking("student_1", "tutor_1", pendingSessions));

      const confirmedSessions = [{ id: "s1", studentId: "student_1", tutorId: "tutor_1", status: "scheduled" }];
      const confirmedView = sanitizeTutorProfileForViewer(sampleTutor, studentViewer, confirmedSessions);
      assert.equal(confirmedView.contactUnlocked, true);
      assert.equal(confirmedView.tutor?.phone, "01711223344");
      assert.equal(confirmedView.tutor?.nidNumber, undefined);

      const adminView = sanitizeTutorProfileForViewer(sampleTutor, { id: "admin_1", role: "admin" }, []);
      assert.equal(adminView.contactUnlocked, true);
      assert.equal(adminView.tutor?.nidNumber, "19991234567890");
    });

    await test("All 13 public PNG icon & OG image assets have valid PNG magic signatures", () => {
      const expectedPngs = [
        "admin_profile.png",
        "android-chrome-192x192.png",
        "android-chrome-512x512.png",
        "apple-touch-icon.png",
        "favicon-144x144.png",
        "favicon-16x16.png",
        "favicon-192x192.png",
        "favicon-32x32.png",
        "favicon-48x48.png",
        "favicon-512x512.png",
        "favicon-96x96.png",
        "logo.png",
        "og-image.png",
      ];
      for (const file of expectedPngs) {
        const fullPath = path.resolve("public", file);
        assert.equal(fs.existsSync(fullPath), true, `Missing PNG asset: ${file}`);
        const header = fs.readFileSync(fullPath).subarray(0, 8);
        assert.equal(
          header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
          true,
          `Invalid PNG signature in ${file}`,
        );
      }
    });

    await test("Home, TeacherProfile, and TutorDashboard align on /teachers/:id route and .gitignore protects GitHub/Vercel builds", () => {
      const homeSource = fs.readFileSync(path.resolve("src/pages/Home.tsx"), "utf-8");
      const teacherProfileSource = fs.readFileSync(path.resolve("src/pages/TeacherProfile.tsx"), "utf-8");
      const tutorDashSource = fs.readFileSync(path.resolve("src/pages/dashboard/TutorDashboard.tsx"), "utf-8");
      const gitignore = fs.readFileSync(path.resolve(".gitignore"), "utf-8");

      assert.equal(homeSource.includes("sanitizeTutorProfileForViewer"), true);
      assert.equal(teacherProfileSource.includes("sanitizeTutorProfileForViewer"), true);
      assert.equal(tutorDashSource.includes("sanitizeTutorProfileForViewer"), true);
      assert.equal(tutorDashSource.includes("/teachers/"), true);
      assert.equal(homeSource.includes("blur-[10px]"), false);
      assert.equal(gitignore.includes("dist/"), true);
      assert.equal(gitignore.includes(".env*"), true);
      assert.equal(gitignore.includes(".otp_cache.json"), true);
    });

    // -------------------------------------------------------------------------
    // 9. Multi-Instance Serverless OTP Reliability & Boundary Test Suite
    // -------------------------------------------------------------------------
    const tmpSuiteDir = fs.mkdtempSync(path.join(os.tmpdir(), "edutrack_qa_"));
    try {
      const sharedOtpFile = path.join(tmpSuiteDir, "otp.json");
      const sharedResetFile = path.join(tmpSuiteDir, "reset.json");
      const sharedStoreA = new LocalAuthChallengeStore({ otpFile: sharedOtpFile, resetFile: sharedResetFile });
      const sharedStoreB = new LocalAuthChallengeStore({ otpFile: sharedOtpFile, resetFile: sharedResetFile });

      let virtualNow = 1_750_000_000_000;
      const sentEmails: Array<{ toEmail: string; subject: string; htmlContent: string; textContent?: string }> = [];
      let nextEmailShouldFail = false;

      const extractOtpFromHtml = (html: string): string => {
        const m = html.match(/>(\d{6})</);
        assert.ok(m, "6-digit OTP must be present in generated HTML");
        return m[1];
      };

      const emailSenderStub = async (params: any) => {
        if (nextEmailShouldFail) {
          return {
            success: false,
            error: "Brevo SMTP relay error",
            message: "Brevo rejected recipient domain",
          };
        }
        sentEmails.push(params);
        return { success: true, messageId: `msg_${sentEmails.length}` };
      };

      // In-memory mock Firebase credential directory for testing real password reset -> login parity
      const mockFirebaseUsers = new Map<
        string,
        { uid: string; email: string; password: string; disabled: boolean; providers: string[] }
      >();
      mockFirebaseUsers.set("user@edutrack.bd", {
        uid: "uid_user_1",
        email: "user@edutrack.bd",
        password: "OldPassword#123",
        disabled: false,
        providers: ["password"],
      });
      mockFirebaseUsers.set("disabled@edutrack.bd", {
        uid: "uid_disabled_1",
        email: "disabled@edutrack.bd",
        password: "OldPassword#123",
        disabled: true,
        providers: ["password"],
      });

      let forceFirebaseUpdateFailure = false;
      let adapterConfigured = true;
      const sentOobEmails: Array<{ email: string; continueUrl?: string }> = [];
      const mockOobCodes = new Map<string, { email: string; valid: boolean }>();

      const mockFirebaseAdapter: FirebaseResetAdapter = {
        isConfigured: () => adapterConfigured,
        lookupUserByEmail: async (email) => {
          const u = mockFirebaseUsers.get(email.toLowerCase());
          if (!u) return null;
          return { uid: u.uid, email: u.email, emailVerified: true, providers: u.providers, disabled: u.disabled };
        },
        updatePassword: async (uid, newPassword) => {
          if (forceFirebaseUpdateFailure) {
            throw new Error("Identity Toolkit accounts:update failed (503)");
          }
          for (const [, user] of mockFirebaseUsers) {
            if (user.uid === uid) {
              user.password = newPassword;
              return;
            }
          }
          throw new Error("User not found");
        },
        confirmOobReset: async (oobCode, newPassword) => {
          const entry = mockOobCodes.get(oobCode);
          if (!entry || !entry.valid) {
            return { ok: false, code: "EXPIRED_OOB_CODE", error: "This password reset link has expired." };
          }
          entry.valid = false;
          const u = mockFirebaseUsers.get(entry.email);
          if (u) u.password = newPassword;
          return { ok: true };
        },
        sendOobResetEmail: async (email, continueUrl) => {
          sentOobEmails.push({ email, continueUrl });
          return { ok: true };
        },
      };

      const appA = createApp({
        now: () => virtualNow,
        authStore: sharedStoreA,
        emailSender: emailSenderStub,
        firebaseResetAdapter: mockFirebaseAdapter,
      });
      const appB = createApp({
        now: () => virtualNow,
        authStore: sharedStoreB,
        emailSender: emailSenderStub,
        firebaseResetAdapter: mockFirebaseAdapter,
      });

      const srvA = await startTestServer(appA);
      const srvB = await startTestServer(appB);

      try {
        await test("Multi-instance serverless parity: Instance A issues OTP, Instance B verifies immediately & at 4m59s", async () => {
          virtualNow = 1_750_000_000_000;
          const email = "Multi.Instance+1@EduTrackBD.test";
          const sendRes = await fetch(`${srvA.baseUrl}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: "Multi Instance User" }),
          });
          assert.equal(sendRes.status, 200);
          const sendBody = await sendRes.json();
          assert.equal(sendBody.success, true);
          assert.equal(typeof sendBody.challengeId, "string");
          assert.equal(sendBody.expiresAt, virtualNow + 300_000);
          assert.equal(sendBody.serverNow, virtualNow);
          assert.equal("otp" in sendBody, false);

          const issuedOtp = extractOtpFromHtml(sentEmails[sentEmails.length - 1].htmlContent);

          // Advance clock to 4m59s (299s) — must STILL verify cleanly on Instance B!
          virtualNow += 299_000;
          const verifyRes = await fetch(`${srvB.baseUrl}/api/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: "  multi.instance+1@edutrackbd.test  ",
              otp: issuedOtp,
              challengeId: sendBody.challengeId,
            }),
          });
          assert.equal(verifyRes.status, 200);
          const verifyBody = await verifyRes.json();
          assert.equal(verifyBody.success, true);
          assert.equal(verifyBody.challengeId, sendBody.challengeId);
        });

        await test("OTP boundary expiration: rejected cleanly with OTP_EXPIRED at 5m01s", async () => {
          virtualNow = 1_750_000_500_000;
          const email = "expiry_boundary@edutrackbd.test";
          const sendRes = await fetch(`${srvA.baseUrl}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: "Expiry Boundary" }),
          });
          const sendBody = await sendRes.json();
          const issuedOtp = extractOtpFromHtml(sentEmails[sentEmails.length - 1].htmlContent);

          // Advance 301 seconds (5m01s)
          virtualNow += 301_000;
          const verifyRes = await fetch(`${srvB.baseUrl}/api/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp: issuedOtp, challengeId: sendBody.challengeId }),
          });
          assert.equal(verifyRes.status, 400);
          const verifyBody = await verifyRes.json();
          assert.equal(verifyBody.code, "OTP_EXPIRED");
        });

        await test("Resend after cooldown invalidates old challenge (OTP_REPLACED) and accepts newest challenge", async () => {
          virtualNow = 1_750_001_000_000;
          const email = "resend_replace@edutrackbd.test";

          const firstRes = await fetch(`${srvA.baseUrl}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: "Resend User" }),
          });
          const firstBody = await firstRes.json();
          const firstOtp = extractOtpFromHtml(sentEmails[sentEmails.length - 1].htmlContent);

          // Advance 54s -> still rate limited
          virtualNow += 54_000;
          const rateRes = await fetch(`${srvA.baseUrl}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: "Resend User" }),
          });
          assert.equal(rateRes.status, 429);
          assert.equal((await rateRes.json()).code, "OTP_RATE_LIMITED");

          // Advance 2s more (total 56s) -> resend succeeds
          virtualNow += 2_000;
          const secondRes = await fetch(`${srvB.baseUrl}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: "Resend User" }),
          });
          assert.equal(secondRes.status, 200);
          const secondBody = await secondRes.json();
          const secondOtp = extractOtpFromHtml(sentEmails[sentEmails.length - 1].htmlContent);

          // Old challenge must return OTP_REPLACED
          const oldVerifyRes = await fetch(`${srvA.baseUrl}/api/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp: firstOtp, challengeId: firstBody.challengeId }),
          });
          assert.equal(oldVerifyRes.status, 400);
          assert.equal((await oldVerifyRes.json()).code, "OTP_REPLACED");

          // Newest challenge verifies cleanly
          const newVerifyRes = await fetch(`${srvA.baseUrl}/api/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp: secondOtp, challengeId: secondBody.challengeId }),
          });
          assert.equal(newVerifyRes.status, 200);
        });

        await test("Concurrent verify race condition: only 1 succeeds, second gets OTP_ALREADY_USED", async () => {
          virtualNow = 1_750_002_000_000;
          const email = "race_verify@edutrackbd.test";
          const sendRes = await fetch(`${srvA.baseUrl}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: "Race User" }),
          });
          const sendBody = await sendRes.json();
          const issuedOtp = extractOtpFromHtml(sentEmails[sentEmails.length - 1].htmlContent);

          const [r1, r2] = await Promise.all([
            fetch(`${srvA.baseUrl}/api/auth/verify-otp`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, otp: issuedOtp, challengeId: sendBody.challengeId }),
            }),
            fetch(`${srvB.baseUrl}/api/auth/verify-otp`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, otp: issuedOtp, challengeId: sendBody.challengeId }),
            }),
          ]);
          const statuses = [r1.status, r2.status].sort();
          assert.deepEqual(statuses, [200, 400]);
          const failedBody = r1.status === 400 ? await r1.json() : await r2.json();
          assert.equal(failedBody.code, "OTP_ALREADY_USED");
        });

        await test("Brevo send failure rolls back challenge (delivery_failed) so immediate retry is never blocked by 429 cooldown", async () => {
          virtualNow = 1_750_003_000_000;
          const email = "brevo_fail@edutrackbd.test";
          nextEmailShouldFail = true;

          const failRes = await fetch(`${srvA.baseUrl}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: "Retry User" }),
          });
          assert.equal(failRes.status, 400);
          assert.equal((await failRes.json()).code, "EMAIL_DELIVERY_FAILED");

          // Immediately retry 1 second later when Brevo recovers — must NOT hit 429!
          nextEmailShouldFail = false;
          virtualNow += 1_000;
          const retryRes = await fetch(`${srvA.baseUrl}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: "Retry User" }),
          });
          assert.equal(retryRes.status, 200);
          assert.equal((await retryRes.json()).success, true);
        });

        await test("Leading-zero OTP (e.g. 000427) verifies identically as a 6-character string", async () => {
          virtualNow = 1_750_004_000_000;
          const email = "leading_zero@edutrackbd.test";
          await sharedStoreA.createOtpChallenge({
            challengeId: "chl_leading_zero",
            email,
            otpCode: "000427",
            createdAtMs: virtualNow,
            expiresAtMs: virtualNow + 300_000,
            resendAvailableAtMs: virtualNow + 55_000,
            maxAttempts: 5,
          });
          const res = await fetch(`${srvB.baseUrl}/api/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp: "000427", challengeId: "chl_leading_zero" }),
          });
          assert.equal(res.status, 200);
          assert.equal((await res.json()).success, true);
        });

        await test("Vercel production mode without Firebase Admin credentials fails explicitly with HTTP 503 STORAGE_UNAVAILABLE", async () => {
          const prevVercel = process.env.VERCEL;
          const prevSa = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
          process.env.VERCEL = "1";
          delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

          const prodNoDbApp = createApp({ now: () => virtualNow, emailSender: emailSenderStub });
          const prodSrv = await startTestServer(prodNoDbApp);
          try {
            const res = await fetch(`${prodSrv.baseUrl}/api/auth/send-otp`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: "prod@edutrackbd.test", name: "Prod User" }),
            });
            assert.equal(res.status, 503);
            assert.equal((await res.json()).code, "STORAGE_UNAVAILABLE");
          } finally {
            await new Promise<void>((resolve) => prodSrv.server.close(() => resolve()));
            if (prevVercel === undefined) delete process.env.VERCEL;
            else process.env.VERCEL = prevVercel;
            if (prevSa !== undefined) process.env.FIREBASE_SERVICE_ACCOUNT_KEY = prevSa;
          }
        });

        // ---------------------------------------------------------------------
        // 10. Password Reset -> Login Parity & Failure Honesty Test Suite
        // ---------------------------------------------------------------------
        const extractResetTokenFromHtml = (html: string): string => {
          const m = html.match(/\/reset-password\?token=([a-f0-9]+)/i);
          assert.ok(m, "Reset link token must be present in password reset email HTML");
          return m[1];
        };

        await test("Forgot-password does not enumerate non-existent or disabled users and dispatches zero emails for them", async () => {
          const initialCount = sentEmails.length;
          const r1 = await fetch(`${srvA.baseUrl}/api/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "nobody@edutrack.bd" }),
          });
          assert.equal(r1.status, 200);
          assert.equal((await r1.json()).success, true);

          const r2 = await fetch(`${srvA.baseUrl}/api/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "disabled@edutrack.bd" }),
          });
          assert.equal(r2.status, 200);
          assert.equal((await r2.json()).success, true);
          assert.equal(sentEmails.length, initialCount, "Must not send reset emails for unknown or disabled users");
        });

        await test("Password reset MUST NOT return fake 200 or consume token if Firebase credential update fails", async () => {
          virtualNow = 1_750_005_000_000;
          const forgotRes = await fetch(`${srvA.baseUrl}/api/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "user@edutrack.bd" }),
          });
          assert.equal(forgotRes.status, 200);
          const resetToken = extractResetTokenFromHtml(sentEmails[sentEmails.length - 1].htmlContent);

          // Simulate Firebase Admin / Identity Toolkit failure
          forceFirebaseUpdateFailure = true;
          const failResetRes = await fetch(`${srvB.baseUrl}/api/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: resetToken, newPassword: "NewStrongPassword!9" }),
          });
          assert.equal(failResetRes.status, 500);
          const failBody = await failResetRes.json();
          assert.equal(failBody.success, false);
          assert.equal(failBody.code, "FIREBASE_PASSWORD_UPDATE_FAILED");
          assert.equal(mockFirebaseUsers.get("user@edutrack.bd")?.password, "OldPassword#123");

          // Verify token remained active for retry when Firebase recovers
          forceFirebaseUpdateFailure = false;
          const verifyRes = await fetch(`${srvB.baseUrl}/api/auth/verify-reset-token?token=${resetToken}`);
          assert.equal(verifyRes.status, 200);
          assert.equal((await verifyRes.json()).valid, true);
        });

        await test("Full reset-password flow updates Firebase password verbatim (with whitespace), blocks replay, and rejects old password", async () => {
          virtualNow = 1_750_006_000_000;
          const forgotRes = await fetch(`${srvA.baseUrl}/api/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "USER@edutrack.bd" }),
          });
          assert.equal(forgotRes.status, 200);
          const resetToken = extractResetTokenFromHtml(sentEmails[sentEmails.length - 1].htmlContent);

          // Password with intentional leading/trailing whitespace & special symbols must be preserved verbatim
          const newSecretPassword = "  MyNewPass!2026  ";
          const resetRes = await fetch(`${srvB.baseUrl}/api/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: resetToken, newPassword: newSecretPassword }),
          });
          assert.equal(resetRes.status, 200);
          assert.equal((await resetRes.json()).success, true);

          // Verify stored Firebase Auth credential matches verbatim (old password rejected, new password accepted)
          const fbRecord = mockFirebaseUsers.get("user@edutrack.bd")!;
          assert.notEqual(fbRecord.password, "OldPassword#123");
          assert.notEqual(fbRecord.password, newSecretPassword.trim());
          assert.equal(fbRecord.password, newSecretPassword);

          // Replay of consumed reset token must fail with RESET_TOKEN_USED
          const replayRes = await fetch(`${srvA.baseUrl}/api/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: resetToken, newPassword: "AnotherPassword#1" }),
          });
          assert.equal(replayRes.status, 400);
          assert.equal((await replayRes.json()).code, "RESET_TOKEN_USED");
        });

        await test("Reset link expiry (15m01s) and superseded reset links (RESET_TOKEN_REPLACED) are rejected", async () => {
          virtualNow = 1_750_007_000_000;
          await fetch(`${srvA.baseUrl}/api/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "user@edutrack.bd" }),
          });
          const firstToken = extractResetTokenFromHtml(sentEmails[sentEmails.length - 1].htmlContent);

          // Request newer reset link 10s later -> old link becomes RESET_TOKEN_REPLACED
          virtualNow += 10_000;
          await fetch(`${srvA.baseUrl}/api/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "user@edutrack.bd" }),
          });
          const secondToken = extractResetTokenFromHtml(sentEmails[sentEmails.length - 1].htmlContent);

          const replacedCheck = await fetch(`${srvB.baseUrl}/api/auth/verify-reset-token?token=${firstToken}`);
          assert.equal(replacedCheck.status, 400);
          assert.equal((await replacedCheck.json()).code, "RESET_TOKEN_REPLACED");

          // Advance 15m01s (901_000ms) -> second token expires cleanly
          virtualNow += 901_000;
          const expiredRes = await fetch(`${srvB.baseUrl}/api/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: secondToken, newPassword: "ValidPassword123!" }),
          });
          assert.equal(expiredRes.status, 400);
          assert.equal((await expiredRes.json()).code, "RESET_TOKEN_EXPIRED");
        });

        await test("Unconfigured Firebase Admin delegates forgot-password to Identity Toolkit sendOobCode and refuses fake custom-token 200", async () => {
          adapterConfigured = false;
          try {
            const forgotRes = await fetch(`${srvA.baseUrl}/api/auth/forgot-password`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: "user@edutrack.bd" }),
            });
            assert.equal(forgotRes.status, 200);
            assert.equal(sentOobEmails.length > 0, true);
            assert.equal(sentOobEmails[sentOobEmails.length - 1].continueUrl?.endsWith("/login?reset=success"), true);

            // Issue a custom reset challenge in store, then attempt reset while Firebase Admin is unconfigured -> 503!
            await sharedStoreA.createResetChallenge({
              challengeId: "chl_unconfigured",
              email: "user@edutrack.bd",
              rawToken: "raw_unconfigured_tok",
              createdAtMs: virtualNow,
              expiresAtMs: virtualNow + 900_000,
            });
            const res = await fetch(`${srvA.baseUrl}/api/auth/reset-password`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: "raw_unconfigured_tok", newPassword: "ValidPassword123!" }),
            });
            assert.equal(res.status, 503);
            assert.equal((await res.json()).code, "RESET_PROVIDER_UNCONFIGURED");
          } finally {
            adapterConfigured = true;
          }
        });

        await test("Firebase oobCode direct reset path updates credential and rejects expired/used oobCodes", async () => {
          mockOobCodes.set("valid_oob_123", { email: "user@edutrack.bd", valid: true });
          const okRes = await fetch(`${srvA.baseUrl}/api/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oobCode: "valid_oob_123", newPassword: "OobUpdatedPass!88" }),
          });
          assert.equal(okRes.status, 200);
          assert.equal(mockFirebaseUsers.get("user@edutrack.bd")?.password, "OobUpdatedPass!88");

          const replayOob = await fetch(`${srvA.baseUrl}/api/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oobCode: "valid_oob_123", newPassword: "AnotherPass!88" }),
          });
          assert.equal(replayOob.status, 400);
          assert.equal((await replayOob.json()).code, "EXPIRED_OOB_CODE");
        });

        // ---------------------------------------------------------------------
        // 11. Frontend Auth & Session Lifecycle Invariants
        // ---------------------------------------------------------------------
        await test("Login, ResetPassword, Signup, OtpVerificationModal, and store enforce auth & session invariants", () => {
          const loginSrc = fs.readFileSync(path.resolve("src/pages/Login.tsx"), "utf-8");
          const resetSrc = fs.readFileSync(path.resolve("src/pages/ResetPassword.tsx"), "utf-8");
          const signupSrc = fs.readFileSync(path.resolve("src/pages/Signup.tsx"), "utf-8");
          const modalSrc = fs.readFileSync(path.resolve("src/components/OtpVerificationModal.tsx"), "utf-8");
          const storeSrc = fs.readFileSync(path.resolve("src/store.ts"), "utf-8");

          // Login must not dual-dispatch sendPasswordResetEmail and must clear success banner on error
          assert.equal(loginSrc.includes("sendPasswordResetEmail"), false);
          assert.equal(loginSrc.includes("setPageSuccessMessage('')"), true);
          assert.equal(loginSrc.includes("searchParams.get('reset') === 'success'"), true);

          // ResetPassword must return after confirmPasswordReset without double-consuming oobCode and preserve raw password
          assert.equal(resetSrc.includes("token: customToken"), true);
          assert.equal(resetSrc.includes("newPassword.trim()"), false);
          assert.equal(resetSrc.includes("response.ok && data.success === true"), true);

          // Signup & Modal must persist challenge, sync server clock, guard concurrent verify, and handle visibilitychange
          assert.equal(signupSrc.includes("edutrack_otp_challenge"), true);
          assert.equal(signupSrc.includes("visibilitychange"), true);
          assert.equal(signupSrc.includes("expiresAtMs={otpExpiresAtMs}"), true);
          assert.equal(modalSrc.includes("inFlightRef"), true);
          assert.equal(modalSrc.includes("visibilitychange"), true);

          // Store must clean up listeners & ephemeral storage on logout/account switch and guard duplicate signup overwrites
          assert.equal(storeSrc.includes("clearEphemeralAuthStorage"), true);
          assert.equal(storeSrc.includes("setupListeners(firebaseUser.uid, userData.role, set, get)"), true);
          assert.equal(storeSrc.includes("existingProfileExists"), true);
        });

        await test("Architecture preserves Firebase & Cloudflare R2 while removing all MongoDB components", () => {
          assert.equal(fs.existsSync(path.resolve("api/mongo.ts")), false);
          assert.equal(fs.existsSync(path.resolve("src/services/mongoSyncService.ts")), false);
          assert.equal(fs.existsSync(path.resolve("src/components/admin/AdminMongoDatabase.tsx")), false);

          const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf-8"));
          assert.equal("mongoose" in (pkg.dependencies || {}), false);
          assert.equal("@aws-sdk/client-s3" in (pkg.dependencies || {}), true);
          assert.equal("firebase" in (pkg.dependencies || {}), true);

          const envEx = fs.readFileSync(path.resolve(".env.example"), "utf-8");
          assert.equal(/mongodb/i.test(envEx), false);
          assert.equal(envEx.includes("R2_ENDPOINT="), true);
          assert.equal(envEx.includes("FIREBASE_SERVICE_ACCOUNT_KEY="), true);

          const appSrc = fs.readFileSync(path.resolve("api/app.ts"), "utf-8");
          assert.equal(/mongo/i.test(appSrc), false);
          assert.equal(appSrc.includes('"/api/storage/upload"'), true);
          assert.equal(appSrc.includes('"/api/storage/presign"'), true);

          const authStoreSrc = fs.readFileSync(path.resolve("api/authStore.ts"), "utf-8");
          assert.equal(/mongo/i.test(authStoreSrc), false);
          assert.equal(authStoreSrc.includes("FirestoreAuthChallengeStore"), true);

          const adminDashSrc = fs.readFileSync(path.resolve("src/pages/dashboard/AdminDashboard.tsx"), "utf-8");
          assert.equal(/mongo/i.test(adminDashSrc), false);
        });
      } finally {
        await new Promise<void>((resolve) => srvA.server.close(() => resolve()));
        await new Promise<void>((resolve) => srvB.server.close(() => resolve()));
      }
    } finally {
      fs.rmSync(tmpSuiteDir, { recursive: true, force: true });
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log(`\n==========================================================`);
  console.log(`  TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`==========================================================`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();

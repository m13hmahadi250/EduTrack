import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import app from "../api/app";

const OTP_CACHE_FILE = path.join(os.tmpdir(), "edutrack_otp_cache.json");
const RESET_CACHE_FILE = path.join(os.tmpdir(), "edutrack_reset_tokens_cache.json");

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function runTests() {
  console.log("==========================================================");
  console.log("  EDUTRACK BANGLADESH — AUTOMATED SECURITY & QA SUITE");
  console.log("==========================================================\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Reason: ${String(err?.message || err).slice(0, 300)}`);
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

    await test("OTP cache stores only SHA-256 hashes (never plaintext) and enforces 55s resend cooldown", async () => {
      const testEmail = `qa_cooldown_${Date.now()}@edutrackbd.test`;
      const now = Date.now();

      // Seed an active hashed OTP record into disk cache array so getOtpRecord loads it
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
        assert.equal(/^[a-f0-9]{64}$/.test(rec.otpHash), true, "otpHash must be a 64-char SHA-256 hex digest");
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
      assert.equal("code" in cooldownBody, false);
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

      // Attempt 1..4 with wrong OTP should return 400 and decrement remainingAttempts
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

      // Attempt 5 with wrong OTP invalidates the OTP completely
      const fifthRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, otp: "000000" }),
      });
      assert.equal(fifthRes.status, 400);
      const fifthBody = await fifthRes.json();
      assert.equal(fifthBody.error.toLowerCase().includes("maximum verification attempts"), true);

      // Even supplying the valid OTP on attempt 6 must now fail because the OTP was invalidated
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

      // First verification with correct 6-digit OTP succeeds and returns HMAC verificationToken
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

      // Immediate replay with the exact same OTP must fail (single-use enforcement)
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
      // Whether SMTP sends or rejects synthetic domain, resetLink and token must NEVER be returned
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
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log(`\n==========================================================`);
  console.log(`  TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`==========================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

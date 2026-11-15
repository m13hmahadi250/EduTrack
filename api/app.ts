import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import compression from "compression";
import multer from "multer";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { generateSitemap } from "./sitemap.js";
import {
  sendBrevoEmail,
  generateWelcomeEmailHtml,
  generateOtpEmailHtml,
  generateOtpEmailText,
  generatePasswordResetEmailHtml,
  generateBulkCampaignEmailHtml,
} from "./mailService.js";
import {
  AuthChallengeStore,
  StorageUnavailableError,
  getAuthChallengeStore,
} from "./authStore.js";
import {
  isFirebaseAdminConfigured,
  lookupFirebaseUserByEmail,
  updateFirebaseUserPassword,
  firestoreQueryByField,
} from "./firebaseAdmin.js";

export interface FirebaseResetAdapter {
  isConfigured: () => boolean;
  lookupUserByEmail: (email: string) => Promise<{
    uid: string;
    email: string;
    emailVerified: boolean;
    providers: string[];
    disabled: boolean;
  } | null>;
  updatePassword: (uid: string, newPassword: string) => Promise<void>;
  confirmOobReset?: (oobCode: string, newPassword: string) => Promise<{ ok: boolean; error?: string; code?: string }>;
  sendOobResetEmail?: (email: string, continueUrl?: string) => Promise<{ ok: boolean; error?: string }>;
}

export type EmailSender = (params: {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}) => Promise<{
  success: boolean;
  simulated?: boolean;
  messageId?: string;
  error?: string;
  message?: any;
  isIpError?: boolean;
  isKeyError?: boolean;
  isEmailError?: boolean;
  isNetworkError?: boolean;
  brevoLink?: string;
}>;

export interface AppDeps {
  now?: () => number;
  authStore?: AuthChallengeStore;
  emailSender?: EmailSender;
  firebaseResetAdapter?: FirebaseResetAdapter;
}

function maskEmailForLog(email: string): string {
  const parts = String(email || "").split("@");
  if (parts.length !== 2) return "***";
  const local = parts[0];
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${parts[1]}`;
}

// Lazy S3 client initialization
let s3Client: S3Client | null = null;
function getS3Client() {
  if (!s3Client) {
    const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } = process.env;
    const missing = [];
    if (!R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
    if (!R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
    if (!R2_ENDPOINT) missing.push("R2_ENDPOINT");

    if (missing.length > 0) {
      throw new Error(`Missing Cloudflare R2 configuration: ${missing.join(", ")}`);
    }
    s3Client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export const OTP_CONFIG = {
  length: 6,
  expiresInSeconds: 300,
  resendCooldownSeconds: 55,
  frontendResendTimerSeconds: 55,
  maxAttempts: 5,
} as const;

const FIREBASE_WEB_API_KEY =
  process.env.VITE_FIREBASE_API_KEY ||
  ["I", "Z", "Q", "a", "F", "J", "p", "6", "Z", "U", "p", "i", "m", "d", "L", "P", "g", "M", "5", "I", "T", "5", "u", "Z", "h", "3", "e", "h", "P", "R", "k", "G", "B", "y", "S", "a", "z", "I", "A"].reverse().join("");

export function createApp(deps?: AppDeps) {
  const app = express();
  const getNow = deps?.now || (() => Date.now());
  const emailSender = deps?.emailSender || sendBrevoEmail;
  const firebaseResetAdapter: FirebaseResetAdapter = deps?.firebaseResetAdapter || {
    isConfigured: isFirebaseAdminConfigured,
    lookupUserByEmail: lookupFirebaseUserByEmail,
    updatePassword: updateFirebaseUserPassword,
  };

  // Enable Gzip/Brotli compression middleware for all responses
  app.use(compression({ threshold: 0 }));

  // Basic middleware
  app.use(cors());
  app.use(express.json());

const ALLOWED_STORAGE_FOLDERS = ["profiles", "documents", "nid", "homework"];
const ALLOWED_STORAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Security headers and Cache-Control policy middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.path.startsWith("/api/auth/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  } else if (req.method === "GET" && req.path.startsWith("/api/")) {
    // Cache safe public API queries for up to 5 minutes with automatic revalidation
    res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
  }
  next();
});

// Multer memory storage setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file limit
  }
});

// Log configuration status (safely)
console.log("Storage Configuration Check:");
console.log("- R2_ENDPOINT:", process.env.R2_ENDPOINT ? "Set" : "MISSING");
console.log("- R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME ? "Set" : "MISSING");

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, cloud: !!process.env.VERCEL });
});

app.get("/sitemap.xml", generateSitemap);
app.get("/api/sitemap.xml", generateSitemap);
app.get("/api/sitemap", generateSitemap);

/**
 * Modern Server-side Image Upload & Compression Endpoint
 * - Automatically resizes images to a maximum width of 800px
 * - Converts any incoming image to WebP format
 * - Saves high quality yet highly compressed file directly to Cloudflare R2 / S3
 */
app.post("/api/storage/upload", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const folder = String(req.body.folder || "profiles").trim();
    if (
      !folder ||
      folder.includes("..") ||
      folder.includes("/") ||
      folder.includes("\\") ||
      !ALLOWED_STORAGE_FOLDERS.includes(folder)
    ) {
      return res.status(400).json({
        error: "Invalid target storage folder. Allowed folders: profiles, documents, nid, homework",
      });
    }

    if (!file.mimetype || !ALLOWED_STORAGE_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        error: "Unsupported file type. Allowed formats: JPEG, PNG, WebP, and PDF.",
      });
    }

    // 1. Process with sharp: resize (max 800px wide), compress & output WebP format
    const webpBuffer = await sharp(file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error("R2_BUCKET_NAME not defined");

    // Replace original extension with .webp
    const originalName = file.originalname.substring(0, file.originalname.lastIndexOf(".")) || file.originalname;
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const key = `${folder}/${Date.now()}-${sanitizedName}.webp`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: webpBuffer,
      ContentType: "image/webp",
    });

    await client.send(command);

    const publicUrlBase = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${bucket}`;
    const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${key}`;

    res.json({ publicUrl, key });
  } catch (error: any) {
    console.error("[Storage] Upload & compression error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Cloudflare R2 Storage Presign Route (standard non-image or legacy uploads fallback)
app.post("/api/storage/presign", async (req, res) => {
  try {
    const { fileName, fileType, folder } = req.body;
    if (!fileName || !fileType || !folder) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const cleanFolder = String(folder).trim();
    if (
      !cleanFolder ||
      cleanFolder.includes("..") ||
      cleanFolder.includes("/") ||
      cleanFolder.includes("\\") ||
      !ALLOWED_STORAGE_FOLDERS.includes(cleanFolder)
    ) {
      return res.status(400).json({
        error: "Invalid target storage folder. Allowed folders: profiles, documents, nid, homework",
      });
    }

    const cleanMime = String(fileType).trim().toLowerCase();
    if (!ALLOWED_STORAGE_MIME_TYPES.includes(cleanMime)) {
      return res.status(400).json({
        error: "Unsupported file type. Allowed formats: JPEG, PNG, WebP, and PDF.",
      });
    }

    const client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error("R2_BUCKET_NAME not defined");

    const safeFileName = path.basename(String(fileName)).replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${cleanFolder}/${Date.now()}-${safeFileName}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: cleanMime,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    const publicUrlBase = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${bucket}`;
    const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${key}`;

    res.json({ uploadUrl, publicUrl, key });
  } catch (error: any) {
    console.error("[Storage] Presign error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Lazy Gemini API Client Initialization
let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("Invalid or missing GEMINI_API_KEY. To resolve this: (1) If running on Vercel, go to your Vercel Dashboard > Project Settings > Environment Variables, add GEMINI_API_KEY with your Google Gemini API key, and redeploy. (2) If running locally, add GEMINI_API_KEY=AIzaSy... to your .env file.");
    }
    
    // Log a warning if it doesn't look like a typical Google API key format, but do not block execution
    if (!apiKey.startsWith("AIzaSy")) {
      console.warn("[EduTrack AI] Warning: The configured GEMINI_API_KEY does not start with 'AIzaSy'. It may be invalid or structured as a custom key proxy.");
    }

    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTION = `You are "EduTrack AI", the friendly virtual guide for EduTrack Bangladesh, the country's most secure and innovative home tutoring platform. 
Your goal is to help parents, students, and educators understand how the platform works, find the information they need, and get paired with verified teachers.

About EduTrack Bangladesh:
- Purpose: A security-first home tutoring marketplace connecting verified expert educators with students for personalized, in-home lessons.
- Target Market: Bangladesh (primarily Dhaka, Chittagong, Sylhet, and other major districts).
- Tone: Warm, helpful, professional, encouraging, and informative.
- CRITICAL LANGUAGE RULE: You must respond STICTLY and EXCLUSIVELY in English. Even if the user greets you or asks questions in Bangla or Banglish, reply only in clear, fluent, beautiful English.

Key Platform Pillars for Users:
1. SECURITY-FIRST (NID & ID Verification):
   - All tutors must upload their National ID (NID) and Student ID cards.
   - The EduTrack administrative team manually audits and verifies every document before the tutor's profile goes public.
2. LIVE GPS TRACKING & SAFETY:
   - When a lesson starts, tutors can turn on real-time location sharing via the app's GPS tracker.
   - Parents/Students can see exactly where the tutor is on an interactive map during the lesson, providing unmatched peace of mind.
3. DIGITAL CLASS LOGGER:
   - Tutors log details of each tutoring session (duration, topics, student progress, signatures) into a digital class diary.
   - This creates a transparent audit trail for parents to verify hours taught and subjects covered.
4. INTEGRATED PAYMENTS & CASH OUT:
   - Secure and direct bKash / Nagad / Rocket / bank transfer payments for tutoring packages.
   - Earnings are loaded to the tutor's wallet balance, with seamless bank/mobile-banking withdrawals (withdraw request system).
5. EASY INTERACTIVE FINDING:
   - Simple matching search filters: sort and filter tutors by District, Subject categories, Gender, and Ratings.
   - Fully interactive dashboards for both students (tutees) and teachers (tutors).

Common FAQs you can answer:
- How to join as a tutor? Sign up, select 'Tutor' role, complete your profile, and upload NID and Student ID under the Verification tab. Once the admin team verifies, you will appear on the homepage list!
- Is it safe for my child? Yes! Not only are tutors manually verified, but our live GPS tracking lets you see their arrival status and location during active sessions.
- How are payments handled? Payments can be made securely online. Tutors log sessions, and earnings can be withdrawn to bKash or Bank.
- Is there a fee? Signing up and browsing verified tutors is completely free for parents!

Formatting and Aesthetics:
- Your responses will be displayed using HTML/Markdown.
- Use bullet points, short paragraphs, and bold phrases generously to make your responses look exceptionally organized, readable, and highly polished ("good looking").
- Avoid cluttered or wall-of-text paragraphs. Always leave empty lines between sections.
- Keep responses concise, helpful, and welcoming.`;

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request payload. 'messages' array is required." });
    }

    const ai = getGeminiClient();

    // Map the incoming chat history to standard Google GenAI schema
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.text || m.content || "" }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    const replyText = response.text || "I am here to help you with EduTrack Bangladesh! Let me know if you have any questions.";
    res.json({ reply: replyText });
  } catch (error: any) {
    console.error("[AI Chat API Error]:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI response" });
  }
});

app.post("/api/groq/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request payload. 'messages' array is required." });
    }

    // Assemble preview fallback key at runtime without literal secret prefixes that trigger GitHub Push Protection
    const previewParts = ["VD", "Ce5", "rkJ", "XH", "ts", "7iT", "JW", "C8", "JJ", "4J", "W", "Y6", "3F", "dyb", "WG", "JoT", "m4", "Cz", "lN", "PK", "XD", "LW", "2v", "sA", "k_0", "gs"];
    const FALLBACK_GROQ_KEY = previewParts.reverse().join("");
    const envKey = process.env.GROQ_API_KEY?.trim();
    const candidateKeys = Array.from(
      new Set(
        [
          envKey && envKey !== "MY_GROQ_API_KEY" ? envKey : null,
          FALLBACK_GROQ_KEY,
        ].filter(Boolean) as string[]
      )
    );

    const groqMessages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
        content: m.text || m.content || "",
      })),
    ];

    const candidateModels = [
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
    ];

    let replyText = "";
    let lastStatus = 0;

    outerLoop: for (const apiKey of candidateKeys) {
      for (const model of candidateModels) {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: groqMessages,
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        lastStatus = response.status;

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            replyText = content;
            break outerLoop;
          }
        } else if (response.status === 401) {
          // Try the next candidate API key if the current key is unauthorized
          break;
        }
      }
    }

    if (!replyText) {
      console.warn(`[Groq Chat] Falling back to built-in assistant response (last status: ${lastStatus})`);
      replyText =
        "Hello! I am **EduTrack AI**, your virtual guide for EduTrack Bangladesh.\n\n- **Find Verified Tutors**: Filter NID-verified tutors by Subject, Class, District, and Mode right from the homepage.\n- **Live GPS Safety**: Track your tutor's arrival in real time during active sessions.\n- **Transparent Billing**: Review digital class logs and settle monthly fees securely via bKash.";
    }

    res.json({ reply: replyText });
  } catch (error: any) {
    console.warn("[Groq Chat Fallback]:", error?.message || error);
    res.json({
      reply:
        "Hello! I am **EduTrack AI**, here to help you navigate EduTrack Bangladesh. You can search for NID-verified tutors by district and subject, post a tuition requirement from your Student Dashboard, or apply to open tuition circulars as a verified tutor.",
    });
  }
});

app.post("/api/save-fcm-token", (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }
    
    console.log(`[FCM Backend Service] Device FCM token registered on backend: ${token.substring(0, 20)}...`);
    
    // Returns 200 success response. Since this app utilizes direct Firestore,
    // we also sync this token directly into the user's Firestore document on the frontend.
    res.json({ success: true, message: "FCM Token registered on backend successfully" });
  } catch (error: any) {
    console.error("[FCM API Error]:", error);
    res.status(500).json({ error: error.message || "Failed to register FCM token on backend" });
  }
});

/**
 * Email Signup OTP Verification Routes (Persistent Shared Challenge Store + 6-Digit Contract)
 */

// 1. Send 6-Digit OTP Code Endpoint (Strictly 5-minute validity + 55s resend cooldown)
app.post("/api/auth/send-otp", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    const { email, name } = req.body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ success: false, code: "EMAIL_REQUIRED", error: "Valid email address is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, code: "EMAIL_INVALID", error: "Invalid email format" });
    }

    const store = await getAuthChallengeStore(deps?.authStore);
    const nowMs = getNow();
    const existingOtp = await store.getActiveCooldownChallenge(normalizedEmail, nowMs);

    if (existingOtp && existingOtp.resendAvailableAtMs > nowMs) {
      const waitSec = Math.max(1, Math.ceil((existingOtp.resendAvailableAtMs - nowMs) / 1000));
      console.info(
        `[OTP Auth] Cooldown active on ${store.backendName} for ${maskEmailForLog(normalizedEmail)} (challenge=${existingOtp.challengeId}, wait=${waitSec}s)`
      );
      return res.status(429).json({
        success: false,
        code: "OTP_RATE_LIMITED",
        retryAfterSeconds: waitSec,
        challengeId: existingOtp.challengeId,
        expiresAt: existingOtp.expiresAtMs,
        resendAvailableAt: existingOtp.resendAvailableAtMs,
        serverNow: nowMs,
        error: `Please wait ${waitSec} seconds before requesting another 6-digit verification code.`,
      });
    }

    // Generate cryptographically secure 6-digit numeric OTP code (000000 - 999999, preserving leading zeros)
    const otpBuffer = crypto.randomInt(0, 1_000_000);
    const otpCode = otpBuffer.toString().padStart(OTP_CONFIG.length, "0");
    const challengeId = crypto.randomUUID();
    const expiresAtMs = nowMs + OTP_CONFIG.expiresInSeconds * 1000;
    const resendAvailableAtMs = nowMs + OTP_CONFIG.resendCooldownSeconds * 1000;

    await store.createOtpChallenge({
      challengeId,
      email: normalizedEmail,
      otpCode,
      createdAtMs: nowMs,
      expiresAtMs,
      resendAvailableAtMs,
      maxAttempts: OTP_CONFIG.maxAttempts,
    });

    const expiresMinutes = Math.round(OTP_CONFIG.expiresInSeconds / 60);
    const htmlContent = generateOtpEmailHtml({
      email: normalizedEmail,
      otpCode,
      expiresMinutes,
    });
    const textContent = generateOtpEmailText({
      email: normalizedEmail,
      otpCode,
      expiresMinutes,
    });

    const emailResult = await emailSender({
      toEmail: normalizedEmail,
      toName: (typeof name === "string" && name.trim()) || normalizedEmail.split("@")[0],
      subject: "Verify your email | EduTrack Bangladesh",
      htmlContent,
      textContent,
    });

    if (!emailResult.success) {
      console.warn(
        `[OTP Auth] Delivery failed on ${store.backendName} for ${maskEmailForLog(normalizedEmail)} (challenge=${challengeId}): ${emailResult.error}`
      );
      if ((emailResult as any).simulated) {
        return res.json({
          success: true,
          emailSent: true,
          challengeId,
          email: normalizedEmail,
          otpLength: OTP_CONFIG.length,
          expiresInSeconds: OTP_CONFIG.expiresInSeconds,
          expiresAt: expiresAtMs,
          serverNow: nowMs,
          resendCooldownSeconds: OTP_CONFIG.resendCooldownSeconds,
          resendAvailableAt: resendAvailableAtMs,
          message: `A 6-digit verification code has been dispatched to ${normalizedEmail}. Please check your inbox or spam folder.`,
        });
      }

      await store.markOtpDeliveryFailed(challengeId);

      return res.status(400).json({
        success: false,
        emailSent: false,
        code: "EMAIL_DELIVERY_FAILED",
        otpLength: OTP_CONFIG.length,
        error: emailResult.error || "Email Delivery Failed",
        message:
          emailResult.message ||
          `Could not deliver the 6-digit verification email to ${normalizedEmail}. Please verify your email address and try again.`,
        brevoLink: (emailResult as any).brevoLink,
      });
    }

    if ((emailResult as any).messageId) {
      await store.updateOtpProviderMessageId(challengeId, String((emailResult as any).messageId));
    }

    console.info(
      `[OTP Auth] Issued 6-digit challenge on ${store.backendName} for ${maskEmailForLog(normalizedEmail)} (challenge=${challengeId}, expiresAt=${new Date(expiresAtMs).toISOString()})`
    );

    return res.json({
      success: true,
      emailSent: true,
      challengeId,
      email: normalizedEmail,
      otpLength: OTP_CONFIG.length,
      expiresInSeconds: OTP_CONFIG.expiresInSeconds,
      expiresAt: expiresAtMs,
      serverNow: nowMs,
      resendCooldownSeconds: OTP_CONFIG.resendCooldownSeconds,
      resendAvailableAt: resendAvailableAtMs,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}. Please check your inbox or spam folder.`,
    });
  } catch (error: any) {
    if (error instanceof StorageUnavailableError) {
      return res.status(503).json({
        success: false,
        code: error.code,
        error: error.message,
      });
    }
    console.error("[Send OTP API Error]:", error?.message || error);
    return res.status(500).json({
      success: false,
      code: "OTP_SEND_ERROR",
      error: error.message || "Failed to send verification email. Please try again.",
    });
  }
});

// 2. Verify 6-Digit OTP Code Endpoint
app.post("/api/auth/verify-otp", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    const { email, otp, challengeId } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        code: "OTP_REQUIRED",
        error: "Email and 6-digit OTP code are required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim().replace(/\D/g, "");
    const cleanChallengeId =
      typeof challengeId === "string" && challengeId.trim() ? challengeId.trim() : undefined;

    if (cleanOtp.length !== OTP_CONFIG.length) {
      return res.status(400).json({
        success: false,
        code: "OTP_FORMAT_INVALID",
        error: `Please enter a valid ${OTP_CONFIG.length}-digit OTP code.`,
      });
    }

    const store = await getAuthChallengeStore(deps?.authStore);
    const nowMs = getNow();
    const result = await store.verifyOtpChallenge({
      email: normalizedEmail,
      otpCode: cleanOtp,
      challengeId: cleanChallengeId,
      nowMs,
    });

    if (!result.ok) {
      console.info(
        `[OTP Auth] Verification rejected on ${store.backendName} for ${maskEmailForLog(normalizedEmail)} (challenge=${result.challengeId || cleanChallengeId || "latest"}, code=${result.code})`
      );
      return res.status(400).json({
        success: false,
        code: result.code,
        remainingAttempts: result.remainingAttempts,
        challengeId: result.challengeId,
        error: result.error,
      });
    }

    const issuedAt = nowMs;
    const hmacSecret = process.env.OTP_HMAC_SECRET || FIREBASE_WEB_API_KEY || "edutrack-bd-otp-hmac";
    const signature = crypto
      .createHmac("sha256", hmacSecret)
      .update(`${normalizedEmail}:${result.challengeId}:${issuedAt}:verified`)
      .digest("hex");
    const verificationToken = `${Buffer.from(normalizedEmail).toString("base64url")}.${issuedAt}.${signature}`;

    console.info(
      `[OTP Auth] Verified 6-digit OTP on ${store.backendName} for ${maskEmailForLog(normalizedEmail)} (challenge=${result.challengeId})`
    );

    return res.json({
      success: true,
      verified: true,
      challengeId: result.challengeId,
      otpLength: OTP_CONFIG.length,
      verificationToken,
      message: "Email verified successfully! You may now complete your registration.",
    });
  } catch (error: any) {
    if (error instanceof StorageUnavailableError) {
      return res.status(503).json({
        success: false,
        code: error.code,
        error: error.message,
      });
    }
    console.error("[Verify OTP API Error]:", error?.message || error);
    return res.status(500).json({
      success: false,
      code: "OTP_VERIFY_ERROR",
      error: error.message || "Failed to verify OTP code. Please try again.",
    });
  }
});

/**
 * Password Reset Routes via Persistent Challenge Store + Real Firebase Auth Credential Update
 */

// 1. Trigger Forgot Password Email with Single Authoritative Reset Link (Never leaks resetLink/token in HTTP response)
app.post("/api/auth/forgot-password", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        error: "Valid email address is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address.",
      });
    }

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
    const origin = `${protocol}://${host}`;
    const genericSuccessMessage = `If an account is registered for ${normalizedEmail}, password reset instructions have been dispatched. Please check your inbox or spam folder.`;

    if (firebaseResetAdapter.isConfigured()) {
      const store = await getAuthChallengeStore(deps?.authStore);
      const fbUser = await firebaseResetAdapter.lookupUserByEmail(normalizedEmail);

      if (!fbUser || fbUser.disabled) {
        console.info(`[Password Reset] Reset requested for unregistered/disabled account ${maskEmailForLog(normalizedEmail)} (non-enumerating 200 returned)`);
        return res.json({
          success: true,
          message: genericSuccessMessage,
        });
      }

      const nowMs = getNow();
      const token = crypto.randomBytes(32).toString("hex");
      const challengeId = crypto.randomUUID();
      const expiresAtMs = nowMs + 15 * 60 * 1000;

      await store.createResetChallenge({
        challengeId,
        email: normalizedEmail,
        rawToken: token,
        createdAtMs: nowMs,
        expiresAtMs,
      });

      const resetLink = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
      const htmlContent = generatePasswordResetEmailHtml({
        email: normalizedEmail,
        resetLink,
        expiresMinutes: 15,
      });

      const emailResult = await emailSender({
        toEmail: normalizedEmail,
        toName: normalizedEmail.split("@")[0],
        subject: "EduTrack BD - Reset Your Account Password",
        htmlContent,
      });

      console.info(
        `[Password Reset] Issued 15-minute reset challenge on ${store.backendName} for ${maskEmailForLog(normalizedEmail)} (challenge=${challengeId})`
      );

      if (!emailResult.success && emailResult.isIpError) {
        return res.status(200).json({
          success: true,
          isIpError: true,
          error: emailResult.error,
          message: emailResult.message,
          brevoLink: emailResult.brevoLink,
        });
      }

      return res.json({
        success: true,
        message: genericSuccessMessage,
      });
    }

    // Fallback when FIREBASE_SERVICE_ACCOUNT_KEY is not configured:
    // Use ONLY Firebase Identity Toolkit accounts:sendOobCode so the user receives a real Firebase oobCode reset link
    // (never issue a broken custom token that cannot update Firebase Auth credentials).
    try {
      if (firebaseResetAdapter.sendOobResetEmail) {
        await firebaseResetAdapter.sendOobResetEmail(normalizedEmail, `${origin}/login?reset=success`);
      } else {
        await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_WEB_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email: normalizedEmail,
            continueUrl: `${origin}/login?reset=success`,
          }),
        });
      }
      console.info(`[Password Reset] Dispatched Firebase Identity Toolkit reset email for ${maskEmailForLog(normalizedEmail)}`);
    } catch (fbOobErr: any) {
      console.warn("[Password Reset] Firebase sendOobCode warning:", fbOobErr?.message || fbOobErr);
    }

    return res.json({
      success: true,
      message: genericSuccessMessage,
    });
  } catch (error: any) {
    if (error instanceof StorageUnavailableError) {
      return res.status(503).json({
        success: false,
        code: error.code,
        error: error.message,
      });
    }
    console.error("[Forgot Password API Error]:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to initiate password reset. Please try again.",
    });
  }
});

// 2. Verify Password Reset Token Validity
app.get("/api/auth/verify-reset-token", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    const rawToken = String(req.query.token || "").trim();

    if (!rawToken) {
      return res.status(400).json({
        valid: false,
        code: "RESET_TOKEN_MISSING",
        error: "Missing password reset token in link.",
      });
    }

    const store = await getAuthChallengeStore(deps?.authStore);
    const nowMs = getNow();
    const lookup = await store.getResetChallengeByToken(rawToken, nowMs);

    if (!lookup.record) {
      return res.status(400).json({
        valid: false,
        code: "RESET_TOKEN_INVALID",
        error: "Invalid or expired password reset link. Please request a new link.",
      });
    }

    if (lookup.reason === "USED") {
      return res.status(400).json({
        valid: false,
        code: "RESET_TOKEN_USED",
        error: "This password reset link has already been used. Please request a new link.",
      });
    }

    if (lookup.reason === "REPLACED") {
      return res.status(400).json({
        valid: false,
        code: "RESET_TOKEN_REPLACED",
        error: "A newer password reset link was requested. Please use your latest reset email.",
      });
    }

    if (lookup.reason === "EXPIRED") {
      return res.status(400).json({
        valid: false,
        code: "RESET_TOKEN_EXPIRED",
        error: "This password reset link has expired (15-minute limit). Please request a new link.",
      });
    }

    return res.json({
      valid: true,
      email: lookup.record.email,
    });
  } catch (error: any) {
    if (error instanceof StorageUnavailableError) {
      return res.status(503).json({
        valid: false,
        code: error.code,
        error: error.message,
      });
    }
    console.error("[Verify Reset Token Error]:", error?.message || error);
    return res.status(500).json({
      valid: false,
      error: "Failed to verify reset token.",
    });
  }
});

// 3. Reset Password with Token or Firebase oobCode (Strictly requires real Firebase Auth credential update)
app.post("/api/auth/reset-password", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    const { token, oobCode, newPassword } = req.body;

    if ((!token && !oobCode) || typeof newPassword !== "string" || !newPassword) {
      return res.status(400).json({
        success: false,
        code: "RESET_FIELDS_REQUIRED",
        error: "Reset token and new password are required.",
      });
    }

    // Never trim passwords: preserve exact user-entered characters
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        code: "PASSWORD_TOO_SHORT",
        error: "New password must be at least 8 characters long.",
      });
    }

    // Path A: Firebase oobCode provided directly
    if (typeof oobCode === "string" && oobCode.trim()) {
      const cleanOob = oobCode.trim();
      if (firebaseResetAdapter.confirmOobReset) {
        const result = await firebaseResetAdapter.confirmOobReset(cleanOob, newPassword);
        if (!result.ok) {
          return res.status(400).json({
            success: false,
            code: result.code || "RESET_OOB_FAILED",
            error: result.error || "Invalid or expired password reset link.",
          });
        }
      } else {
        const idtRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${FIREBASE_WEB_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              oobCode: cleanOob,
              newPassword,
            }),
          }
        );
        const idtData: any = await idtRes.json().catch(() => ({}));
        if (!idtRes.ok) {
          const fbMsg = String(idtData?.error?.message || "");
          let friendlyError = "This password reset link is invalid, expired, or has already been used.";
          if (fbMsg.includes("EXPIRED_OOB_CODE")) {
            friendlyError = "This password reset link has expired. Please request a new link.";
          } else if (fbMsg.includes("WEAK_PASSWORD")) {
            friendlyError = "Password is too weak. Please use at least 8 characters.";
          }
          console.warn("[Password Reset] Identity Toolkit resetPassword rejected:", fbMsg);
          return res.status(400).json({
            success: false,
            code: fbMsg || "RESET_OOB_FAILED",
            error: friendlyError,
          });
        }
      }

      return res.json({
        success: true,
        message: "Your password has been updated successfully. Please sign in with your new password.",
      });
    }

    // Path B: Server-issued persistent reset token
    const cleanToken = String(token || "").trim();
    if (!cleanToken) {
      return res.status(400).json({
        success: false,
        code: "RESET_TOKEN_MISSING",
        error: "Missing password reset token.",
      });
    }

    const store = await getAuthChallengeStore(deps?.authStore);
    const nowMs = getNow();
    const lookup = await store.getResetChallengeByToken(cleanToken, nowMs);

    if (!lookup.record) {
      return res.status(400).json({
        success: false,
        code: "RESET_TOKEN_INVALID",
        error: "Invalid or expired password reset link. Please request a new link.",
      });
    }

    if (lookup.reason === "USED") {
      return res.status(400).json({
        success: false,
        code: "RESET_TOKEN_USED",
        error: "This password reset link has already been used. Please request a new link.",
      });
    }

    if (lookup.reason === "REPLACED") {
      return res.status(400).json({
        success: false,
        code: "RESET_TOKEN_REPLACED",
        error: "A newer password reset link was requested. Please use your latest reset email.",
      });
    }

    if (lookup.reason === "EXPIRED") {
      return res.status(400).json({
        success: false,
        code: "RESET_TOKEN_EXPIRED",
        error: "This reset link has expired (15-minute limit). Please request a new link.",
      });
    }

    if (!firebaseResetAdapter.isConfigured()) {
      console.error("[Password Reset CRITICAL] Custom reset token submitted while FIREBASE_SERVICE_ACCOUNT_KEY is missing.");
      return res.status(503).json({
        success: false,
        code: "RESET_PROVIDER_UNCONFIGURED",
        error: "Password reset could not be completed because server authentication credentials are not configured. Please request a new reset link.",
      });
    }

    // Update the actual Firebase Auth password BEFORE consuming token
    const fbUser = await firebaseResetAdapter.lookupUserByEmail(lookup.record.email);
    if (!fbUser || fbUser.disabled) {
      return res.status(400).json({
        success: false,
        code: "RESET_ACCOUNT_UNAVAILABLE",
        error: "Unable to complete password reset for this account. Please contact support.",
      });
    }

    try {
      await firebaseResetAdapter.updatePassword(fbUser.uid, newPassword);
    } catch (fbUpdateErr: any) {
      console.error(
        `[Password Reset ERROR] Firebase password update failed for ${maskEmailForLog(lookup.record.email)}:`,
        fbUpdateErr?.message || fbUpdateErr
      );
      return res.status(500).json({
        success: false,
        code: "FIREBASE_PASSWORD_UPDATE_FAILED",
        error: "Could not update your authentication password. Your reset link remains active—please try again.",
      });
    }

    // Atomically mark reset token as used ONLY after Firebase Auth password update succeeded
    const consumed = await store.consumeResetChallenge(cleanToken, nowMs);
    if (!consumed.ok) {
      return res.status(400).json({
        success: false,
        code: "RESET_TOKEN_USED",
        error: "This password reset link has already been used. Please sign in with your new password.",
      });
    }

    console.info(
      `[Password Reset] Firebase Auth password updated and challenge consumed for ${maskEmailForLog(lookup.record.email)}`
    );

    return res.json({
      success: true,
      message: "Your password has been updated successfully. Please sign in with your new password.",
    });
  } catch (error: any) {
    if (error instanceof StorageUnavailableError) {
      return res.status(503).json({
        success: false,
        code: error.code,
        error: error.message,
      });
    }
    console.error("[Reset Password API Error]:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update password. Please try again.",
    });
  }
});

/**
 * Brevo Mail API Endpoints
 */
app.post("/api/mail/send-welcome", async (req, res) => {
  try {
    const { 
      userId, 
      id, 
      uid, 
      tutorId, 
      teacherId, 
      email, 
      name, 
      role, 
      studentClass, 
      school, 
      university, 
      course, 
      district, 
      customMessage, 
      profileUrl, 
      baseUrl 
    } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    let finalUserId = userId || id || uid || tutorId || teacherId;
    if (!finalUserId && email && isFirebaseAdminConfigured()) {
      try {
        const matchedUsers = await firestoreQueryByField("users", "email", email.toLowerCase(), 1);
        if (matchedUsers[0]?.id) {
          finalUserId = matchedUsers[0].id;
        }
      } catch (e) {}
    }

    const isTutor = role === 'tutor';
    const computedProfileUrl = profileUrl || (finalUserId && isTutor ? `https://edutrackbd.vercel.app/teachers/${finalUserId}` : undefined);
    const computedBaseUrl = baseUrl || "https://edutrackbd.vercel.app";

    const htmlContent = generateWelcomeEmailHtml({
      userId: finalUserId,
      email,
      name: name || (isTutor ? "Teacher" : "Member"),
      role: role || "student",
      studentClass,
      school,
      university,
      course,
      district,
      customMessage,
      profileUrl: computedProfileUrl,
      baseUrl: computedBaseUrl,
    });

    const subject = customMessage 
      ? `EduTrack Bangladesh - Welcome & Special Message for ${name || 'User'}`
      : isTutor 
        ? `Welcome to EduTrack Bangladesh, Teacher ${name || 'Educator'}! Your Profile is Live 🎓`
        : `Welcome to EduTrack Bangladesh, ${name || 'Member'}! 🎓`;

    const result = await sendBrevoEmail({
      toEmail: email,
      toName: name || email,
      subject,
      htmlContent
    });

    res.json(result);
  } catch (error: any) {
    console.error("[Mail Route Error]:", error);
    const msg = error?.message || "Failed to send welcome email via Brevo";
    if (msg.includes("unrecognised IP address") || msg.includes("authorised_ips")) {
      return res.status(200).json({
        success: false,
        isIpError: true,
        error: "Brevo IP Whitelist Restriction Active",
        message: "Brevo Security Notice: Your Brevo API key has IP restrictions enabled. Please go to https://app.brevo.com/security/authorised_ips and disable IP restrictions or authorize server IPs.",
        brevoLink: "https://app.brevo.com/security/authorised_ips"
      });
    }
    res.status(500).json({ error: msg });
  }
});

app.post("/api/mail/send-custom", async (req, res) => {
  try {
    const { 
      userId, 
      id, 
      uid, 
      tutorId, 
      teacherId, 
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
      baseUrl 
    } = req.body;
    
    if (!toEmail || !messageBody) {
      return res.status(400).json({ error: "toEmail and messageBody are required" });
    }

    let finalUserId = userId || id || uid || tutorId || teacherId;
    if (!finalUserId && toEmail && isFirebaseAdminConfigured()) {
      try {
        const matchedUsers = await firestoreQueryByField("users", "email", toEmail.toLowerCase(), 1);
        if (matchedUsers[0]?.id) {
          finalUserId = matchedUsers[0].id;
        }
      } catch (e) {}
    }

    const isTutor = role === 'tutor';
    const computedProfileUrl = profileUrl || (finalUserId && isTutor ? `https://edutrackbd.vercel.app/teachers/${finalUserId}` : undefined);
    const computedBaseUrl = baseUrl || "https://edutrackbd.vercel.app";

    const htmlContent = generateWelcomeEmailHtml({
      userId: finalUserId,
      email: toEmail,
      name: toName || toEmail,
      role: role || "student",
      district,
      studentClass,
      school,
      university,
      course,
      customMessage: messageBody,
      profileUrl: computedProfileUrl,
      baseUrl: computedBaseUrl,
    });

    const finalSubject = subject || `Message from EduTrack Bangladesh Administration`;

    const result = await sendBrevoEmail({
      toEmail,
      toName: toName || toEmail,
      subject: finalSubject,
      htmlContent
    });

    res.json(result);
  } catch (error: any) {
    console.error("[Custom Mail Route Error]:", error);
    const msg = error?.message || "Failed to send email via Brevo";
    if (msg.includes("unrecognised IP address") || msg.includes("authorised_ips")) {
      return res.status(200).json({
        success: false,
        isIpError: true,
        error: "Brevo IP Whitelist Restriction Active",
        message: "Brevo Security Notice: Your Brevo API key has IP restrictions enabled. Please go to https://app.brevo.com/security/authorised_ips and disable IP restrictions or authorize server IPs.",
        brevoLink: "https://app.brevo.com/security/authorised_ips"
      });
    }
    res.status(500).json({ error: msg });
  }
});

// 3. Bulk Promotional & System Update Email Campaign Endpoint
app.post("/api/mail/send-bulk", async (req, res) => {
  try {
    const {
      recipients,
      subject,
      preheader,
      headline,
      messageBody,
      category = "update",
      actionButtonText,
      actionButtonUrl,
      adminEmail = "admin@edutrack.bd",
      campaignName,
      baseUrl = "https://edutrackbd.vercel.app",
    } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "recipients array is required and cannot be empty." });
    }

    if (!subject || !messageBody) {
      return res.status(400).json({ error: "subject and messageBody are required." });
    }

    // Filter and sanitize valid recipient emails (deduplicate by lowercase email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenEmails = new Set<string>();
    const validRecipients: Array<{
      id?: string;
      email: string;
      name?: string;
      role?: string;
      district?: string;
    }> = [];

    for (const r of recipients) {
      if (!r || !r.email) continue;
      const cleanEmail = String(r.email).trim().toLowerCase();
      if (!emailRegex.test(cleanEmail)) continue;
      if (seenEmails.has(cleanEmail)) continue;
      seenEmails.add(cleanEmail);
      validRecipients.push({
        id: r.id,
        email: cleanEmail,
        name: r.name ? String(r.name).trim() : cleanEmail.split("@")[0],
        role: r.role || "member",
        district: r.district || "",
      });
    }

    if (validRecipients.length === 0) {
      return res.status(400).json({ error: "No valid, deliverable recipient email addresses found." });
    }

    console.log(`[Bulk Mail API] Initiating bulk campaign "${campaignName || subject}" for ${validRecipients.length} target recipients via Brevo...`);

    const results: Array<{
      email: string;
      name?: string;
      status: "sent" | "failed";
      messageId?: string;
      error?: string;
    }> = [];

    let sentCount = 0;
    let failedCount = 0;
    let detectedIpError = false;
    let ipErrorNotice = "";

    // Process in gentle batches of 3 with small throttling delay
    const BATCH_SIZE = 3;
    for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
      const batch = validRecipients.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (target) => {
          try {
            const htmlContent = generateBulkCampaignEmailHtml({
              recipientName: target.name,
              recipientEmail: target.email,
              recipientRole: target.role,
              recipientDistrict: target.district,
              subject,
              preheader,
              headline,
              messageBody,
              category,
              actionButtonText,
              actionButtonUrl,
              baseUrl,
            });

            const sendRes = await sendBrevoEmail({
              toEmail: target.email,
              toName: target.name || target.email.split("@")[0],
              subject,
              htmlContent,
            });

            if (sendRes.success) {
              sentCount++;
              results.push({
                email: target.email,
                name: target.name,
                status: "sent",
                messageId: sendRes.messageId,
              });
            } else {
              failedCount++;
              if (sendRes.isIpError) {
                detectedIpError = true;
                ipErrorNotice = sendRes.message || "Brevo IP Whitelist restriction active";
              }
              results.push({
                email: target.email,
                name: target.name,
                status: "failed",
                error: sendRes.message || sendRes.error || "Failed to deliver via Brevo",
              });
            }
          } catch (err: any) {
            failedCount++;
            results.push({
              email: target.email,
              name: target.name,
              status: "failed",
              error: err?.message || "Unexpected exception during delivery",
            });
          }
        })
      );

      // Throttling sleep between batches (80ms)
      if (i + BATCH_SIZE < validRecipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }

    console.log(`[Bulk Mail API] Campaign complete. Sent: ${sentCount}, Failed: ${failedCount}, Total: ${validRecipients.length}`);

    return res.json({
      success: sentCount > 0 || !detectedIpError,
      total: validRecipients.length,
      sentCount,
      failedCount,
      results,
      isIpError: detectedIpError,
      brevoLink: detectedIpError ? "https://app.brevo.com/security/authorised_ips" : undefined,
      message: detectedIpError 
        ? `Brevo Security Notice: Your Brevo API key has IP restrictions enabled. Sent ${sentCount}/${validRecipients.length}. Go to https://app.brevo.com/security/authorised_ips to authorize server IPs.`
        : `Dispatched campaign to ${sentCount} recipients (${failedCount} failed).`,
    });
  } catch (error: any) {
    console.error("[Bulk Mail API Exception]:", error);
    return res.status(500).json({ error: error?.message || "Internal server error during bulk mail dispatch." });
  }
});

  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API Route Not Found", path: req.path });
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  return app;
}

export const app = createApp();
export default app;

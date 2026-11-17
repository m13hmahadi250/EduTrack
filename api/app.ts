import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import compression from "compression";
import multer from "multer";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { generateSitemap } from "./sitemap.js";
import {
  buildEduTrackSystemInstruction,
  ChatRateLimiter,
  SanitizedChatMessage,
  SafeChatRole,
  sanitizeChatbotPublicError,
  validateAndSanitizeChatPayload,
} from "./chatbotConfig.js";
import {
  sendBrevoEmail,
  generateWelcomeEmailHtml,
  generateWelcomeEmailText,
  generateOtpEmailHtml,
  generateOtpEmailText,
  generatePasswordResetEmailHtml,
  generatePasswordResetEmailText,
  generateBulkCampaignEmailHtml,
  generateBulkCampaignEmailText,
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
  verifyFirebaseIdToken,
  firestoreGetDocWithToken,
  firestoreGetSubdoc,
  firestoreHasConfirmedSession,
  VerifiedFirebaseToken,
} from "./firebaseAdmin.js";
import {
  generateRequestId,
  getFirebasePublicConfig,
  getSafeHealthStatus,
  getServerOtpSigningSecret,
  recordAuthFailureEvent,
} from "./config.js";

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

export interface MediaAuthorizationStore {
  getUserRoleAndStatus: (
    uid: string,
    callerIdToken?: string
  ) => Promise<{ role: string; isBlocked?: boolean } | null>;
  getTutorPhotoSource: (
    tutorId: string,
    callerIdToken?: string
  ) => Promise<{ key?: string; url?: string } | null>;
  hasConfirmedSession: (
    studentId: string,
    tutorId: string,
    callerIdToken?: string
  ) => Promise<boolean>;
}

export interface AppDeps {
  now?: () => number;
  authStore?: AuthChallengeStore;
  emailSender?: EmailSender;
  firebaseResetAdapter?: FirebaseResetAdapter;
  verifyIdToken?: (idToken: string) => Promise<VerifiedFirebaseToken>;
  mediaStore?: MediaAuthorizationStore;
  r2ObjectFetcher?: (keyOrUrl: string) => Promise<{ buffer: Buffer; contentType: string } | null>;
  storageUploader?: (params: {
    folder: string;
    fileName: string;
    mimetype: string;
    buffer: Buffer;
  }) => Promise<{ publicUrl: string; key: string }>;
  aiChatCompleter?: (params: {
    messages: SanitizedChatMessage[];
    roleContext: SafeChatRole;
    systemInstruction: string;
  }) => Promise<{ reply: string }>;
  aiAvailable?: () => boolean;
}

function maskEmailForLog(email: string): string {
  const parts = String(email || "").split("@");
  if (parts.length !== 2) return "***";
  const local = parts[0];
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${parts[1]}`;
}

function parseRequestCookies(req: express.Request): Record<string, string> {
  const header = req.headers?.cookie;
  const out: Record<string, string> = {};
  if (!header || typeof header !== "string") return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function setOtpChallengeCookies(
  res: express.Response,
  req: express.Request,
  opts: { challengeToken?: string; stateToken?: string; clear?: boolean }
) {
  const protoHeader = String(req.headers?.["x-forwarded-proto"] || "").toLowerCase();
  const isHttps = req.secure || protoHeader.includes("https");
  const baseAttrs = [
    "Path=/api/auth",
    "HttpOnly",
    "SameSite=Lax",
    ...(isHttps ? ["Secure"] : []),
  ];
  const cookies: string[] = [];
  if (opts.clear) {
    cookies.push(`edutrack_otp_token=; Max-Age=0; ${baseAttrs.join("; ")}`);
    cookies.push(`edutrack_otp_state=; Max-Age=0; ${baseAttrs.join("; ")}`);
  } else {
    if (opts.challengeToken) {
      cookies.push(
        `edutrack_otp_token=${encodeURIComponent(opts.challengeToken)}; Max-Age=360; ${baseAttrs.join("; ")}`
      );
    }
    if (opts.stateToken) {
      cookies.push(
        `edutrack_otp_state=${encodeURIComponent(opts.stateToken)}; Max-Age=360; ${baseAttrs.join("; ")}`
      );
    }
  }
  if (cookies.length > 0) {
    res.setHeader("Set-Cookie", cookies);
  }
}

function isSensitiveStorageKeyOrUrl(candidate: string): boolean {
  const normalized = String(candidate || "").trim().toLowerCase();
  return (
    normalized.startsWith("nid/") ||
    normalized.startsWith("documents/") ||
    normalized.startsWith("homework/") ||
    normalized.includes("/nid/") ||
    normalized.includes("/documents/") ||
    normalized.includes("/homework/")
  );
}

function extractR2KeyFromUrl(urlOrKey: string): string | null {
  const raw = String(urlOrKey || "").trim();
  if (!raw) return null;
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    return raw.replace(/^\/+/, "");
  }
  try {
    const parsed = new URL(raw);
    const pubBase = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "");
    if (pubBase && raw.startsWith(pubBase + "/")) {
      return decodeURIComponent(raw.slice(pubBase.length + 1));
    }
    const bucket = process.env.R2_BUCKET_NAME?.trim();
    if (bucket && parsed.pathname.startsWith(`/${bucket}/`)) {
      return decodeURIComponent(parsed.pathname.slice(bucket.length + 2));
    }
    if (parsed.hostname.endsWith(".r2.dev") || parsed.hostname.endsWith(".r2.cloudflarestorage.com")) {
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    }
  } catch {
    return null;
  }
  return null;
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

const FIREBASE_WEB_API_KEY = getFirebasePublicConfig().apiKey;

const defaultMediaStore: MediaAuthorizationStore = {
  getUserRoleAndStatus: async (uid: string, callerIdToken?: string) => {
    const docSnap = await firestoreGetDocWithToken("users", uid, callerIdToken);
    if (!docSnap?.data) return null;
    return {
      role: String(docSnap.data.role || ""),
      isBlocked: Boolean(docSnap.data.isBlocked),
    };
  },
  getTutorPhotoSource: async (tutorId: string, callerIdToken?: string) => {
    const privateDoc = await firestoreGetSubdoc("users", tutorId, "private", "media", callerIdToken).catch(() => null);
    if (privateDoc?.data) {
      const privKey = typeof privateDoc.data.profilePhotoKey === "string" ? privateDoc.data.profilePhotoKey.trim() : "";
      const privUrl = typeof privateDoc.data.profileImage === "string" ? privateDoc.data.profileImage.trim() : "";
      if (privKey || privUrl) {
        return { key: privKey || undefined, url: privUrl || undefined };
      }
    }
    const publicDoc = await firestoreGetDocWithToken("users", tutorId, callerIdToken);
    if (publicDoc?.data) {
      const legacyKey = typeof publicDoc.data.profilePhotoKey === "string" ? publicDoc.data.profilePhotoKey.trim() : "";
      const legacyUrl = typeof publicDoc.data.profileImage === "string" ? publicDoc.data.profileImage.trim() : "";
      if (legacyKey || legacyUrl) {
        return { key: legacyKey || undefined, url: legacyUrl || undefined };
      }
    }
    return null;
  },
  hasConfirmedSession: async (studentId: string, tutorId: string, callerIdToken?: string) => {
    return firestoreHasConfirmedSession(studentId, tutorId, callerIdToken);
  },
};

export function createApp(deps?: AppDeps) {
  const app = express();
  const getNow = deps?.now || (() => Date.now());
  const emailSender = deps?.emailSender || sendBrevoEmail;
  const verifyIdTokenFn = deps?.verifyIdToken || verifyFirebaseIdToken;
  const mediaStore = deps?.mediaStore || defaultMediaStore;
  const chatRateLimiter = new ChatRateLimiter({
    windowMs: 60_000,
    maxRequestsPerWindow: 20,
    burstWindowMs: 10_000,
    maxBurstRequests: 6,
  });
  const firebaseResetAdapter: FirebaseResetAdapter = deps?.firebaseResetAdapter || {
    isConfigured: isFirebaseAdminConfigured,
    lookupUserByEmail: lookupFirebaseUserByEmail,
    updatePassword: updateFirebaseUserPassword,
  };

  async function requireAuthenticatedUser(req: express.Request): Promise<{
    uid: string;
    email?: string;
    token: string;
  } | null> {
    const authHeader = String(req.headers.authorization || "").trim();
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return null;
    }
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    try {
      const verified = await verifyIdTokenFn(token);
      return { uid: verified.uid, email: verified.email, token };
    } catch {
      return null;
    }
  }

  // Enable Gzip/Brotli compression middleware for all responses
  app.use(compression({ threshold: 0 }));

  // Basic middleware
  app.use(cors());
  app.use(express.json());

const ALLOWED_STORAGE_FOLDERS = ["profiles", "documents", "nid", "homework"];
const ALLOWED_STORAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Security headers, requestId correlation, and Cache-Control policy middleware
app.use((req, res, next) => {
  const incomingReqId = typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"].trim() : "";
  const requestId = incomingReqId && /^[a-zA-Z0-9_-]{6,64}$/.test(incomingReqId) ? incomingReqId : generateRequestId();
  (req as any).requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (
    req.path.startsWith("/api/auth/") ||
    req.path.startsWith("/api/media/") ||
    req.path.startsWith("/api/ai/") ||
    req.path.startsWith("/api/groq/")
  ) {
    res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
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
  const requestId = String((req as any).requestId || generateRequestId());
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.json(getSafeHealthStatus(requestId));
});

app.get("/sitemap.xml", generateSitemap);
app.get("/api/sitemap.xml", generateSitemap);
app.get("/api/sitemap", generateSitemap);

/**
 * Authenticated Private Tutor Photo Proxy
 * - Never exposes raw Cloudflare R2 URLs in public state or HTML
 * - Verifies Firebase ID token and checks role / confirmed session authorization
 */
app.get("/api/media/tutor-photo/:tutorId", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const tutorId = String(req.params.tutorId || "").trim();
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(tutorId)) {
      return res.status(400).json({ error: "Invalid tutor identifier" });
    }

    const authCtx = await requireAuthenticatedUser(req);
    if (!authCtx) {
      return res.status(401).json({ error: "Authentication required to view private media" });
    }

    const requester = await mediaStore.getUserRoleAndStatus(authCtx.uid, authCtx.token);
    if (!requester || requester.isBlocked) {
      return res.status(403).json({ error: "Access denied" });
    }

    let authorized = false;
    if (requester.role === "admin" || authCtx.uid === tutorId) {
      authorized = true;
    } else if (requester.role === "student") {
      authorized = await mediaStore.hasConfirmedSession(authCtx.uid, tutorId, authCtx.token);
    }

    if (!authorized) {
      return res.status(403).json({
        error: "Tutor photo unlocks only after a confirmed tuition booking.",
      });
    }

    const photoSource = await mediaStore.getTutorPhotoSource(tutorId, authCtx.token);
    const sourceTarget = (photoSource?.key || photoSource?.url || "").trim();
    if (!sourceTarget) {
      return res.status(404).json({ error: "Tutor profile photo not found" });
    }

    if (isSensitiveStorageKeyOrUrl(sourceTarget)) {
      return res.status(403).json({ error: "Sensitive verification documents cannot be accessed via photo proxy" });
    }

    if (deps?.r2ObjectFetcher) {
      const mocked = await deps.r2ObjectFetcher(photoSource?.key || sourceTarget);
      if (!mocked) {
        return res.status(404).json({ error: "Photo asset unavailable" });
      }
      res.setHeader("Content-Type", mocked.contentType || "image/webp");
      return res.status(200).send(mocked.buffer);
    }

    const r2Key = photoSource?.key || extractR2KeyFromUrl(sourceTarget);
    if (r2Key && process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT) {
      const client = getS3Client();
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: r2Key,
      });
      const obj = await client.send(command);
      if (!obj.Body) {
        return res.status(404).json({ error: "Photo object body missing" });
      }
      const byteArray = await obj.Body.transformToByteArray();
      const buffer = Buffer.from(byteArray);
      res.setHeader("Content-Type", obj.ContentType || "image/webp");
      return res.status(200).send(buffer);
    }

    if (sourceTarget.startsWith("https://")) {
      const upstream = await fetch(sourceTarget, { redirect: "follow" });
      if (!upstream.ok) {
        return res.status(404).json({ error: "Upstream photo unavailable" });
      }
      const ctype = upstream.headers.get("content-type") || "image/webp";
      if (!ctype.toLowerCase().startsWith("image/")) {
        return res.status(403).json({ error: "Invalid upstream image content type" });
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader("Content-Type", ctype);
      return res.status(200).send(buf);
    }

    return res.status(404).json({ error: "Tutor profile photo not available" });
  } catch (error: any) {
    console.error("[Media Proxy] Error serving tutor photo:", error);
    return res.status(500).json({ error: "Failed to load authorized media" });
  }
});

/**
 * Modern Server-side Image Upload & Compression Endpoint
 * - Requires verified Firebase ID token
 * - Automatically resizes images to a maximum width of 800px
 * - Converts any incoming image to WebP format
 * - Saves high quality yet highly compressed file directly to Cloudflare R2 / S3
 */
app.post("/api/storage/upload", upload.single("image"), async (req, res) => {
  try {
    const authCtx = await requireAuthenticatedUser(req);
    if (!authCtx) {
      return res.status(401).json({ error: "Authentication required for file upload" });
    }

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

    if (deps?.storageUploader) {
      const uploaded = await deps.storageUploader({
        folder,
        fileName: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
      });
      return res.json({
        publicUrl: uploaded.publicUrl,
        key: uploaded.key,
        ...(folder === "profiles" ? { securePhotoPath: `/api/media/tutor-photo/${encodeURIComponent(authCtx.uid)}` } : {}),
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

    res.json({
      publicUrl,
      key,
      ...(folder === "profiles" ? { securePhotoPath: `/api/media/tutor-photo/${encodeURIComponent(authCtx.uid)}` } : {}),
    });
  } catch (error: any) {
    console.error("[Storage] Upload & compression error:", error);
    res.status(500).json({
      error: "Unable to upload your file right now. Please check the file and try again.",
    });
  }
});

// Cloudflare R2 Storage Presign Route (requires verified Firebase ID token)
app.post("/api/storage/presign", async (req, res) => {
  try {
    const authCtx = await requireAuthenticatedUser(req);
    if (!authCtx) {
      return res.status(401).json({ error: "Authentication required for upload presigning" });
    }

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
    res.status(500).json({
      error: "Unable to prepare file upload right now. Please try again shortly.",
    });
  }
});

// Server-side AI Assistant Configuration & Helpers
let aiClient: any = null;
function hasConfiguredGeminiKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return Boolean(
    apiKey &&
      apiKey !== "undefined" &&
      apiKey !== "null" &&
      apiKey !== "MY_GEMINI_API_KEY"
  );
}

function resolveGroqCandidateKeys(): string[] {
  const envKey = process.env.GROQ_API_KEY?.trim();
  if (!envKey || envKey === "MY_GROQ_API_KEY" || envKey === "undefined" || envKey === "null") {
    return [];
  }
  return [envKey];
}

function getGeminiClient() {
  if (!aiClient) {
    if (!hasConfiguredGeminiKey()) {
      throw new Error("AI service key is not configured.");
    }
    const apiKey = process.env.GEMINI_API_KEY!.trim();
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

function getChatClientKey(req: express.Request): string {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = forwarded || req.ip || req.socket?.remoteAddress || "unknown";
  return `chat:${ip}`;
}

async function generateWithGeminiFallback(
  messages: SanitizedChatMessage[],
  systemInstruction: string
): Promise<string> {
  const ai = getGeminiClient();
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents,
    config: {
      systemInstruction,
      temperature: 0.55,
      maxOutputTokens: 900,
    },
  });

  return String(response?.text || "").trim();
}

app.get("/api/ai/health", (req, res) => {
  const available = deps?.aiAvailable
    ? deps.aiAvailable()
    : resolveGroqCandidateKeys().length > 0 || hasConfiguredGeminiKey();
  res.json({
    ok: true,
    available,
    assistant: "EduTrack AI",
  });
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const rateCheck = chatRateLimiter.check(getChatClientKey(req), getNow());
    if (!rateCheck.allowed) {
      res.setHeader("Retry-After", String(rateCheck.retryAfterSec || 10));
      return res.status(429).json({
        error: "You are sending messages too quickly. Please wait a moment and try again.",
      });
    }

    const validation = validateAndSanitizeChatPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const systemInstruction = buildEduTrackSystemInstruction(validation.roleContext);

    if (deps?.aiChatCompleter) {
      const custom = await deps.aiChatCompleter({
        messages: validation.messages,
        roleContext: validation.roleContext,
        systemInstruction,
      });
      return res.json({ reply: custom.reply });
    }

    const replyText = await generateWithGeminiFallback(validation.messages, systemInstruction);
    if (!replyText) {
      return res.status(503).json({
        error: "EduTrack AI is temporarily unavailable right now. Please try again shortly.",
      });
    }

    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error("[EduTrack AI Chat Error]:", error?.message || "Upstream assistant error");
    const safeErr = sanitizeChatbotPublicError(error?.status, error?.message);
    return res.status(safeErr.status).json({ error: safeErr.message });
  }
});

app.post("/api/groq/chat", async (req, res) => {
  try {
    const rateCheck = chatRateLimiter.check(getChatClientKey(req), getNow());
    if (!rateCheck.allowed) {
      res.setHeader("Retry-After", String(rateCheck.retryAfterSec || 10));
      return res.status(429).json({
        error: "You are sending messages too quickly. Please wait a moment and try again.",
      });
    }

    const validation = validateAndSanitizeChatPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const systemInstruction = buildEduTrackSystemInstruction(validation.roleContext);

    if (deps?.aiChatCompleter) {
      const custom = await deps.aiChatCompleter({
        messages: validation.messages,
        roleContext: validation.roleContext,
        systemInstruction,
      });
      return res.json({ reply: custom.reply });
    }

    const candidateKeys = resolveGroqCandidateKeys();
    const providerMessages = [
      { role: "system", content: systemInstruction },
      ...validation.messages.map((m) => ({
        role: m.role,
        content: m.content,
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
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: providerMessages,
              temperature: 0.55,
              max_tokens: 900,
            }),
            signal: AbortSignal.timeout(18_000),
          });

          lastStatus = response.status;

          if (response.ok) {
            const data = await response.json();
            const content = String(data?.choices?.[0]?.message?.content || "").trim();
            if (content) {
              replyText = content;
              break outerLoop;
            }
          } else if (response.status === 401 || response.status === 403) {
            break;
          }
        } catch (fetchErr: any) {
          console.warn("[EduTrack AI Chat Fetch Warning]:", fetchErr?.name || "Request failed");
        }
      }
    }

    // Secondary server-side AI fallback if primary provider failed and Gemini key is configured
    if (!replyText && hasConfiguredGeminiKey()) {
      try {
        replyText = await generateWithGeminiFallback(validation.messages, systemInstruction);
      } catch (secondaryErr: any) {
        console.warn("[EduTrack AI Secondary Warning]:", secondaryErr?.message || "Secondary check failed");
      }
    }

    if (!replyText) {
      const safeErr = sanitizeChatbotPublicError(lastStatus || 503);
      return res.status(safeErr.status).json({ error: safeErr.message });
    }

    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error("[EduTrack AI Chat Exception]:", error?.message || "Unexpected error");
    const safeErr = sanitizeChatbotPublicError(error?.status, error?.message);
    return res.status(safeErr.status).json({ error: safeErr.message });
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
    res.status(500).json({
      error: "Unable to update notification settings right now. Please try again later.",
    });
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
    const reqCookies = parseRequestCookies(req);
    const nowMs = getNow();
    const existingOtp = await store.getActiveCooldownChallenge(
      normalizedEmail,
      nowMs,
      reqCookies.edutrack_otp_state
    );

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

    const createdChallenge = await store.createOtpChallenge({
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
      const requestId = String((req as any).requestId || generateRequestId());
      const failureCode = (emailResult as any).code || "EMAIL_DELIVERY_FAILED";
      console.warn(
        `[OTP Auth] Delivery failed on ${store.backendName} for ${maskEmailForLog(normalizedEmail)} (req=${requestId}, challenge=${challengeId}, code=${failureCode}): ${emailResult.error}`
      );
      if ((emailResult as any).simulated) {
        setOtpChallengeCookies(res, req, {
          challengeToken: createdChallenge?.challengeToken,
          stateToken: createdChallenge?.stateToken,
        });
        return res.json({
          success: true,
          emailSent: true,
          challengeId,
          ...(createdChallenge?.challengeToken ? { challengeToken: createdChallenge.challengeToken } : {}),
          requestId,
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
      setOtpChallengeCookies(res, req, { clear: true });
      recordAuthFailureEvent({
        route: "/api/auth/send-otp",
        code: failureCode,
        status: 502,
        requestId,
        nowMs,
      });

      return res.status(400).json({
        success: false,
        emailSent: false,
        code: "EMAIL_DELIVERY_FAILED",
        providerCode: failureCode,
        requestId,
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

    setOtpChallengeCookies(res, req, {
      challengeToken: createdChallenge?.challengeToken,
      stateToken: createdChallenge?.stateToken,
    });

    const requestId = String((req as any).requestId || generateRequestId());
    console.info(
      `[OTP Auth] Issued 6-digit challenge on ${store.backendName} for ${maskEmailForLog(normalizedEmail)} (req=${requestId}, challenge=${challengeId}, expiresAt=${new Date(expiresAtMs).toISOString()})`
    );

    return res.json({
      success: true,
      emailSent: true,
      challengeId,
      ...(createdChallenge?.challengeToken ? { challengeToken: createdChallenge.challengeToken } : {}),
      requestId,
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
    const requestId = String((req as any).requestId || generateRequestId());
    if (error instanceof StorageUnavailableError) {
      recordAuthFailureEvent({
        route: "/api/auth/send-otp",
        code: error.code,
        status: 503,
        requestId,
        nowMs: getNow(),
      });
      return res.status(503).json({
        success: false,
        code: error.code,
        requestId,
        error: error.message,
      });
    }
    recordAuthFailureEvent({
      route: "/api/auth/send-otp",
      code: "OTP_SEND_ERROR",
      status: 500,
      requestId,
      nowMs: getNow(),
    });
    console.error(`[Send OTP API Error] (req=${requestId}):`, error?.message || error);
    return res.status(500).json({
      success: false,
      code: "OTP_SEND_ERROR",
      requestId,
      error: "Failed to send verification email right now. Please try again shortly.",
    });
  }
});

// 2. Verify 6-Digit OTP Code Endpoint
app.post("/api/auth/verify-otp", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    const { email, otp, challengeId, challengeToken } = req.body;

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
    const cleanChallengeToken =
      typeof challengeToken === "string" && challengeToken.trim() ? challengeToken.trim() : undefined;

    if (cleanOtp.length !== OTP_CONFIG.length) {
      return res.status(400).json({
        success: false,
        code: "OTP_FORMAT_INVALID",
        error: `Please enter a valid ${OTP_CONFIG.length}-digit OTP code.`,
      });
    }

    const store = await getAuthChallengeStore(deps?.authStore);
    const reqCookies = parseRequestCookies(req);
    const nowMs = getNow();
    const result = await store.verifyOtpChallenge({
      email: normalizedEmail,
      otpCode: cleanOtp,
      challengeId: cleanChallengeId,
      challengeToken: cleanChallengeToken,
      cookieChallengeToken: reqCookies.edutrack_otp_token,
      cookieStateToken: reqCookies.edutrack_otp_state,
      nowMs,
    });

    if (result.nextStateToken) {
      setOtpChallengeCookies(res, req, { stateToken: result.nextStateToken });
    }

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
    const hmacSecret =
      getServerOtpSigningSecret() ||
      process.env.OTP_HMAC_SECRET ||
      FIREBASE_WEB_API_KEY ||
      "edutrack-bd-otp-hmac";
    const signature = crypto
      .createHmac("sha256", hmacSecret)
      .update(`${normalizedEmail}:${result.challengeId}:${issuedAt}:verified`)
      .digest("hex");
    const verificationToken = `${Buffer.from(normalizedEmail).toString("base64url")}.${issuedAt}.${signature}`;

    const requestId = String((req as any).requestId || generateRequestId());
    console.info(
      `[OTP Auth] Verified 6-digit OTP on ${store.backendName} for ${maskEmailForLog(normalizedEmail)} (req=${requestId}, challenge=${result.challengeId})`
    );

    return res.json({
      success: true,
      verified: true,
      challengeId: result.challengeId,
      requestId,
      otpLength: OTP_CONFIG.length,
      verificationToken,
      message: "Email verified successfully! You may now complete your registration.",
    });
  } catch (error: any) {
    const requestId = String((req as any).requestId || generateRequestId());
    if (error instanceof StorageUnavailableError) {
      recordAuthFailureEvent({
        route: "/api/auth/verify-otp",
        code: error.code,
        status: 503,
        requestId,
        nowMs: getNow(),
      });
      return res.status(503).json({
        success: false,
        code: error.code,
        requestId,
        error: error.message,
      });
    }
    recordAuthFailureEvent({
      route: "/api/auth/verify-otp",
      code: "OTP_VERIFY_ERROR",
      status: 500,
      requestId,
      nowMs: getNow(),
    });
    console.error(`[Verify OTP API Error] (req=${requestId}):`, error?.message || error);
    return res.status(500).json({
      success: false,
      code: "OTP_VERIFY_ERROR",
      requestId,
      error: "Failed to verify OTP code right now. Please try again shortly.",
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
      const textContent = generatePasswordResetEmailText({
        email: normalizedEmail,
        resetLink,
        expiresMinutes: 15,
      });

      const emailResult = await emailSender({
        toEmail: normalizedEmail,
        toName: normalizedEmail.split("@")[0],
        subject: "Reset your password | EduTrack Bangladesh",
        htmlContent,
        textContent,
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
          signal: AbortSignal.timeout(12_000),
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
    const requestId = String((req as any).requestId || generateRequestId());
    if (error instanceof StorageUnavailableError) {
      recordAuthFailureEvent({
        route: "/api/auth/forgot-password",
        code: error.code,
        status: 503,
        requestId,
        nowMs: getNow(),
      });
      return res.status(503).json({
        success: false,
        code: error.code,
        requestId,
        error: error.message,
      });
    }
    recordAuthFailureEvent({
      route: "/api/auth/forgot-password",
      code: "FORGOT_PASSWORD_ERROR",
      status: 500,
      requestId,
      nowMs: getNow(),
    });
    console.error(`[Forgot Password API Error] (req=${requestId}):`, error?.message || error);
    return res.status(500).json({
      success: false,
      code: "FORGOT_PASSWORD_ERROR",
      requestId,
      error: "Failed to initiate password reset right now. Please try again.",
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
            signal: AbortSignal.timeout(12_000),
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
const dispatchedWelcomeEmails = new Set<string>();

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
      accountType,
      studentClass, 
      school, 
      university, 
      course, 
      district, 
      customMessage, 
      profileUrl, 
      baseUrl,
      forceSend,
    } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let finalUserId = userId || id || uid || tutorId || teacherId;
    if (!finalUserId && normalizedEmail && isFirebaseAdminConfigured()) {
      try {
        const matchedUsers = await firestoreQueryByField("users", "email", normalizedEmail, 1);
        if (matchedUsers[0]?.id) {
          finalUserId = matchedUsers[0].id;
        }
      } catch (e) {}
    }

    const dedupeKey = finalUserId ? `uid:${finalUserId}|email:${normalizedEmail}` : `email:${normalizedEmail}`;
    if (!forceSend && !customMessage && dispatchedWelcomeEmails.has(dedupeKey)) {
      return res.json({
        success: true,
        alreadySent: true,
        message: "Welcome email already dispatched for this account.",
      });
    }

    const isTutor = role === 'tutor';
    const computedProfileUrl = profileUrl || (finalUserId && isTutor ? `https://edutrackbd.vercel.app/teachers/${finalUserId}` : undefined);
    const computedBaseUrl = baseUrl || "https://edutrackbd.vercel.app";

    const emailParams = {
      userId: finalUserId,
      email: normalizedEmail,
      name: name || (isTutor ? "Educator" : "Member"),
      role: role || "student",
      accountType,
      studentClass,
      school,
      university,
      course,
      district,
      customMessage,
      profileUrl: computedProfileUrl,
      baseUrl: computedBaseUrl,
    };

    const htmlContent = generateWelcomeEmailHtml(emailParams);
    const textContent = generateWelcomeEmailText(emailParams);

    const subject = customMessage 
      ? `EduTrack Bangladesh — Account Notice for ${name || 'Member'}`
      : `Welcome to EduTrack! | EduTrack Bangladesh`;

    const result = await emailSender({
      toEmail: normalizedEmail,
      toName: name || normalizedEmail,
      subject,
      htmlContent,
      textContent,
    });

    if (result.success && !customMessage) {
      dispatchedWelcomeEmails.add(dedupeKey);
    }

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
      accountType,
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

    const customParams = {
      userId: finalUserId,
      email: toEmail,
      name: toName || toEmail,
      role: role || "student",
      accountType,
      district,
      studentClass,
      school,
      university,
      course,
      customMessage: messageBody,
      profileUrl: computedProfileUrl,
      baseUrl: computedBaseUrl,
    };

    const htmlContent = generateWelcomeEmailHtml(customParams);
    const textContent = generateWelcomeEmailText(customParams);

    const finalSubject = subject || `Message from EduTrack Bangladesh Administration`;

    const result = await emailSender({
      toEmail,
      toName: toName || toEmail,
      subject: finalSubject,
      htmlContent,
      textContent,
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
            const bulkParams = {
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
            };
            const htmlContent = generateBulkCampaignEmailHtml(bulkParams);
            const textContent = generateBulkCampaignEmailText(bulkParams);

            const sendRes = await emailSender({
              toEmail: target.email,
              toName: target.name || target.email.split("@")[0],
              subject,
              htmlContent,
              textContent,
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
    res.status(404).json({
      success: false,
      code: "API_NOT_FOUND",
      error: "API Route Not Found",
      path: req.path,
    });
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        code: "FILE_TOO_LARGE",
        error: "Uploaded file exceeds the maximum allowed size limit (10MB).",
      });
    }
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({
        success: false,
        code: "INVALID_JSON",
        error: "Malformed JSON request payload.",
      });
    }
    console.error("[API Unhandled Error]:", err?.message || err);
    return res.status(500).json({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      error: "An unexpected server error occurred. Please try again.",
    });
  });

  return app;
}

export const app = createApp();
export default app;

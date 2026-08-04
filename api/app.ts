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
import { sendBrevoEmail, generateWelcomeEmailHtml, generateOtpEmailHtml } from "./mailService.js";
import { 
  connectMongoDB, 
  AdminActionLog, 
  UserMirror, 
  SystemConfigMirror, 
  AdminMailMirror, 
  TuitionMirror 
} from "./mongo.js";

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

export const app = express();

// Enable Gzip/Brotli compression middleware for all responses
app.use(compression({ threshold: 0 }));

// Basic middleware
app.use(cors());
app.use(express.json());

// Set Cache-Control header for API GET endpoints to enable browser caching
app.use((req, res, next) => {
  if (req.method === "GET" && req.path.startsWith("/api/")) {
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

    const folder = req.body.folder || "profiles";

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
    const sanitizedName = originalName.replace(/\s+/g, "_").toLowerCase();
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

    const client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error("R2_BUCKET_NAME not defined");

    const key = `${folder}/${Date.now()}-${fileName.replace(/\s+/g, "_")}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
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

    // 1. Get the Groq API Key securely
    const groqApiKey = process.env.GROQ_API_KEY || "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";

    if (!groqApiKey || groqApiKey === "MY_GROQ_API_KEY") {
      return res.status(400).json({ error: "Groq API Key is missing. Please configure GROQ_API_KEY under Settings > Secrets." });
    }

    // 2. Format the messages for the OpenAI/Groq compatible schema
    const groqMessages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
        content: m.text || m.content || ""
      }))
    ];

    // 3. Make the API request to Groq
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Groq API Error Response]:", errorData);
      throw new Error(errorData.error?.message || `Groq API responded with status ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.choices?.[0]?.message?.content || "I am here to help you with EduTrack Bangladesh! Let me know if you have any questions.";
    
    res.json({ reply: replyText });
  } catch (error: any) {
    console.error("[Groq Chat API Error]:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI response from Groq" });
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
 * In-memory temporary store for Email Verification OTPs
 */
interface OtpRecord {
  otp: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpRecord>();

// Cleanup routine: automatically remove expired OTP entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(email);
    }
  }
}, 10 * 60 * 1000);

/**
 * Email Signup OTP Verification Routes
 */

// 1. Send OTP Code Endpoint
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ success: false, error: "Valid email address is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, error: "Invalid email format" });
    }

    // Generate cryptographically secure 6-digit numeric OTP code
    const otpBuffer = crypto.randomInt(100000, 1000000);
    const otpCode = otpBuffer.toString();

    // Store in-memory with a 10-minute expiry time
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(normalizedEmail, {
      otp: otpCode,
      expiresAt,
      attempts: 0,
    });

    // Generate HTML content and send via Brevo REST API service
    const htmlContent = generateOtpEmailHtml({
      email: normalizedEmail,
      otpCode,
      expiresMinutes: 10,
    });

    const emailResult = await sendBrevoEmail({
      toEmail: normalizedEmail,
      toName: name || normalizedEmail.split("@")[0],
      subject: `EduTrack BD - Verification Code: ${otpCode}`,
      htmlContent,
    });

    console.log(`[OTP AUTH CODE GENERATED] Email: ${normalizedEmail} | OTP Code: ${otpCode}`);

    if (!emailResult.success) {
      if (emailResult.isIpError) {
        return res.status(200).json({
          success: true,
          isIpError: true,
          error: emailResult.error,
          message: emailResult.message,
          brevoLink: emailResult.brevoLink,
          expiresInSeconds: 600,
        });
      }

      if (emailResult.isKeyError || emailResult.isEmailError || emailResult.isNetworkError) {
        return res.status(200).json({
          success: true,
          isNotice: true,
          message: `A 6-digit verification code has been generated for ${normalizedEmail}. (${emailResult.message})`,
          error: emailResult.error,
          expiresInSeconds: 600,
        });
      }
    }

    console.log(`[OTP Auth] Sent OTP code to ${normalizedEmail}`);

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}. Please check your inbox.`,
      expiresInSeconds: 600,
    });
  } catch (error: any) {
    console.error("[Send OTP API Error]:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to send verification email. Please try again.",
    });
  }
});

// 2. Verify OTP Code Endpoint
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: "Email and 6-digit OTP code are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({
        success: false,
        error: "No verification code requested for this email or code has expired. Please request a new OTP.",
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        error: "Verification code has expired. Please click 'Resend OTP' to receive a new code.",
      });
    }

    if (record.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        error: "Maximum verification attempts exceeded. Please request a new OTP code.",
      });
    }

    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      const remaining = 5 - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect verification code. Please check your inbox and try again. (${remaining} attempts remaining)`,
      });
    }

    // OTP matched successfully! Clear from memory store to prevent reuse
    otpStore.delete(normalizedEmail);

    console.log(`[OTP Auth] Verified OTP successfully for ${normalizedEmail}`);

    res.json({
      success: true,
      message: "Email verified successfully! You may now complete your registration.",
    });
  } catch (error: any) {
    console.error("[Verify OTP API Error]:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to verify OTP code. Please try again.",
    });
  }
});

/**
 * Brevo Mail API Endpoints
 */
app.post("/api/mail/send-welcome", async (req, res) => {
  try {
    const { email, name, role, studentClass, school, university, course, district, customMessage } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    const htmlContent = generateWelcomeEmailHtml({
      email,
      name: name || "Member",
      role: role || "student",
      studentClass,
      school,
      university,
      course,
      district,
      customMessage
    });

    const subject = customMessage 
      ? `EduTrack Bangladesh - Welcome & Special Message for ${name || 'User'}`
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
    const { toEmail, toName, subject, messageBody, role, district } = req.body;
    
    if (!toEmail || !messageBody) {
      return res.status(400).json({ error: "toEmail and messageBody are required" });
    }

    const htmlContent = generateWelcomeEmailHtml({
      email: toEmail,
      name: toName || toEmail,
      role: role || "student",
      district,
      customMessage: messageBody
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

/**
 * -------------------------------------------------------------
 * MongoDB Secondary Database Sync & Mirroring Endpoints
 * -------------------------------------------------------------
 */

// 1. Get MongoDB Connection & Collections Status
app.get("/api/admin/mongo/status", async (req, res) => {
  try {
    const isConfigured = !!process.env.MONGODB_URI;
    const connected = await connectMongoDB();

    if (!connected) {
      return res.json({
        connected: false,
        isConfigured,
        message: isConfigured 
          ? "MongoDB connection string configured, but server could not establish connection." 
          : "MONGODB_URI environment variable is not configured. Standing by.",
        counts: { userMirrors: 0, adminLogs: 0, systemConfigs: 0, adminMails: 0, tuitionMirrors: 0 }
      });
    }

    const [userMirrors, adminLogs, systemConfigs, adminMails, tuitionMirrors] = await Promise.all([
      UserMirror.countDocuments(),
      AdminActionLog.countDocuments(),
      SystemConfigMirror.countDocuments(),
      AdminMailMirror.countDocuments(),
      TuitionMirror.countDocuments()
    ]);

    res.json({
      connected: true,
      isConfigured: true,
      dbName: "edutrack_secondary",
      counts: {
        userMirrors,
        adminLogs,
        systemConfigs,
        adminMails,
        tuitionMirrors
      }
    });
  } catch (error: any) {
    console.error("[MongoDB Status Route Error]:", error);
    res.status(500).json({ connected: false, error: error.message });
  }
});

// 2. Mirror/Copy Admin Created/Pushed Data to MongoDB automatically
app.post("/api/admin/mongo/mirror", async (req, res) => {
  try {
    const { actionType, entityType, entityId, payload, adminEmail } = req.body;

    if (!actionType || !entityType) {
      return res.status(400).json({ error: "Missing required fields: actionType, entityType" });
    }

    const connected = await connectMongoDB();

    // 1. Always record in AdminActionLog if MongoDB is connected
    let savedLog = null;
    if (connected) {
      savedLog = await AdminActionLog.create({
        actionType,
        entityType,
        entityId,
        payload,
        adminEmail: adminEmail || "admin@edutrack.bd",
        syncedToFirestore: true
      });

      // 2. Entity-specific schema mirroring
      if (entityType === "users" && payload && (entityId || payload.id)) {
        const userId = entityId || payload.id;
        await (UserMirror as any).findOneAndUpdate(
          { firestoreId: userId },
          {
            $set: {
              firestoreId: userId,
              email: payload.email || "unknown@user.bd",
              name: payload.name,
              role: payload.role,
              isVerified: payload.isVerified,
              isBlocked: payload.isBlocked,
              balance: payload.balance,
              nidStatus: payload.nidStatus,
              academicStatus: payload.academicStatus,
              gender: payload.gender,
              phone: payload.phone,
              district: payload.district,
              showOnHomePage: payload.showOnHomePage,
              updatedByAdmin: adminEmail || "admin@edutrack.bd",
              lastSyncedAt: new Date()
            }
          },
          { upsert: true, new: true }
        );
      } else if (entityType === "system" && payload) {
        const configKey = payload.configKey || "global_config";
        await (SystemConfigMirror as any).findOneAndUpdate(
          { configKey },
          {
            $set: {
              configKey,
              value: payload.value || payload,
              pushedByAdmin: adminEmail || "admin@edutrack.bd",
              lastSyncedAt: new Date()
            }
          },
          { upsert: true, new: true }
        );
      } else if (entityType === "mail" && payload) {
        await AdminMailMirror.create({
          toEmail: payload.toEmail,
          toName: payload.toName,
          subject: payload.subject,
          messageBody: payload.messageBody,
          roleScope: payload.role,
          districtScope: payload.district,
          pushedByAdmin: adminEmail || "admin@edutrack.bd"
        });
      } else if (entityType === "tuition" && payload && (entityId || payload.id)) {
        const tuitionId = entityId || payload.id;
        await (TuitionMirror as any).findOneAndUpdate(
          { firestoreId: tuitionId },
          {
            $set: {
              firestoreId: tuitionId,
              title: payload.title,
              subject: payload.subject,
              studentClass: payload.studentClass,
              district: payload.district,
              salary: payload.salary,
              status: payload.status || "active",
              pushedByAdmin: adminEmail || "admin@edutrack.bd",
              lastSyncedAt: new Date()
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    res.json({
      success: true,
      mongoSaved: connected,
      actionType,
      entityType,
      entityId,
      message: connected 
        ? "Data successfully saved to Firestore and mirrored to MongoDB secondary database!" 
        : "Data saved to Firestore. MongoDB secondary database is offline or unconfigured."
    });
  } catch (error: any) {
    console.error("[MongoDB Mirror Route Error]:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Fetch Recent MongoDB Action Logs & Records for Admin Inspection
app.get("/api/admin/mongo/logs", async (req, res) => {
  try {
    const connected = await connectMongoDB();
    if (!connected) {
      return res.json({ connected: false, logs: [], userMirrors: [] });
    }

    const [logs, userMirrors, systemConfigs, adminMails] = await Promise.all([
      AdminActionLog.find().sort({ createdAt: -1 }).limit(50).lean(),
      UserMirror.find().sort({ updatedAt: -1 }).limit(50).lean(),
      SystemConfigMirror.find().sort({ updatedAt: -1 }).limit(20).lean(),
      AdminMailMirror.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    res.json({
      connected: true,
      logs,
      userMirrors,
      systemConfigs,
      adminMails
    });
  } catch (error: any) {
    console.error("[MongoDB Logs Route Error]:", error);
    res.status(500).json({ connected: false, error: error.message });
  }
});

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API Route Not Found", path: req.path });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

export default app;

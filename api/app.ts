import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import compression from "compression";
import multer from "multer";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GoogleGenAI, Type } from "@google/genai";

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

// Lazy Gemini client initialization
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return geminiClient;
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

/**
 * AI-powered Assistant for message suggestions
 * - Highly specific inquiries structured around a tutor's background
 */
app.post("/api/suggest-questions", async (req, res) => {
  try {
    const { tutorName, subjects, classes, university, hourlyRate, experience, bio } = req.body;
    
    // Check if GEMINI_API_KEY is present; if not, immediately use the fallback questions to avoid throwing an unhandled exception before calling getGeminiClient
    if (!process.env.GEMINI_API_KEY) {
      console.warn("[Gemini] GEMINI_API_KEY is not defined. Using fallback suggested questions.");
      return res.json({
        questions: [
          `Hey ${tutorName || "there"}, what is your usual weekly schedule and available slots?`,
          `Are you comfortable tutoring ${subjects && Array.isArray(subjects) && subjects.length > 0 ? subjects[0] : "these subjects"} online or is it solely in-person?`,
          `Could we schedule a brief demo or trial session to coordinate teaching style?`,
          `What are your expectations for tutoring materials and progress tracking?`
        ]
      });
    }

    const client = getGeminiClient();
    
    const prompt = `You are an AI assistant on EduTrack (a premium tutor finder platform in Bangladesh). Your job is to suggest exactly 4 polite, specific, and highly relevant inquiry questions that a student can ask this specified tutor during their initial connection.
    
    TUTOR DETAILS:
    - Name: ${tutorName || 'the tutor'}
    - University: ${university || 'Not specified'}
    - Subjects they teach: ${subjects && Array.isArray(subjects) ? subjects.join(", ") : 'Not specified'}
    - Target classes: ${classes && Array.isArray(classes) ? classes.join(", ") : 'Not specified'}
    - Experience: ${experience || 'Not specified'}
    - Hourly Rate: ${hourlyRate ? hourlyRate + ' BDT' : 'Negotiable'}
    - Bio / Teaching approach: ${bio || 'Not specified'}
    
    REQUIREMENTS FOR THE QUESTIONS:
    1. Keep them natural, humble, and standard for Bangladeshi tutoring culture (NCTB syllabus, SSC/HSC exam style, admission tests, etc. are keywords where relevant).
    2. Make at least 1 or 2 questions highly specific to the tutor's background (for example: if they are from BUET, DU, DMC, etc., ask about mathematics/engineering/medical admissions prep; if they teach specific subjects, ask questions related to those subjects).
    3. Keep each question short, engaging, and in first-person (as a student asking the tutor).
    4. Write them in standard English, formatted clearly.
    5. Return a flat array of 4 strings. No numbering, no prefixes, just the direct questions.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          },
          description: "A list of exactly 4 suggested inquiry questions for the student to ask this tutor."
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Unable to get response text from Gemini API");
    }

    const questions = JSON.parse(text);
    res.json({ questions });
  } catch (error: any) {
    console.error("[Gemini] Suggest questions error:", error);
    // Return standard fallback questions if Gemini fails
    const tutorName = req.body.tutorName;
    const subjects = req.body.subjects;
    const fallbackQuestions = [
      `Hi ${tutorName || "there"}, what is your usual weekly schedule and available slots?`,
      `Are you comfortable tutoring ${subjects && Array.isArray(subjects) && subjects.length > 0 ? subjects[0] : "these subjects"} online or is it solely in-person?`,
      `Could we schedule a brief demo or trial session to coordinate teaching style?`,
      `What are your expectations for tutoring materials and progress tracking?`
    ];
    res.json({ questions: fallbackQuestions, error: error.message });
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

import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import compression from "compression";
import multer from "multer";
import sharp from "sharp";
import fs from "fs";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeFirestore, doc, getDocFromServer, terminate } from "firebase/firestore";

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

// Boot-sequence dependency check state variables
let bootCompleted = false;
let bootError: string | null = null;
let r2Healthy = false;
let firebaseHealthy = false;

async function checkDependencies() {
  console.log("[Boot] Starting structural reachability checks...");

  // 1. Check Firebase reaching
  try {
    const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(firebaseConfigPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
      // Initialize with unique name for the server boot check
      const bootApp = initializeApp(firebaseConfig, "ServerBootApp");
      const db = initializeFirestore(bootApp, {
        experimentalForceLongPolling: true,
      }, firebaseConfig.firestoreDatabaseId);

      try {
        // Verify connection to Firestore by requesting the connection test document
        const docRef = doc(db, 'test', 'connection');
        const testConnectionPromise = getDocFromServer(docRef);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Firebase Firestore connection timed out after 5000ms")), 5000)
        );

        // Let's await either the successful read or a timeout
        await Promise.race([testConnectionPromise, timeoutPromise]);
        firebaseHealthy = true;
        console.log("[Boot] Firebase Firestore is fully reachable and responsive!");
      } finally {
        try {
          await terminate(db).catch(() => {});
          await deleteApp(bootApp).catch(() => {});
          console.log("[Boot] Temporary Firebase instance cleaned up and terminated successfully.");
        } catch (cleanupErr) {
          console.warn("[Boot] Warning during Firebase temporary cleanup:", cleanupErr);
        }
      }
    } else {
      console.warn("[Boot] firebase-applet-config.json not found, skipping connection check.");
      firebaseHealthy = true; // allow gracefully if config is not present
    }
  } catch (err: any) {
    // If the error message is simply permission-denied, Firestore is reached!
    if (err && (err.code === 'permission-denied' || (err.message && err.message.includes('permission-denied')))) {
      firebaseHealthy = true;
      console.log("[Boot] Firebase Firestore is fully reachable (permission-denied expected without logged-in auth).");
    } else {
      console.error("[Boot] Firebase reachability check failed:", err.message || err);
      firebaseHealthy = false;
      bootError = `Firebase service is unreachable: ${err.message || err}`;
      throw err;
    }
  }

  // 2. Check Cloudflare R2 reaching
  try {
    const bucket = process.env.R2_BUCKET_NAME;
    if (bucket) {
      const s3 = getS3Client();
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 1,
      });

      const testR2Promise = s3.send(command);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Cloudflare R2 connection timed out after 5000ms")), 5000)
      );

      await Promise.race([testR2Promise, timeoutPromise]);
      r2Healthy = true;
      console.log("[Boot] Cloudflare R2 storage is fully reachable and authorized!");
    } else {
      console.warn("[Boot] R2_BUCKET_NAME is not configured, skipping optional check.");
      r2Healthy = true;
    }
  } catch (err: any) {
    console.error("[Boot] Cloudflare R2 reachability check failed:", err.message || err);
    r2Healthy = false;
    const msg = `Cloudflare R2 is unreachable: ${err.message || err}`;
    bootError = bootError ? `${bootError} | ${msg}` : msg;
    throw err;
  }

  bootCompleted = true;
}

export const app = express();

// Ensure local uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded files statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Enable Gzip/Brotli compression middleware for all responses
app.use(compression({ threshold: 0 }));

// Basic middleware
app.use(cors());
app.use(express.json());

// Boot-sequence dependency blocker middleware to fail early instead of silent 'unknown error' failures
app.use((req, res, next) => {
  // Allow healthcheck always so the monitoring or developers can inspect status
  if (req.path === "/api/health") {
    return next();
  }

  if (bootError) {
    return res.status(503).json({
      error: "Service Unavailable",
      message: "Server failed to fully connect to critical dependencies during the boot sequence.",
      details: bootError
    });
  }

  if (!bootCompleted) {
    return res.status(503).json({
      error: "Service Unavailable",
      message: "Server is booting and performing dependency reachability checks. Please try again shortly.",
    });
  }

  next();
});

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
  const isHealthy = bootCompleted && !bootError;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "unhealthy",
    env: process.env.NODE_ENV,
    cloud: !!process.env.VERCEL,
    dependencies: {
      bootCompleted,
      bootError: bootError || undefined,
      firebase: firebaseHealthy ? "reachable" : "unreachable",
      cloudflareR2: r2Healthy ? "reachable" : "unreachable"
    }
  });
});

/**
 * Modern Server-side Image Upload & Compression Endpoint
 * - Automatically resizes images to a maximum width of 800px
 * - Converts any incoming image to WebP format
 * - Saves high quality yet highly compressed file directly to Cloudflare R2 / S3
 * - FALLS BACK to local disk storage on any failure/misconfiguration to ensure 100% reliability
 */
app.post("/api/storage/upload", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const folder = req.body.folder || "profiles";

    // Prepare Name & Path
    const originalName = file.originalname.substring(0, file.originalname.lastIndexOf(".")) || file.originalname;
    const sanitizedName = originalName.replace(/\s+/g, "_").toLowerCase();
    const filename = `${Date.now()}-${sanitizedName}.webp`;

    // 1. Process with sharp: resize (max 800px wide), compress & output WebP format
    let finalBuffer: Buffer = file.buffer;
    let isWebP = false;
    try {
      finalBuffer = await sharp(file.buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      isWebP = true;
    } catch (sharpErr) {
      console.warn("[Storage] Sharp compression skipped or failed, using original file buffer:", sharpErr);
    }

    const finalFilename = isWebP ? filename : `${Date.now()}-${file.originalname.replace(/\s+/g, "_").toLowerCase()}`;

    try {
      const client = getS3Client();
      const bucket = process.env.R2_BUCKET_NAME;
      if (!bucket) throw new Error("R2_BUCKET_NAME not defined");

      const key = `${folder}/${finalFilename}`;

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: finalBuffer,
        ContentType: isWebP ? "image/webp" : file.mimetype,
      });

      await client.send(command);

      const publicUrlBase = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${bucket}`;
      const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${key}`;

      res.json({ publicUrl, key });
    } catch (r2Error: any) {
      console.warn("[Storage] Cloud S3/R2 direct upload failed. Saving file locally to preserve uptime:", r2Error.message);
      
      const localTargetDir = path.join(UPLOADS_DIR, folder);
      if (!fs.existsSync(localTargetDir)) {
        fs.mkdirSync(localTargetDir, { recursive: true });
      }

      const filePath = path.join(localTargetDir, finalFilename);
      fs.writeFileSync(filePath, finalBuffer);

      const publicUrl = `/uploads/${folder}/${finalFilename}`;
      res.json({ publicUrl, key: `uploads/${folder}/${finalFilename}` });
    }
  } catch (error: any) {
    console.error("[Storage] Critical general upload failure:", error);
    res.status(500).json({ error: error.message || "Internal upload service failure" });
  }
});

// Fallback PUT Endpoint for client local uploading when R2 presign fails
app.put("/api/storage/local-put", express.raw({ type: "*/*", limit: "20mb" }), (req, res) => {
  try {
    const filename = req.query.filename as string;
    const folder = (req.query.folder as string) || "documents";

    if (!filename) {
      return res.status(400).json({ error: "Missing filename query parameter" });
    }

    const localFolder = path.join(UPLOADS_DIR, folder);
    if (!fs.existsSync(localFolder)) {
      fs.mkdirSync(localFolder, { recursive: true });
    }

    const filePath = path.join(localFolder, filename);
    fs.writeFileSync(filePath, req.body);

    console.log(`[Storage] Handled local put upload fallback for ${filename} -> uploads/${folder}`);
    res.json({ success: true, path: `/uploads/${folder}/${filename}` });
  } catch (err: any) {
    console.error("[Storage] Local PUT handler error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Cloudflare R2 Storage Presign Route (standard non-image or legacy uploads fallback)
app.post("/api/storage/presign", async (req, res) => {
  try {
    const { fileName, fileType, folder } = req.body;
    if (!fileName || !fileType || !folder) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sanitizedName = `${Date.now()}-${fileName.replace(/\s+/g, "_").toLowerCase()}`;

    try {
      const client = getS3Client();
      const bucket = process.env.R2_BUCKET_NAME;
      if (!bucket) throw new Error("R2_BUCKET_NAME not defined");

      const key = `${folder}/${sanitizedName}`;
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
      const publicUrlBase = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${bucket}`;
      const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${key}`;

      res.json({ uploadUrl, publicUrl, key });
    } catch (r2Error: any) {
      console.warn("[Storage] Cloud presign failed. Returning local fallback upload routes:", r2Error.message);
      
      // Return local fallback routes that mirror S3's PUT flow perfectly
      const uploadUrl = `/api/storage/local-put?filename=${sanitizedName}&folder=${folder}`;
      const publicUrl = `/uploads/${folder}/${sanitizedName}`;

      res.json({ uploadUrl, publicUrl, key: `uploads/${folder}/${sanitizedName}` });
    }
  } catch (error: any) {
    console.error("[Storage] Critical general presign failure:", error);
    res.status(500).json({ error: error.message || "Internal presign service failure" });
  }
});

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API Route Not Found", path: req.path });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// Kick off boot sequence reachability checks in the background
checkDependencies().catch((err) => {
  console.error("[Boot] Critical dependency verification failed during startup:", err);
});

export default app;

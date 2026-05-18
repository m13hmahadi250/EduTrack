import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
const PORT = Number(process.env.PORT) || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Log configuration status
console.log("Storage Configuration Check:");
console.log("- R2_ENDPOINT:", process.env.R2_ENDPOINT ? process.env.R2_ENDPOINT : "MISSING");
console.log("- R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME ? process.env.R2_BUCKET_NAME : "MISSING");
console.log("- R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID ? "Set" : "MISSING");
console.log("- R2_PUBLIC_URL:", process.env.R2_PUBLIC_URL ? "Set" : "MISSING");

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// Cloudflare R2 Storage Route
app.post("/api/storage/presign", async (req, res) => {
  console.log(`[Storage] Received presign request:`, {
    method: req.method,
    url: req.url,
    body: req.body,
  });

  try {
    const { fileName, fileType, folder } = req.body;
    if (!fileName || !fileType || !folder) {
      console.warn("[Storage] Missing fields in request body");
      return res.status(400).json({ error: "Missing required fields: fileName, fileType, folder" });
    }

    console.log(`[Storage] Presigning: ${folder}/${fileName} (${fileType})`);

    const client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      throw new Error("R2_BUCKET_NAME environment variable is not defined");
    }

    // Generate unique key
    const key = `${folder}/${Date.now()}-${fileName.replace(/\s+/g, "_")}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    
    const publicUrlBase = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${bucket}`;
    const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${key}`;

    console.log(`[Storage] Success: Generated upload URL for ${key}`);
    res.json({ uploadUrl, publicUrl, key });
  } catch (error: any) {
    console.error("[Storage] Presign error:", error);
    res.status(500).json({ 
      error: "Failed to generate pre-signed URL", 
      message: error.message
    });
  }
});

// Ensure other /api/* routes return JSON 404s
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API Route Not Found", path: req.path });
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Only start the server if this file is run directly (not as a module in Vercel)
if (!process.env.VERCEL) {
  setupVite().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
} else {
  // In Vercel, we might need to await Vite if we're doing server-side rendering, 
  // but for SPA mode we just want the routes.
  setupVite();
}

export default app;


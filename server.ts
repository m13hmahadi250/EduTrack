import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { put } from "@vercel/blob";

const app = express();

const PORT = 3000;

// Basic middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Log all API requests for diagnostics
app.use("/api", (req, res, next) => {
  console.log(`[API Request] ${req.method} ${req.url} (Original: ${req.originalUrl})`);
  next();
});

// Vercel Blob Upload Route
app.post("/api/upload", express.raw({ type: "*/*", limit: "16mb" }), async (req, res) => {
  try {
    const filename = req.query.filename as string;
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const contentType = req.headers["content-type"] || "application/octet-stream";
    
    // Check if BLOB_READ_WRITE_TOKEN exists
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({ error: "BLOB_READ_WRITE_TOKEN is not configured" });
    }

    const blob = await put(filename, req.body, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });

    res.json(blob);
  } catch (error: any) {
    console.error("Blob Upload Error:", error);
    
    // Check for common configuration errors
    if (error.message?.includes("Cannot use public access on a private store")) {
      return res.status(403).json({ 
        error: "Store Access Mismatch", 
        message: "Your Vercel Blob store is configured as PRIVATE, but the app is requesting PUBLIC access for file sharing. Please go to Vercel Dashboard > Storage > Blob > Settings and change 'Access Level' to 'Public'."
      });
    }

    if (error.message?.includes("This store does not exist")) {
      const token = process.env.BLOB_READ_WRITE_TOKEN || "";
      const prefix = token.substring(0, 15) + "...";
      return res.status(410).json({
        error: "Blob Store Not Found",
        message: `The Vercel Blob store associated with your token (${prefix}) was not found or has been deleted. Please generate a NEW token in the Vercel Storage dashboard and update your environment variables.`
      });
    }

    res.status(500).json({ error: "Upload failed", message: error.message });
  }
});

// JSON body parser for other routes
app.use(express.json());

app.get("/api/diagnostics", (req, res) => {
  res.json({
    env: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    tokenLength: process.env.BLOB_READ_WRITE_TOKEN ? process.env.BLOB_READ_WRITE_TOKEN.length : 0,
    tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN ? process.env.BLOB_READ_WRITE_TOKEN.substring(0, 15) + "..." : "none",
    appUrl: process.env.APP_URL,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    appUrl: process.env.APP_URL,
    isVercel: !!process.env.VERCEL
  });
});

// Ensure other /api/* routes return JSON 404s
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API Route Not Found", path: req.path });
});

async function setupFrontend() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // In Vercel, this might be handled by rewrites, but safe to keep
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath);
    });
  }

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Server Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: err.message 
    });
  });
}

setupFrontend().then(() => {
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
});

export { app };

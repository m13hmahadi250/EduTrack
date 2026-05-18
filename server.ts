import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./src/lib/uploadRouter";

const app = express();

const PORT = 3000;

// Basic middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-uploadthing-package", "x-uploadthing-version", "x-uploadthing-api-key"]
}));

// Simplified UploadThing Route Handler
app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
    config: {
      isDev: process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test" && !process.env.VERCEL,
      token: process.env.UPLOADTHING_TOKEN,
      callbackUrl: process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}/api/uploadthing` : undefined,
    }
  })
);

// Other middleware
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    hasUploadThingToken: !!process.env.UPLOADTHING_TOKEN,
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

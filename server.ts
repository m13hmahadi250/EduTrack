import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./src/lib/uploadRouter";

const app = express();
export { app }; // Export for Vercel serverless

async function startServer() {
  const PORT = 3000;

  // Basic middleware
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-uploadthing-package", "x-uploadthing-version", "x-uploadthing-api-key"]
  }));

  // Diagnostic log for environment variables
  console.log("UploadThing Configuration Check:");
  console.log("- Token Present:", !!process.env.UPLOADTHING_TOKEN);
  console.log("- App URL:", process.env.APP_URL);
  console.log("- Node Env:", process.env.NODE_ENV);

  // Simplified UploadThing Route Handler
  app.use(
    "/api/uploadthing",
    createRouteHandler({
      router: uploadRouter,
      config: {
        // Explicitly disable dev mode in production to avoid tunnel issues
        isDev: process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test",
        // Pass token explicitly if needed
        token: process.env.UPLOADTHING_TOKEN,
        // Set callback URL if APP_URL is available
        callbackUrl: process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}/api/uploadthing` : undefined,
      }
    })
  );

  // Other middleware (placed after UploadThing to avoid body consumption issues)
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      hasUploadThingToken: !!process.env.UPLOADTHING_TOKEN,
      appUrl: process.env.APP_URL
    });
  });

  // Ensure other /api/* routes return JSON 404s
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API Route Not Found", path: req.path });
  });

  // Vite middleware for development
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

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Server Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: err.message 
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

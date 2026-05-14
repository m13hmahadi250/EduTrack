import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./src/lib/uploadRouter";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic middleware
  app.use(cors());

  // Diagnostic log for environment variables
  console.log("UploadThing Configuration Check:");
  console.log("- Token Present:", !!process.env.UPLOADTHING_TOKEN);
  console.log("- App URL:", process.env.APP_URL);
  console.log("- Node Env:", process.env.NODE_ENV);

  // Add the UploadThing route handler with request logging
  app.use(
    "/api/uploadthing",
    (req, res, next) => {
      console.log(`[UploadThing] ${req.method} ${req.originalUrl}`);
      next();
    },
    createRouteHandler({
      router: uploadRouter,
      config: {
        callbackUrl: process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}/api/uploadthing` : undefined,
        isDev: process.env.NODE_ENV !== "production",
      }
    })
  );

  // Other middleware (placed after UploadThing to avoid body consumption issues)
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
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

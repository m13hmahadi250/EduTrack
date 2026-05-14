import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./src/lib/uploadRouter";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add the UploadThing route handler
  app.use(
    "/api/uploadthing",
    createRouteHandler({
      router: uploadRouter,
    })
  );

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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

import "dotenv/config";
import express from "express";
import path from "path";
import { app } from "./api/app.js";

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // Only serve static files if we are NOT on Vercel
    // Vercel handles static file serving automatically from the 'dist' directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        // Hashed static files (JS, CSS, images) can be cached forever.
        // index.html, config files, and the service worker sw.js should NOT be cached.
        if (filePath.match(/\.(html|json)$/) || filePath.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

const PORT = Number(process.env.PORT) || 3000;

// Start the server if this file is run directly (not as a module in Vercel)
if (!process.env.VERCEL) {
  setupVite().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;


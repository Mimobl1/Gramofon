import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { checkFirestoreHealth } from "./server/firebase.js";
import { 
  getAlbums, 
  updateAlbumMetadata, 
  reorderAlbums, 
  deleteAlbum, 
  clearAllAlbums 
} from "./server/albumService.js";
import { 
  multerUpload, 
  initAlbumUpload, 
  handleTrackChunk, 
  finalizeAlbumUpload, 
  handleSingleAlbumUpload 
} from "./server/uploadService.js";
import { optimizeAllAudio } from "./optimize-audio.js";
import { updateCollection } from "./update-collection.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS Middleware: ensures iframe, preview, and mobile environments have full access
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length, Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  // Request logger for API and write endpoints
  app.use((req, res, next) => {
    if (req.url.startsWith("/api") || req.url.startsWith("/upload") || req.url.startsWith("/albums") || req.method !== "GET") {
      console.log(`[API] ${req.method} ${req.url} (original: ${req.originalUrl})`);
    }
    next();
  });

  // Health and Firebase connection check
  app.get("/api/health", async (req, res) => {
    const isFirebaseHealthy = await checkFirestoreHealth();
    res.json({
      status: "ok",
      firebase: isFirebaseHealthy ? "connected" : "degraded",
      timestamp: new Date().toISOString()
    });
  });

  // Audio Streaming: Enable HTTP 206 Partial Content for instant seeking
  app.use("/Vinyl Collection", (req, res, next) => {
    res.setHeader("Accept-Ranges", "bytes");
    next();
  }, express.static(path.join(process.cwd(), "public", "Vinyl Collection"), {
    acceptRanges: true,
    maxAge: 0
  }), (req, res) => {
    res.status(404).send("Audio file not found");
  });

  // Public asset serving
  app.use(express.static(path.join(process.cwd(), "public"), {
    acceptRanges: true,
    maxAge: 0
  }));

  // GET /api/albums - Fetch all albums
  app.get(["/api/albums", "/albums"], async (req, res) => {
    try {
      const albums = await getAlbums();
      res.json(albums);
    } catch (err: any) {
      console.error("[API] Error fetching albums:", err);
      res.status(500).json({ error: err.message || "Failed to fetch albums" });
    }
  });

  // POST /api/upload-album-init - Step 1: Create album directory & save cover
  app.post(["/api/upload-album-init", "/api/upload/init", "/upload-album-init", "/upload/init"], multerUpload.any(), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const result = await initAlbumUpload(req.body, files);
      res.json(result);
    } catch (err: any) {
      console.error("[API] upload-album-init error:", err);
      res.status(500).json({ error: err.message || "Failed to initialize album upload" });
    }
  });

  // POST /api/upload-album-chunk - Step 2: Upload track or track chunk safely
  app.post(["/api/upload-album-chunk", "/api/upload/chunk", "/upload-album-chunk", "/upload/chunk"], multerUpload.any(), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const chunkFile = (files && files.length > 0 ? files[0] : null) || req.file;
      if (!chunkFile) {
        return res.status(400).json({ error: "No audio file received" });
      }

      const result = await handleTrackChunk(req.body, chunkFile);
      res.json(result);
    } catch (err: any) {
      console.error("[API] upload-album-chunk error:", err);
      res.status(500).json({ error: err.message || "Failed to process audio chunk" });
    }
  });

  // POST /api/upload-album-finalize - Step 3: Finalize album & store in Firestore
  app.post(["/api/upload-album-finalize", "/api/upload/finalize", "/upload-album-finalize", "/upload/finalize"], async (req, res) => {
    try {
      const result = await finalizeAlbumUpload(req.body);
      res.json(result);
    } catch (err: any) {
      console.error("[API] upload-album-finalize error:", err);
      res.status(500).json({ error: err.message || "Failed to finalize album" });
    }
  });

  // POST /api/upload-album - Single multipart upload fallback (aliases: /api/upload, /upload, etc.)
  app.post(["/api/upload-album", "/api/upload", "/upload-album", "/upload", "/api/upload/album", "/upload/album"], multerUpload.any(), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const result = await handleSingleAlbumUpload(req.body, files);
      res.json(result);
    } catch (err: any) {
      console.error("[API] upload-album error:", err);
      res.status(500).json({ error: err.message || "Failed to upload album" });
    }
  });

  // POST /api/update-album - Edit album metadata
  app.post(["/api/update-album", "/update-album"], async (req, res) => {
    try {
      const { folder, id, ...updates } = req.body;
      const target = folder || id;
      if (!target) {
        return res.status(400).json({ error: "folder or id is required" });
      }
      await updateAlbumMetadata(target, updates);
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("[API] update-album error:", err);
      res.status(500).json({ error: err.message || "Failed to update album" });
    }
  });

  // POST /api/reorder-albums - Reorder album collection
  app.post(["/api/reorder-albums", "/reorder-albums"], async (req, res) => {
    try {
      const { order } = req.body;
      if (!Array.isArray(order)) {
        return res.status(400).json({ error: "Order array required" });
      }
      await reorderAlbums(order);
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("[API] reorder-albums error:", err);
      res.status(500).json({ error: err.message || "Failed to reorder albums" });
    }
  });

  // DELETE /api/albums - Delete an album
  app.delete(["/api/albums", "/albums"], async (req, res) => {
    try {
      const { folder, id } = req.body;
      const target = folder || id;
      if (!target) {
        return res.status(400).json({ error: "folder or id required" });
      }
      await deleteAlbum(target);
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("[API] delete album error:", err);
      res.status(500).json({ error: err.message || "Failed to delete album" });
    }
  });

  // POST /api/clear-all-albums - Clear all albums (CMS reset)
  app.post(["/api/clear-all-albums", "/clear-all-albums"], async (req, res) => {
    try {
      await clearAllAlbums();
      res.json({ status: "ok", message: "Archive cleared successfully" });
    } catch (err: any) {
      console.error("[API] clear-all-albums error:", err);
      res.status(500).json({ error: err.message || "Failed to clear archive" });
    }
  });

  // POST /api/optimize-collection - Optimize audio files
  app.post(["/api/optimize-collection", "/optimize-collection"], async (req, res) => {
    try {
      optimizeAllAudio().then(() => updateCollection()).catch(console.error);
      res.json({ status: "ok", message: "Optimization started in background" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 404 handler for any unmatched /api/* or /upload* routes
  app.all(["/api/*", "/api", "/upload/*", "/upload"], (req, res) => {
    console.warn(`[API 404] Unhandled API route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      error: `Ruta nije pronađena na serveru (404): ${req.method} ${req.originalUrl}`,
      method: req.method,
      url: req.originalUrl
    });
  });

  // Global API error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[API] Uncaught error:", err);
    res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  });

  // Vite development middleware vs production static fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("[Server] Fatal bootstrap error:", err);
});

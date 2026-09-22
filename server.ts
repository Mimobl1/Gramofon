import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
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
import { 
  isR2Configured, 
  testR2Connection, 
  getR2ObjectStream,
  getR2Config,
  deleteR2ObjectsByPrefix,
  R2Credentials
} from "./server/r2Service.js";
import {
  getUserR2Settings,
  saveUserR2Settings
} from "./server/firestoreService.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize collection in background without blocking server startup
  getAlbums()
    .then(initialAlbums => {
      console.log(`[Server] Initialized collection: ${initialAlbums.length} albums loaded.`);
    })
    .catch(err => {
      console.warn("[Server] Initial collection scan warning:", err);
    });

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

  // Health check: Filesystem Vinyl Collection storage & R2 status
  app.get("/api/health", async (req, res) => {
    res.json({
      status: "ok",
      storage: isR2Configured() ? "cloudflare-r2" : "filesystem",
      r2Configured: isR2Configured(),
      collectionFolder: "public/Vinyl Collection",
      timestamp: new Date().toISOString()
    });
  });

  // Cloudflare R2 Status Check
  app.get("/api/r2/status", async (req, res) => {
    const conf = getR2Config();
    res.json({
      configured: isR2Configured(),
      bucket: conf.bucketName || null,
      publicUrl: conf.publicUrl || null,
      message: isR2Configured() 
        ? "Cloudflare R2 is configured and active for direct audio streaming."
        : "Cloudflare R2 is not configured. Audio will be stored locally or locally-cached."
    });
  });

  // Cloudflare R2 Connection Test (global or user-specific)
  app.post("/api/r2/test", async (req, res) => {
    try {
      const email = (req.body?.email || req.body?.userEmail || "").toString().trim().toLowerCase();
      let creds: Partial<R2Credentials> | null = null;
      if (email && email !== "demo" && email !== "demo@vinyl.local") {
        const userSettings = await getUserR2Settings(email);
        if (userSettings) {
          creds = {
            accountId: userSettings.accountId,
            accessKeyId: userSettings.accessKeyId,
            secretAccessKey: userSettings.secretAccessKey,
            bucketName: userSettings.bucketName,
            publicUrl: userSettings.publicUrl
          };
        }
      }
      // If direct credentials supplied in body for testing before save
      if (req.body?.accountId && req.body?.accessKeyId && req.body?.secretAccessKey) {
        creds = {
          accountId: req.body.accountId,
          accessKeyId: req.body.accessKeyId,
          secretAccessKey: req.body.secretAccessKey,
          bucketName: req.body.bucketName || "vinyl-archive",
          publicUrl: req.body.publicUrl || ""
        };
      }
      const result = await testR2Connection(creds);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || String(err) });
    }
  });

  // GET /api/user-r2-settings - Fetch user R2 settings
  app.get("/api/user-r2-settings", async (req, res) => {
    try {
      const email = (req.query.email as string || "").trim().toLowerCase();
      if (!email || email === "demo" || email === "demo@vinyl.local") {
        // Return default demo configuration status
        const def = getR2Config();
        return res.json({
          email: "demo",
          accountId: def.accountId,
          accessKeyId: def.accessKeyId ? "••••••••" : "",
          secretAccessKey: def.secretAccessKey ? "••••••••" : "",
          bucketName: def.bucketName,
          publicUrl: def.publicUrl,
          isConfigured: isR2Configured()
        });
      }
      const settings = await getUserR2Settings(email);
      if (!settings) {
        return res.json({
          email,
          isConfigured: false
        });
      }
      return res.json({
        email: settings.email,
        accountId: settings.accountId,
        accessKeyId: settings.accessKeyId,
        secretAccessKey: settings.secretAccessKey,
        bucketName: settings.bucketName,
        publicUrl: settings.publicUrl,
        isConfigured: Boolean(settings.accountId && settings.accessKeyId && settings.secretAccessKey && settings.bucketName)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch user R2 settings" });
    }
  });

  // POST /api/user-r2-settings - Save user R2 settings
  app.post("/api/user-r2-settings", async (req, res) => {
    try {
      const { email, accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email je obavezan." });
      }
      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        return res.status(400).json({ error: "Account ID, Access Key ID, Secret Access Key i Bucket Name su obavezni." });
      }
      await saveUserR2Settings({
        email: email.trim().toLowerCase(),
        accountId: accountId.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        bucketName: bucketName.trim(),
        publicUrl: (publicUrl || "").trim()
      });
      res.json({ status: "ok", message: "Cloudflare R2 podešavanja su uspešno sačuvana!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Greška pri čuvanju R2 podešavanja." });
    }
  });

  // Audio Streaming Proxy for Cloudflare R2 and local storage (supports HTTP 206 Partial Content & CORS)
  app.get(["/api/r2-stream/:key(*)", "/api/stream/:key(*)"], async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Origin, Content-Type, Accept");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length, Content-Type");

    try {
      const key = req.params.key;
      if (!key) {
        return res.status(400).send("Key required");
      }
      const cleanKey = key.replace(/^\/+/, "");
      const range = req.headers.range;

      // 1. Try streaming from Cloudflare R2
      try {
        const { stream, contentType, contentLength, contentRange, statusCode } = await getR2ObjectStream(cleanKey, range);
        
        res.status(statusCode);
        res.setHeader("Content-Type", contentType);
        res.setHeader("Accept-Ranges", "bytes");
        if (contentLength) res.setHeader("Content-Length", contentLength);
        if (contentRange) res.setHeader("Content-Range", contentRange);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

        stream.pipe(res);
        return;
      } catch (r2Err: any) {
        // 2. Fallback: check if file exists on local disk in public/
        const localPath = path.join(process.cwd(), "public", cleanKey);
        if (fs.existsSync(localPath)) {
          return res.sendFile(localPath, {
            acceptRanges: true,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=3600"
            }
          });
        }
        console.warn(`[Audio Stream] File "${cleanKey}" not found in R2 or local disk:`, r2Err?.message);
        res.status(r2Err?.$metadata?.httpStatusCode || 404).send("Audio file not found in R2 or local disk");
      }
    } catch (err: any) {
      console.error("[Audio Stream] Error streaming object:", err?.message);
      res.status(500).send("Audio streaming error");
    }
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
      const { folder, id, userEmail } = req.body;
      const target = folder || id;
      if (!target) {
        return res.status(400).json({ error: "folder or id required" });
      }
      await deleteAlbum(target);

      // Clean R2 objects if custom or user R2 bucket
      const userSettings = userEmail ? await getUserR2Settings(userEmail) : null;
      const folderBase = path.basename(target);
      await deleteR2ObjectsByPrefix(`Vinyl Collection/${folderBase}`, userSettings);

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
      server: { middlewareMode: true, hmr: false },
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

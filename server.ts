import express from "express";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import multer from "multer";
import { execFile } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  query 
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import { updateCollection } from "./update-collection.js";

const execFileAsync = promisify(execFile);

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const tmpDir = path.join(process.cwd(), "tmp_uploads");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 300 * 1024 * 1024 } // 300MB max per file
});

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ]);
    const d = parseFloat(stdout.trim());
    return isNaN(d) || d <= 0 ? 240 : d;
  } catch (e) {
    return 240; // default 4 mins
  }
}

async function compressAudioToTargetRange(
  inputPath: string, 
  outputPath: string
): Promise<{ originalSize: number; newSize: number; bitrate: number }> {
  const stat = await fsPromises.stat(inputPath);
  const originalSize = stat.size;

  // If already an MP3 and size is between 4.8MB and 9.5MB, reuse directly
  if (
    inputPath.toLowerCase().endsWith(".mp3") &&
    originalSize >= 4.8 * 1024 * 1024 &&
    originalSize <= 9.5 * 1024 * 1024
  ) {
    await fsPromises.copyFile(inputPath, outputPath);
    return { originalSize, newSize: originalSize, bitrate: 0 };
  }

  const duration = await getAudioDuration(inputPath);

  // Target size ~6.8 MB (in bits: 6.8 * 1024 * 1024 * 8)
  const targetKbps = Math.round((6.8 * 1024 * 1024 * 8) / (duration * 1000));

  let chosenBitrate = 192;
  if (targetKbps >= 288) chosenBitrate = 320;
  else if (targetKbps >= 240) chosenBitrate = 256;
  else if (targetKbps >= 208) chosenBitrate = 224;
  else if (targetKbps >= 176) chosenBitrate = 192;
  else if (targetKbps >= 144) chosenBitrate = 160;
  else chosenBitrate = 128;

  await execFileAsync("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-vn",
    "-ar", "44100",
    "-ac", "2",
    "-b:a", `${chosenBitrate}k`,
    outputPath
  ]);

  const newStat = await fsPromises.stat(outputPath);
  return {
    originalSize,
    newSize: newStat.size,
    bitrate: chosenBitrate
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", firebase: "connected" });
  });

  app.get("/api/albums", async (req, res) => {
    try {
      const colRef = collection(db, "albums");
      const snap = await getDocs(query(colRef, orderBy("order", "asc")));
      if (!snap.empty) {
        const albums = snap.docs.map(d => ({
          ...d.data(),
          _uid: d.data().folder || d.id
        }));
        return res.json(albums);
      }
      
      // If Firestore is empty, seed from local manifest
      const manifestPath = path.join(process.cwd(), "public", "vinyl-collection.json");
      if (fs.existsSync(manifestPath)) {
        const raw = await fsPromises.readFile(manifestPath, "utf-8");
        const parsed = JSON.parse(raw);
        for (let i = 0; i < parsed.length; i++) {
          const a = parsed[i];
          const id = (a.folder || a.name).replace(/[^a-zA-Z0-9_-]/g, "_");
          await setDoc(doc(db, "albums", id), {
            id,
            name: a.name,
            author: a.author,
            color: a.color || "#1a1a1a",
            folder: a.folder,
            cover: a.cover || "",
            tracks: a.tracks || [],
            genre: a.genre || "",
            year: a.year || "",
            order: i,
            createdAt: new Date().toISOString()
          }).catch(() => {});
        }
        return res.json(parsed);
      }

      const collectionList = await updateCollection();
      res.json(collectionList);
    } catch (err: any) {
      console.warn("Firestore read failed, falling back to local file:", err.message);
      try {
        const manifestPath = path.join(process.cwd(), "public", "vinyl-collection.json");
        const data = await fsPromises.readFile(manifestPath, "utf-8");
        return res.json(JSON.parse(data));
      } catch (_) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.post("/api/upload-album", upload.any(), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      let albumName = (req.body.albumName || "").toString().trim();
      let artistName = (req.body.artistName || "").toString().trim();

      // If not specified, deduce from folder or first file
      if (!albumName) {
        const firstRelative = files[0].originalname || "";
        if (firstRelative.includes("/")) {
          const parts = firstRelative.split("/")[0];
          if (parts.includes(" - ")) {
            const spl = parts.split(" - ");
            artistName = spl[0].trim();
            albumName = spl.slice(1).join(" - ").trim();
          } else {
            albumName = parts.trim();
          }
        }
      }

      if (!albumName) albumName = "NEW ALBUM";
      if (!artistName) artistName = "UPLOADED ARTIST";

      albumName = albumName.toUpperCase();
      artistName = artistName.toUpperCase();

      const folderName = `${artistName} - ${albumName}`;
      const targetDir = path.join(process.cwd(), "public", "Vinyl Collection", folderName);

      await fsPromises.mkdir(targetDir, { recursive: true });

      const audioFiles = files.filter(f =>
        f.mimetype.startsWith("audio/") ||
        /\.(mp3|wav|flac|m4a|ogg|aiff|aac)$/i.test(f.originalname)
      );
      const coverFile = files.find(f =>
        f.mimetype.startsWith("image/") ||
        /\.(jpg|jpeg|png|webp)$/i.test(f.originalname)
      );

      if (audioFiles.length === 0) {
        return res.status(400).json({ error: "No valid audio files found" });
      }

      let coverPath = "";
      if (coverFile) {
        const coverExt = path.extname(coverFile.originalname) || ".jpg";
        const targetCover = path.join(targetDir, `folder${coverExt}`);
        await fsPromises.copyFile(coverFile.path, targetCover);
        coverPath = `Vinyl Collection/${folderName}/folder${coverExt}`;
      }

      const trackNames: string[] = [];
      const compressionResults: any[] = [];

      // Sort audio files by original filename
      audioFiles.sort((a, b) => a.originalname.localeCompare(b.originalname));

      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        let baseName = path.parse(file.originalname).name;
        baseName = baseName.replace(/[<>:"/\\|?*]/g, "_");
        const outFileName = `${baseName}.mp3`;
        const finalOutPath = path.join(targetDir, outFileName);

        const result = await compressAudioToTargetRange(file.path, finalOutPath);
        trackNames.push(outFileName);
        compressionResults.push({
          file: outFileName,
          originalMB: (result.originalSize / (1024 * 1024)).toFixed(1),
          newMB: (result.newSize / (1024 * 1024)).toFixed(1),
          bitrate: result.bitrate
        });
      }

      // Cleanup multer temp files
      for (const f of files) {
        try { await fsPromises.unlink(f.path); } catch (_) {}
      }

      // Rebuild local manifests for fallback
      await updateCollection().catch(() => {});

      const albumDocId = `Vinyl_Collection_${folderName}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      const firestoreAlbum = {
        id: albumDocId,
        name: albumName,
        author: artistName,
        folder: `Vinyl Collection/${folderName}`,
        cover: coverPath,
        tracks: trackNames,
        color: "#1a1a1a",
        genre: req.body.genre || "",
        year: req.body.year || "",
        order: Date.now(),
        createdAt: new Date().toISOString()
      };

      // Save to Firebase Firestore
      try {
        await setDoc(doc(db, "albums", albumDocId), firestoreAlbum);
      } catch (fErr) {
        console.error("Failed to write new album to Firestore:", fErr);
      }

      res.json({
        status: "ok",
        album: firestoreAlbum,
        compressionResults
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/update-album", async (req, res) => {
    try {
      const { folder, name, author, genre, year, color } = req.body;
      if (!folder) return res.status(400).json({ error: "Folder is required" });
      const albumDocId = folder.replace(/[^a-zA-Z0-9_-]/g, "_");

      const updateData: any = {};
      if (name) updateData.name = name;
      if (author) updateData.author = author;
      if (genre !== undefined) updateData.genre = genre;
      if (year !== undefined) updateData.year = year;
      if (color) updateData.color = color;

      const albumRef = doc(db, "albums", albumDocId);
      await setDoc(albumRef, updateData, { merge: true });
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Update album error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/reorder-albums", async (req, res) => {
    try {
      const { order } = req.body;
      if (!Array.isArray(order)) return res.status(400).json({ error: "Order array required" });
      for (let i = 0; i < order.length; i++) {
        const folderKey = order[i];
        const albumDocId = folderKey.replace(/[^a-zA-Z0-9_-]/g, "_");
        await setDoc(doc(db, "albums", albumDocId), { order: i }, { merge: true }).catch(() => {});
      }
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Reorder albums error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/albums", async (req, res) => {
    try {
      const { folder } = req.body;
      if (!folder) return res.status(400).json({ error: "Folder required" });
      
      const safeFolder = path.basename(folder);
      const targetDir = path.join(process.cwd(), "public", "Vinyl Collection", safeFolder);
      if (fs.existsSync(targetDir)) {
        await fsPromises.rm(targetDir, { recursive: true, force: true });
        await updateCollection().catch(() => {});
      }

      // Delete from Firestore
      const albumDocId = folder.replace(/[^a-zA-Z0-9_-]/g, "_");
      await deleteDoc(doc(db, "albums", albumDocId)).catch(() => {});

      res.json({ status: "ok" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

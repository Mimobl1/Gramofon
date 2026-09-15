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
import { compressAudioFile, optimizeAllAudio } from "./optimize-audio.js";

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

async function syncDiskAndFirestore() {
  try {
    const colRef = collection(db, "albums");
    const snap = await getDocs(colRef);
    const existingFolders = new Set<string>();
    const existingIds = new Set<string>();
    let lowestOrder = 0;

    snap.forEach(d => {
      const data = d.data();
      if (data.folder) existingFolders.add(data.folder);
      if (data.id) existingIds.add(data.id);
      existingIds.add(d.id);
      const ord = data.order;
      if (typeof ord === "number" && ord < lowestOrder) lowestOrder = ord;
    });

    const collectionDir = path.join(process.cwd(), "public", "Vinyl Collection");
    if (!fs.existsSync(collectionDir)) return;
    const folders = await fsPromises.readdir(collectionDir);

    for (const f of folders) {
      if (f.startsWith(".")) continue;
      const folderPath = path.join(collectionDir, f);
      const stat = await fsPromises.stat(folderPath).catch(() => null);
      if (!stat || !stat.isDirectory()) continue;

      const fullFolderKey = `Vinyl Collection/${f}`;
      const docId = `Vinyl_Collection_${f}`.replace(/[^a-zA-Z0-9_-]/g, "_");

      if (existingFolders.has(fullFolderKey) || existingIds.has(docId)) {
        continue;
      }

      // Check if folder has audio files
      const items = await fsPromises.readdir(folderPath).catch(() => []);
      const audioFiles = items.filter(x => x.match(/\.(mp3|wav|flac|m4a|ogg|aac)$/i)).sort();
      const imageFile = items.find(x => x.match(/\.(jpg|jpeg|png|webp)$/i)) || "";

      let artist = "UNKNOWN ARTIST";
      let name = f;
      if (f.includes(" - ")) {
        const parts = f.split(" - ");
        artist = parts[0].trim();
        name = parts.slice(1).join(" - ").trim();
      }

      lowestOrder -= 1;
      const newAlbum = {
        id: docId,
        name: name.toUpperCase(),
        author: artist.toUpperCase(),
        folder: fullFolderKey,
        cover: imageFile ? `${fullFolderKey}/${imageFile}` : "",
        tracks: audioFiles,
        color: "#2a333a",
        genre: "",
        year: "",
        order: lowestOrder,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "albums", docId), newAlbum);
      console.log(`[Auto-Sync] Registered folder "${f}" into Firestore with id "${docId}" (${audioFiles.length} tracks)`);
      existingFolders.add(fullFolderKey);
      existingIds.add(docId);
    }
  } catch (err) {
    console.warn("[Auto-Sync] Disk and Firestore sync error:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", firebase: "connected" });
  });

  // Explicit static file serving with HTTP 206 Byte-Range support for smooth audio streaming and seeking
  app.use("/Vinyl Collection", (req, res, next) => {
    res.setHeader("Accept-Ranges", "bytes");
    next();
  }, express.static(path.join(process.cwd(), "public", "Vinyl Collection"), {
    acceptRanges: true,
    maxAge: 0
  }));

  app.use(express.static(path.join(process.cwd(), "public"), {
    acceptRanges: true,
    maxAge: 0
  }));

  app.get("/api/albums", async (req, res) => {
    try {
      await syncDiskAndFirestore().catch(() => {});

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
      const trackPaths: string[] = [];

      // Sort audio files by original filename
      audioFiles.sort((a, b) => a.originalname.localeCompare(b.originalname));

      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        let baseName = path.parse(file.originalname).name;
        baseName = baseName.replace(/[<>:"/\\|?*]/g, "_");
        const outFileName = `${baseName}.mp3`;
        const finalOutPath = path.join(targetDir, outFileName);

        // Copy original file to final path immediately
        await fsPromises.copyFile(file.path, finalOutPath);
        trackNames.push(outFileName);
        trackPaths.push(finalOutPath);
      }

      // Cleanup multer temp files
      for (const f of files) {
        try { await fsPromises.unlink(f.path); } catch (_) {}
      }

      // Find lowest order in Firestore so the new album is prepended to the front (order: minOrder - 1)
      let minOrder = 0;
      try {
        const colRef = collection(db, "albums");
        const snap = await getDocs(colRef);
        snap.forEach(d => {
          const ord = d.data().order;
          if (typeof ord === "number" && ord < minOrder) minOrder = ord;
        });
      } catch (_) {}
      const newOrder = minOrder - 1;

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
        order: newOrder,
        createdAt: new Date().toISOString()
      };

      // Save to Firebase Firestore immediately
      try {
        await setDoc(doc(db, "albums", albumDocId), firestoreAlbum);
        console.log(`Successfully saved new album "${albumName}" to Firestore with id ${albumDocId} (order: ${newOrder})`);
      } catch (fErr) {
        console.error("Failed to write new album to Firestore:", fErr);
      }

      // Rebuild local manifests for fallback
      await updateCollection().catch(() => {});

      // Respond immediately to the client so upload completes in seconds and never times out!
      res.json({
        status: "ok",
        album: firestoreAlbum
      });

      // Run 5-9MB audio compression in the background asynchronously
      (async () => {
        console.log(`Starting background compression for ${trackPaths.length} tracks in album "${albumName}"...`);
        for (const outPath of trackPaths) {
          try {
            const res = await compressAudioFile(outPath);
            console.log(`Compressed ${path.basename(outPath)}:`, res.bitrate ? `${res.bitrate}kbps` : "done");
          } catch (e) {
            console.warn(`Compression warning on ${outPath}:`, e);
          }
        }
        await updateCollection().catch(() => {});
        console.log(`Background compression complete for album "${albumName}".`);
      })();
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
      const { folder, id } = req.body;
      const target = folder || id;
      if (!target) return res.status(400).json({ error: "Folder or id required" });
      
      const safeFolder = path.basename(target);
      const targetDir = path.join(process.cwd(), "public", "Vinyl Collection", safeFolder);
      if (fs.existsSync(targetDir)) {
        await fsPromises.rm(targetDir, { recursive: true, force: true });
        await updateCollection().catch(() => {});
      }

      // Delete from Firestore by document ID and matching folder query
      const primaryDocId = target.replace(/[^a-zA-Z0-9_-]/g, "_");
      const altDocId = `Vinyl_Collection_${safeFolder}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      await deleteDoc(doc(db, "albums", primaryDocId)).catch(() => {});
      await deleteDoc(doc(db, "albums", altDocId)).catch(() => {});

      const colRef = collection(db, "albums");
      const snap = await getDocs(colRef);
      for (const d of snap.docs) {
        const data = d.data();
        if (d.id === target || data.folder === target || data.folder === `Vinyl Collection/${safeFolder}`) {
          await deleteDoc(doc(db, "albums", d.id)).catch(() => {});
          console.log(`[Firestore] Deleted album document: ${d.id}`);
        }
      }

      res.json({ status: "ok" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/optimize-collection", async (req, res) => {
    try {
      // Run optimization in background and report status
      optimizeAllAudio().then(async () => {
        await updateCollection().catch(() => {});
      }).catch(console.error);

      res.json({ status: "ok", message: "Optimization started in background" });
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

import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        storageBucket: "tonal-benefit-309615.firebasestorage.app"
    });
}
const db = getFirestore();
const bucket = getStorage().bucket();

const app = express();

  

  app.use(express.json());

  const getBearer = (req: any) => {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith("Bearer ")) return auth.substring(7);
      return null;
  };

  // Middleware to verify Firebase Auth Token
  const requireAuth = async (req: any, res: any, next: any) => {
      const token = getBearer(req);
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      try {
          const decodedToken = await getAuth().verifyIdToken(token);
          req.user = decodedToken;
          next();
      } catch (error) {
          console.error("Auth error", error);
          res.status(401).json({ error: "Unauthorized" });
      }
  };

  // Proxy to fetch from Firebase Storage securely with Range support
  app.get("/api/firebase-proxy", async (req: any, res: any) => {
      const filePath = req.query.path as string;
      const token = req.query.token as string;
      if (!filePath || !token) return res.status(400).send("Missing path or token");
      
      try {
          const decodedToken = await getAuth().verifyIdToken(token);
          // Verify that the file belongs to the user
          if (!filePath.startsWith(`users/${decodedToken.uid}/`)) {
              return res.status(403).send("Forbidden");
          }

          const file = bucket.file(filePath);
          const [exists] = await file.exists();
          if (!exists) return res.status(404).send("File not found");

          const [metadata] = await file.getMetadata();
          
          const range = req.headers.range;
          if (range) {
              const parts = range.replace(/bytes=/, "").split("-");
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : metadata.size - 1;
              const chunksize = (end - start) + 1;

              res.writeHead(206, {
                  'Content-Range': `bytes ${start}-${end}/${metadata.size}`,
                  'Accept-Ranges': 'bytes',
                  'Content-Length': chunksize,
                  'Content-Type': metadata.contentType || 'application/octet-stream',
              });
              
              file.createReadStream({ start, end }).pipe(res);
          } else {
              res.writeHead(200, {
                  'Content-Length': metadata.size,
                  'Content-Type': metadata.contentType || 'application/octet-stream',
              });
              file.createReadStream().pipe(res);
          }
      } catch (e: any) {
          console.error("Firebase proxy error:", e.message);
          res.status(500).send("Proxy error");
      }
  });

  app.get("/api/collection", async (req: any, res: any) => {
      const token = getBearer(req);
      if (token) {
          try {
              const decodedToken = await getAuth().verifyIdToken(token);
              const snapshot = await db.collection('users').doc(decodedToken.uid).collection('albums').get();
              
              const collection = snapshot.docs.map(doc => {
                  const data = doc.data();
                  // Inject token into proxy URLs
                  if (data.cover && data.cover.includes('/api/firebase-proxy')) {
                      data.cover = data.cover + '&token=' + token;
                  }
                  if (data.tracks && Array.isArray(data.tracks)) {
                      data.tracks = data.tracks.map((t: any) => {
                          if (typeof t === 'object' && t.url && t.url.includes('/api/firebase-proxy')) {
                              return { ...t, url: t.url + '&token=' + token };
                          }
                          return t;
                      });
                  }
                  return data;
              });
              
              return res.json(collection);
          } catch (e) {
              console.error("Firestore collection error:", e);
              return res.status(500).json({ error: "Failed to fetch from Firestore" });
          }
      }

      // Local fallback
      const manifestPath = path.join(process.cwd(), 'public', 'vinyl-collection.json');
      if (fs.existsSync(manifestPath)) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Surrogate-Control', 'no-store');
          res.sendFile(manifestPath);
      } else {
          res.json([]);
      }
  });

  const upload = multer({ dest: '/tmp' });

  app.post("/api/upload-album", requireAuth, upload.any(), async (req: any, res: any) => {
      const token = getBearer(req);
      
      try {
          const { name, author, color, genre, existingFolder } = req.body;
          const albumNameStr = String(name || "Unknown Album").trim();
          const albumAuthorStr = String(author || "Unknown Artist").trim();
          
          let folderName = `${albumAuthorStr} - ${albumNameStr}`.replace(/[\\/:*?"<>|]/g, '');
          let relativeFolder = `Vinyl Collection/${folderName}`;
          
          if (token) {
              // FIREBASE UPLOAD LOGIC
              const decodedToken = await getAuth().verifyIdToken(token);
              const uid = decodedToken.uid;
              
              let albumDocRef;
              if (existingFolder && existingFolder !== 'null') {
                  const snapshot = await db.collection('users').doc(uid).collection('albums').where('folder', '==', existingFolder).limit(1).get();
                  if (!snapshot.empty) albumDocRef = snapshot.docs[0].ref;
              }
              if (!albumDocRef) {
                  const snapshot = await db.collection('users').doc(uid).collection('albums')
                      .where('name', '==', albumNameStr.toUpperCase())
                      .where('author', '==', albumAuthorStr.toUpperCase())
                      .limit(1).get();
                  if (!snapshot.empty) albumDocRef = snapshot.docs[0].ref;
              }
              
              let existingData: any = null;
              if (albumDocRef) {
                  existingData = (await albumDocRef.get()).data();
                  relativeFolder = existingData.folder;
              } else {
                  albumDocRef = db.collection('users').doc(uid).collection('albums').doc();
              }
              
              let coverUrl = existingData ? existingData.cover : "";
              const tracks = existingData ? [...(existingData.tracks || [])] : [];
              
              for (const file of (req.files || [])) {
                  const originalName = file.originalname;
                  const mimeType = file.mimetype;
                  const gcsPath = `users/${uid}/${relativeFolder}/${originalName}`;
                  
                  await bucket.upload(file.path, {
                      destination: gcsPath,
                      metadata: { contentType: mimeType }
                  });
                  fs.unlinkSync(file.path);
                  
                  const proxyUrl = `/api/firebase-proxy?path=${encodeURIComponent(gcsPath)}`;
                  
                  if (file.fieldname === 'coverFile' || originalName.match(/\.(jpg|jpeg|png)$/i)) {
                      coverUrl = proxyUrl;
                  } else if (file.fieldname === 'audioFiles' || originalName.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) {
                      const trackObj = { name: originalName, url: proxyUrl };
                      const existingIdx = tracks.findIndex(t => t.name === originalName || t === originalName);
                      if (existingIdx !== -1) {
                          tracks[existingIdx] = trackObj;
                      } else {
                          tracks.push(trackObj);
                      }
                  }
              }
              
              if (req.body.clearCover === 'true') {
                  coverUrl = "";
              }
              
              const newAlbum = {
                  id: albumDocRef.id,
                  name: albumNameStr.toUpperCase(),
                  author: albumAuthorStr.toUpperCase(),
                  color: color || (existingData ? existingData.color : "#2a2a2f"),
                  duration: "",
                  folder: relativeFolder,
                  cover: coverUrl,
                  genre: genre || (existingData ? existingData.genre : "OTHER"),
                  tracks: tracks,
                  updatedAt: FieldValue.serverTimestamp()
              };
              
              await albumDocRef.set(newAlbum, { merge: true });
              return res.json({ success: true, album: newAlbum });
          }

          // LOCAL UPLOAD LOGIC
          const manifestPath = path.join(process.cwd(), 'public', 'vinyl-collection.json');
          let collection: any[] = [];
          if (fs.existsSync(manifestPath)) {
              try { collection = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch(e) {}
          }

          let existingIdx = -1;
          let existingAlbum = null;
          if (existingFolder && existingFolder !== 'null') {
              existingIdx = collection.findIndex(a => a.folder === existingFolder);
          } else {
              existingIdx = collection.findIndex(a => a.name === albumNameStr.toUpperCase() && a.author === albumAuthorStr.toUpperCase());
          }
          if (existingIdx !== -1) {
              existingAlbum = collection[existingIdx];
              relativeFolder = existingAlbum.folder;
          }

          const targetDir = path.join(process.cwd(), 'public', relativeFolder);
          if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
          }

          let coverUrl = existingAlbum ? existingAlbum.cover : "";
          const tracks = existingAlbum ? [...(existingAlbum.tracks || [])] : [];

          for (const file of (req.files || [])) {
            const originalName = file.originalname;
            const targetPath = path.join(targetDir, originalName);
            fs.renameSync(file.path, targetPath);
            
            if (file.fieldname === 'coverFile' || originalName.match(/\.(jpg|jpeg|png)$/i)) {
                coverUrl = `${relativeFolder}/${originalName}`;
            } else if (file.fieldname === 'audioFiles' || originalName.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) {
                if (!tracks.includes(originalName) && !tracks.some(t => t.name === originalName)) {
                    tracks.push(originalName);
                }
            }
          }
           
          if (req.body.clearCover === 'true') {
              coverUrl = "";
          }
           
          tracks.sort((a,b) => {
              let aName = typeof a === 'string' ? a : a.name;
              let bName = typeof b === 'string' ? b : b.name;
              return aName.localeCompare(bName);
          });

          const newAlbum = {
              name: albumNameStr.toUpperCase(),
              author: albumAuthorStr.toUpperCase(),
              color: color || (existingAlbum ? existingAlbum.color : "#2a2a2f"),
              duration: "",
              folder: relativeFolder,
              cover: coverUrl,
              genre: genre || (existingAlbum ? existingAlbum.genre : "OTHER"),
              tracks: tracks
          };
           
          if (existingIdx !== -1) {
              collection[existingIdx] = newAlbum;
          } else {
              collection.unshift(newAlbum);
          }
           
          fs.writeFileSync(manifestPath, JSON.stringify(collection, null, 2), 'utf8');
          res.json({ success: true, album: newAlbum });
      } catch(err) {
          console.error(err);
          res.status(500).json({ success: false, error: String(err) });
      }
  });

  app.post("/api/delete-album", requireAuth, async (req: any, res: any) => {
      try {
          const { folder } = req.body;
          const token = getBearer(req);
          
          if (token) {
              const decodedToken = await getAuth().verifyIdToken(token);
              const uid = decodedToken.uid;
              
              const snapshot = await db.collection('users').doc(uid).collection('albums').where('folder', '==', folder).limit(1).get();
              if (!snapshot.empty) {
                  const doc = snapshot.docs[0];
                  const album = doc.data();
                  
                  // Delete files in Storage
                  try {
                      await bucket.deleteFiles({ prefix: `users/${uid}/${folder}/` });
                  } catch(e) {
                      console.error("Failed to delete storage files", e);
                  }
                  
                  // Delete Firestore doc
                  await doc.ref.delete();
              }
              return res.json({ success: true });
          }

          const manifestPath = path.join(process.cwd(), 'public', 'vinyl-collection.json');
          if (fs.existsSync(manifestPath)) {
              let collection = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              collection = collection.filter(a => a.folder !== folder);
              fs.writeFileSync(manifestPath, JSON.stringify(collection, null, 2), 'utf8');
          }
          res.json({ success: true });
      } catch(err) {
          console.error("Delete error:", err);
          res.status(500).json({ success: false });
      }
  });

  


export default app;

if (!process.env.VERCEL) {
  async function startViteServer() {
      const PORT = 3000;
      if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  }
  startViteServer();
}


import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import fs from "fs";
import path from "path";

let dbInstance: any = null;

function getDb() {
  if (dbInstance) return dbInstance;
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    let config = {
      projectId: "tonal-benefit-309615",
      apiKey: "AIzaSyA8gT_eynvTSa0ep28Eldw3nm_4GWDxQzY",
      authDomain: "tonal-benefit-309615.firebaseapp.com",
      firestoreDatabaseId: "ai-studio-vinylplayer-41dff54a-1e17-46b0-a919-76d4e69fdca8"
    };
    if (fs.existsSync(configPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        config = { ...config, ...raw };
      } catch (_) {}
    }

    const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
    dbInstance = getFirestore(app, config.firestoreDatabaseId || "(default)");
    console.log("[Server Firestore] Connected to database:", config.firestoreDatabaseId);
    return dbInstance;
  } catch (err) {
    console.warn("[Server Firestore] Init warning:", err);
    return null;
  }
}

export function getCleanDocId(idOrFolder: string): string {
  return (idOrFolder || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function syncAlbumToFirestore(album: any): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const docId = getCleanDocId(album.id || album.folder);
    if (!docId) return;

    const payload: any = {
      id: docId,
      name: album.name || "",
      author: album.author || "",
      folder: album.folder || "",
      color: album.color || "#1a1a1a",
      genre: album.genre || "",
      year: album.year || "",
      order: typeof album.order === "number" ? album.order : 0,
      tracks: Array.isArray(album.tracks) ? album.tracks : [],
      updatedAt: new Date().toISOString()
    };

    if (album.cover) payload.cover = album.cover;
    if (album.useCustomCover !== undefined) payload.useCustomCover = !!album.useCustomCover;
    if (album.customCover && album.customCover.length < 850000) {
      payload.customCover = album.customCover;
    }

    await setDoc(doc(db, "albums", docId), payload, { merge: true });
    console.log(`[Server Firestore] Album synced to cloud: ${docId} (color: ${payload.color})`);
  } catch (err: any) {
    console.warn("[Server Firestore] Failed to sync album:", err?.message || err);
  }
}

export async function deleteAlbumFromFirestore(target: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const docId = getCleanDocId(target);
    if (!docId) return;

    await deleteDoc(doc(db, "albums", docId)).catch(() => {});
    await setDoc(doc(db, "deleted_albums", docId), {
      id: docId,
      folder: target,
      deletedAt: new Date().toISOString()
    }).catch(() => {});
    console.log(`[Server Firestore] Marked album as deleted in cloud: ${docId}`);
  } catch (err: any) {
    console.warn("[Server Firestore] Failed to delete album:", err?.message || err);
  }
}

export async function syncAllAlbumsToFirestore(albums: any[]): Promise<void> {
  const db = getDb();
  if (!db || !Array.isArray(albums)) return;
  for (const album of albums) {
    await syncAlbumToFirestore(album).catch(() => {});
  }
}

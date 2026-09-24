import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
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

export interface UserR2Settings {
  email: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
  updatedAt?: string;
}

export function cleanEmailDocId(email: string): string {
  return (email || "").toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function getUserR2Settings(email: string): Promise<UserR2Settings | null> {
  const db = getDb();
  if (!db || !email) return null;
  try {
    const docId = cleanEmailDocId(email);
    const snap = await getDoc(doc(db, "users_r2", docId));
    if (snap.exists()) {
      return snap.data() as UserR2Settings;
    }
  } catch (err: any) {
    console.warn("[Server Firestore] Error fetching user R2 settings:", err?.message || err);
  }
  return null;
}

export async function saveUserR2Settings(settings: UserR2Settings): Promise<void> {
  const db = getDb();
  if (!db || !settings.email) return;
  try {
    const docId = cleanEmailDocId(settings.email);
    await setDoc(doc(db, "users_r2", docId), {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`[Server Firestore] Saved R2 settings for user ${settings.email}`);
  } catch (err: any) {
    console.warn("[Server Firestore] Error saving user R2 settings:", err?.message || err);
    throw err;
  }
}

export function getCleanDocId(idOrFolder: string): string {
  return (idOrFolder || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function clearDeletedAlbumFromFirestore(target: string): Promise<void> {
  const db = getDb();
  if (!db || !target) return;
  try {
    const docId = getCleanDocId(target);
    if (docId) {
      await deleteDoc(doc(db, "deleted_albums", docId)).catch(() => {});
    }
  } catch (_) {}
}

export async function syncAlbumToFirestore(album: any): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const docId = getCleanDocId(album.id || album.folder);
    if (!docId) return;

    // Ensure tombstone in deleted_albums is removed since album is active
    await deleteDoc(doc(db, "deleted_albums", docId)).catch(() => {});

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
      cover: album.cover || "",
      customCover: (album.customCover && album.customCover.length < 850000) ? album.customCover : "",
      useCustomCover: album.useCustomCover !== undefined ? !!album.useCustomCover : false,
      createdAt: album.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Set with timeout to avoid blocking server responses if Firestore connection is slow
    const savePromise = setDoc(doc(db, "albums", docId), payload, { merge: true });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore sync timeout")), 4000));
    await Promise.race([savePromise, timeoutPromise]);
    console.log(`[Server Firestore] Album synced to cloud: ${docId} (color: ${payload.color})`);
  } catch (err: any) {
    console.warn("[Server Firestore] Failed to sync album:", err?.message || err);
  }
}

export async function clearAllAlbumsFromFirestore(): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, "albums"));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, "albums", d.id)).catch(() => {});
    }
    const delSnap = await getDocs(collection(db, "deleted_albums"));
    for (const d of delSnap.docs) {
      await deleteDoc(doc(db, "deleted_albums", d.id)).catch(() => {});
    }
    console.log("[Server Firestore] Cleared all documents from Firestore collections albums & deleted_albums");
  } catch (err: any) {
    console.warn("[Server Firestore] Error clearing Firestore albums:", err?.message || err);
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

export async function getAlbumsFromFirestore(): Promise<any[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const fetchPromise = getDocs(collection(db, "albums"));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore fetch timeout")), 3500)
    );
    const snap = await Promise.race([fetchPromise, timeoutPromise]);
    const list: any[] = [];
    snap.forEach((d: any) => {
      list.push({ id: d.id, ...d.data() });
    });
    list.sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : 9999;
      const orderB = typeof b.order === "number" ? b.order : 9999;
      if (orderA !== orderB) return orderA - orderB;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
      return timeB - timeA;
    });
    return list;
  } catch (err: any) {
    console.warn("[Server Firestore] Error fetching albums:", err?.message || err);
    return [];
  }
}

import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  query 
} from "firebase/firestore";
import { db, withTimeout } from "./firebase.js";
import { updateCollection } from "../update-collection.js";

export interface AlbumRecord {
  id: string;
  name: string;
  author: string;
  folder: string;
  cover?: string;
  customCover?: string;
  useCustomCover?: boolean;
  tracks: string[];
  color?: string;
  genre?: string;
  year?: string;
  order?: number;
  createdAt?: string;
  _uid?: string;
}

const MANIFEST_PATH = path.join(process.cwd(), "public", "vinyl-collection.json");

let _cachedAlbums: AlbumRecord[] | null = null;
let _lastCacheTime = 0;
let _isSyncingWithFirestore = false;

/**
 * Reads local fallback manifest if Firestore is unavailable
 */
async function getLocalManifestAlbums(): Promise<AlbumRecord[]> {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const data = await fsPromises.readFile(MANIFEST_PATH, "utf-8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        return list.map((a: any, idx: number) => ({
          ...a,
          id: a.id || `local_${idx}`,
          _uid: a.folder || a.id || `local_${idx}`
        }));
      }
    }
  } catch (err) {
    console.warn("[AlbumService] Could not read local manifest fallback:", err);
  }
  return [];
}

/**
 * Syncs albums from Firestore in the background to keep cache up to date
 */
async function syncFromFirestore(): Promise<AlbumRecord[] | null> {
  if (_isSyncingWithFirestore) return null;
  _isSyncingWithFirestore = true;
  try {
    const colRef = collection(db, "albums");
    const q = query(colRef, orderBy("order", "asc"));
    const snap = await withTimeout(getDocs(q), 4000, "Firestore getDocs timed out");
    
    if (snap && snap.docs && snap.docs.length > 0) {
      const items = snap.docs.map(d => {
        const data = d.data() as AlbumRecord;
        return {
          ...data,
          id: d.id,
          _uid: data.folder || d.id
        };
      });
      _cachedAlbums = items;
      _lastCacheTime = Date.now();
      return items;
    }
  } catch (err: any) {
    console.warn("[AlbumService] Background Firestore sync notice:", err?.message || err);
  } finally {
    _isSyncingWithFirestore = false;
  }
  return null;
}

/**
 * Fetches all albums with instantaneous in-memory / local manifest speed
 */
export async function getAlbums(): Promise<AlbumRecord[]> {
  // 1. If we have memory cache, return it immediately and refresh in background if stale
  if (_cachedAlbums !== null && _cachedAlbums.length > 0) {
    if (Date.now() - _lastCacheTime > 5000) {
      syncFromFirestore().catch(() => {});
    }
    return [..._cachedAlbums];
  }

  // 2. Fast local disk check (resolves in < 2ms)
  const localList = await getLocalManifestAlbums();
  if (localList.length > 0) {
    _cachedAlbums = localList;
    _lastCacheTime = Date.now();
    // Refresh from Firestore asynchronously without stalling client HTTP response
    syncFromFirestore().catch(() => {});
    return [...localList];
  }

  // 3. If local manifest empty, query Firestore with 3s timeout
  const firestoreItems = await syncFromFirestore();
  if (firestoreItems && firestoreItems.length > 0) {
    return [...firestoreItems];
  }

  return [];
}

/**
 * Calculates next order index to prepend newly uploaded album to the front
 */
export async function getNextPrependOrder(): Promise<number> {
  let minOrder = 0;
  if (_cachedAlbums && _cachedAlbums.length > 0) {
    for (const a of _cachedAlbums) {
      if (typeof a.order === "number" && a.order < minOrder) {
        minOrder = a.order;
      }
    }
    return minOrder - 1;
  }

  try {
    const colRef = collection(db, "albums");
    const snap = await withTimeout(getDocs(colRef), 2000).catch(() => null);
    if (snap) {
      snap.forEach(d => {
        const ord = d.data().order;
        if (typeof ord === "number" && ord < minOrder) {
          minOrder = ord;
        }
      });
    }
  } catch (_) {}
  return minOrder - 1;
}

/**
 * Saves a new or finalized album to Firestore and syncs manifests
 */
export async function saveAlbum(albumData: AlbumRecord): Promise<AlbumRecord> {
  const docId = albumData.id;
  const albumWithUid = {
    ...albumData,
    _uid: albumData.folder || albumData.id
  };

  // Immediately update in-memory cache so subsequent getAlbums() returns it in 0ms
  if (_cachedAlbums) {
    _cachedAlbums = [
      albumWithUid,
      ..._cachedAlbums.filter(a => a.id !== docId && a.folder !== albumData.folder && a._uid !== albumWithUid._uid)
    ];
  } else {
    _cachedAlbums = [albumWithUid];
  }
  _lastCacheTime = Date.now();

  // Clean up any previous tombstone in deleted_albums in parallel with short timeout
  Promise.allSettled([
    withTimeout(deleteDoc(doc(db, "deleted_albums", docId)), 1500),
    albumData.folder 
      ? withTimeout(deleteDoc(doc(db, "deleted_albums", path.basename(albumData.folder))), 1500)
      : Promise.resolve()
  ]).catch(() => {});

  // Save to Firestore with a safe 3.5s timeout
  try {
    await withTimeout(setDoc(doc(db, "albums", docId), albumData), 3500, "Save album to Firestore timed out");
    console.log(`[AlbumService] Saved album "${albumData.name}" (${docId}) to Firestore`);
  } catch (err: any) {
    console.warn(`[AlbumService] Firestore save notice (album persisted on disk):`, err?.message || err);
  }

  // Update local manifest files asynchronously in the background so HTTP response is instant
  updateCollection().catch(err => {
    console.warn("[AlbumService] Manifest update warning:", err?.message);
  });

  return albumWithUid;
}

/**
 * Updates album metadata in Firestore
 */
export async function updateAlbumMetadata(targetIdOrFolder: string, updates: Partial<AlbumRecord>): Promise<void> {
  const sanitizedId = targetIdOrFolder.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeFolder = path.basename(targetIdOrFolder);
  const updateData: any = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.author !== undefined) updateData.author = updates.author;
  if (updates.genre !== undefined) updateData.genre = updates.genre;
  if (updates.year !== undefined) updateData.year = updates.year;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.customCover !== undefined) updateData.customCover = updates.customCover;
  if (updates.useCustomCover !== undefined) updateData.useCustomCover = updates.useCustomCover;

  // Immediately update in-memory cache
  if (_cachedAlbums) {
    _cachedAlbums = _cachedAlbums.map(album => {
      if (album.id === sanitizedId || album.id === targetIdOrFolder || album.folder.includes(safeFolder)) {
        return { ...album, ...updateData };
      }
      return album;
    });
    _lastCacheTime = Date.now();
  }

  await withTimeout(setDoc(doc(db, "albums", sanitizedId), updateData, { merge: true }), 5000);

  // Also update any matching document
  try {
    const snap = await getDocs(collection(db, "albums"));
    for (const d of snap.docs) {
      const data = d.data();
      if (d.id === sanitizedId || d.id === targetIdOrFolder || data.folder === targetIdOrFolder) {
        await updateDoc(doc(db, "albums", d.id), updateData).catch(() => {});
      }
    }
  } catch (_) {}

  await updateCollection().catch(() => {});
}

/**
 * Reorders albums by setting consecutive order values
 */
export async function reorderAlbums(orderList: string[]): Promise<void> {
  if (!Array.isArray(orderList)) return;

  if (_cachedAlbums) {
    const map = new Map<string, AlbumRecord>();
    for (const a of _cachedAlbums) {
      map.set(a.id, a);
      map.set(a.folder, a);
      if (a._uid) map.set(a._uid, a);
    }
    const reordered: AlbumRecord[] = [];
    for (let i = 0; i < orderList.length; i++) {
      const key = orderList[i];
      const item = map.get(key);
      if (item && !reordered.includes(item)) {
        reordered.push({ ...item, order: i });
      }
    }
    // Append any not in orderList
    for (const a of _cachedAlbums) {
      if (!reordered.includes(a)) {
        reordered.push(a);
      }
    }
    _cachedAlbums = reordered;
    _lastCacheTime = Date.now();
  }

  for (let i = 0; i < orderList.length; i++) {
    const key = orderList[i];
    const docId = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    await setDoc(doc(db, "albums", docId), { order: i }, { merge: true }).catch(() => {});
  }
}

/**
 * Deletes an album from disk and Firestore, leaving a tombstone in deleted_albums
 */
export async function deleteAlbum(target: string): Promise<void> {
  const safeFolder = path.basename(target);
  const targetDir = path.join(process.cwd(), "public", "Vinyl Collection", safeFolder);

  // Immediately remove from in-memory cache so next getAlbums() is instant
  if (_cachedAlbums) {
    _cachedAlbums = _cachedAlbums.filter(a => 
      a.id !== target && 
      !a.folder.includes(safeFolder) && 
      a._uid !== target
    );
    _lastCacheTime = Date.now();
  }

  if (fs.existsSync(targetDir)) {
    await fsPromises.rm(targetDir, { recursive: true, force: true }).catch(() => {});
  }

  const primaryDocId = target.replace(/[^a-zA-Z0-9_-]/g, "_");
  const altDocId = `Vinyl_Collection_${safeFolder}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  const tombstone = {
    id: target,
    folder: `Vinyl Collection/${safeFolder}`,
    deletedAt: new Date().toISOString()
  };

  await setDoc(doc(db, "deleted_albums", primaryDocId), tombstone).catch(() => {});
  await setDoc(doc(db, "deleted_albums", altDocId), tombstone).catch(() => {});

  await deleteDoc(doc(db, "albums", primaryDocId)).catch(() => {});
  await deleteDoc(doc(db, "albums", altDocId)).catch(() => {});

  try {
    const snap = await getDocs(collection(db, "albums"));
    for (const d of snap.docs) {
      const data = d.data();
      if (
        d.id === target ||
        d.id === primaryDocId ||
        d.id === altDocId ||
        data.folder === target ||
        data.folder === `Vinyl Collection/${safeFolder}`
      ) {
        await setDoc(doc(db, "deleted_albums", d.id), { ...tombstone, id: d.id }).catch(() => {});
        await deleteDoc(doc(db, "albums", d.id)).catch(() => {});
      }
    }
  } catch (_) {}

  await updateCollection().catch(() => {});
}

/**
 * Clears all albums from Firestore and disk
 */
export async function clearAllAlbums(): Promise<void> {
  _cachedAlbums = [];
  _lastCacheTime = Date.now();

  try {
    const snap = await getDocs(collection(db, "albums"));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, "albums", d.id)).catch(() => {});
    }
    const delSnap = await getDocs(collection(db, "deleted_albums")).catch(() => ({ docs: [] } as any));
    for (const d of delSnap.docs) {
      await deleteDoc(doc(db, "deleted_albums", d.id)).catch(() => {});
    }
  } catch (_) {}

  const collectionDir = path.join(process.cwd(), "public", "Vinyl Collection");
  if (fs.existsSync(collectionDir)) {
    const files = await fsPromises.readdir(collectionDir);
    for (const f of files) {
      await fsPromises.rm(path.join(collectionDir, f), { recursive: true, force: true }).catch(() => {});
    }
  }

  await fsPromises.writeFile(MANIFEST_PATH, "[]", "utf-8").catch(() => {});
  const jsManifestPath = path.join(process.cwd(), "public", "collection-data.js");
  await fsPromises.writeFile(jsManifestPath, "window.VINYL_COLLECTION = [];\n", "utf-8").catch(() => {});
}

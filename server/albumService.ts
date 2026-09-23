import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { updateCollection } from "../update-collection.js";
import { getR2Client, getR2Config, isR2Configured } from "./r2Service.js";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import {
  syncAlbumToFirestore,
  deleteAlbumFromFirestore,
  syncAllAlbumsToFirestore,
  clearAllAlbumsFromFirestore,
  getAlbumsFromFirestore
} from "./firestoreService.js";

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
const JS_MANIFEST_PATH = path.join(process.cwd(), "public", "collection-data.js");
const COLLECTION_DIR = path.join(process.cwd(), "public", "Vinyl Collection");

/**
 * Helper to deduplicate track lists case-insensitively (.mp3 vs .MP3), prioritizing lowercase extensions
 */
function deduplicateTracks(tracks: string[]): string[] {
  if (!Array.isArray(tracks)) return [];
  const trackMap = new Map<string, string>();
  for (const t of tracks) {
    if (!t) continue;
    const baseKey = t.replace(/\.[^/.]+$/, "").toLowerCase().trim();
    const existing = trackMap.get(baseKey);
    if (!existing || (!existing.endsWith(".mp3") && t.endsWith(".mp3"))) {
      trackMap.set(baseKey, t);
    }
  }
  return Array.from(trackMap.values()).sort();
}

/**
 * Syncs albums directly by scanning Cloudflare R2 bucket contents
 */
export async function syncAlbumsFromR2(): Promise<AlbumRecord[]> {
  if (!isR2Configured()) {
    return [];
  }
  try {
    const client = getR2Client();
    const conf = getR2Config();
    const bucket = conf.bucketName;
    const publicBase = (conf.publicUrl || "https://pub-4b9d70f6726b44f081cf11942ab2556d.r2.dev").replace(/\/$/, "");

    const res = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "Vinyl Collection/"
    }));

    if (!res.Contents || res.Contents.length === 0) {
      return [];
    }

    const folderMap = new Map<string, { tracks: string[]; cover?: string }>();

    for (const obj of res.Contents) {
      const key = obj.Key;
      if (!key) continue;
      const rel = key.replace(/^Vinyl Collection\//i, "");
      const parts = rel.split("/");
      if (parts.length < 2) continue;

      const albumFolder = parts[0];
      const fileName = parts.slice(1).join("/");
      if (!fileName) continue;

      if (!folderMap.has(albumFolder)) {
        folderMap.set(albumFolder, { tracks: [] });
      }

      const alb = folderMap.get(albumFolder)!;
      const lower = fileName.toLowerCase();
      if (lower.endsWith(".mp3") || lower.endsWith(".flac") || lower.endsWith(".wav") || lower.endsWith(".m4a") || lower.endsWith(".ogg")) {
        if (!alb.tracks.includes(fileName)) {
          alb.tracks.push(fileName);
        }
      } else if (lower.includes("folder.jpg") || lower.includes("cover.jpg") || lower.includes("cover.png")) {
        alb.cover = `${publicBase}/Vinyl Collection/${encodeURIComponent(albumFolder)}/${encodeURIComponent(fileName)}`;
      }
    }

    const discoveredAlbums: AlbumRecord[] = [];
    let idx = 0;

    for (const [folderName, data] of folderMap.entries()) {
      if (data.tracks.length === 0) continue;
      const cleanTracks = deduplicateTracks(data.tracks);

      let author = "Nepoznati izvođač";
      let name = folderName;
      const dashIdx = folderName.indexOf(" - ");
      if (dashIdx !== -1) {
        author = folderName.slice(0, dashIdx).trim();
        name = folderName.slice(dashIdx + 3).trim();
      }

      const albumId = `Vinyl_Collection_${folderName}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      const cover = data.cover || `${publicBase}/Vinyl Collection/${encodeURIComponent(folderName)}/folder.jpg`;

      discoveredAlbums.push({
        id: albumId,
        name: name || folderName,
        author: author || "Nepoznati izvođač",
        folder: folderName,
        cover,
        tracks: cleanTracks,
        genre: "Rock / Vinyl",
        year: "2024",
        order: idx++
      });
    }

    if (discoveredAlbums.length > 0) {
      console.log(`[R2 Sync] Discovered ${discoveredAlbums.length} albums directly from R2 bucket.`);
      const existing = await getAlbumsFromFirestore().catch(() => []);
      const existingMap = new Map(existing.map((a: any) => [a.folder || a.id, a]));

      const finalAlbums = discoveredAlbums.map((disc, idx) => {
        const found = existingMap.get(disc.folder) || existingMap.get(disc.id);
        if (found) {
          return {
            ...disc,
            ...found,
            tracks: disc.tracks.length > 0 ? disc.tracks : (found.tracks || []),
            cover: disc.cover || found.cover,
            order: typeof found.order === "number" ? found.order : idx
          };
        }
        return { ...disc, order: idx };
      });

      await writeManifests(finalAlbums);
      await syncAllAlbumsToFirestore(finalAlbums).catch(() => {});
      return finalAlbums;
    }

    return [];
  } catch (err: any) {
    console.warn("[R2 Sync] Notice scanning R2 bucket:", err?.message);
    return [];
  }
}

/**
 * Writes the collection array to both json and js files
 */
async function writeManifests(albums: AlbumRecord[]) {
  try {
    await fsPromises.writeFile(MANIFEST_PATH, JSON.stringify(albums, null, 2), "utf-8");
    await fsPromises.writeFile(JS_MANIFEST_PATH, `window.VINYL_COLLECTION = ${JSON.stringify(albums, null, 2)};\n`, "utf-8");
  } catch (err) {
    console.error("[AlbumService] Error writing manifests:", err);
  }
}

/**
 * Reads albums from Firestore (cloud database), local manifest, or scans public/Vinyl Collection
 */
export async function getAlbums(): Promise<AlbumRecord[]> {
  // 0. Automatically discover & sync albums from Cloudflare R2 bucket first
  try {
    const r2Synced = await syncAlbumsFromR2();
    if (Array.isArray(r2Synced) && r2Synced.length > 0) {
      const formatted: AlbumRecord[] = r2Synced.map((a: any, idx: number) => ({
        ...a,
        id: a.id || `Vinyl_Collection_${path.basename(a.folder || `album_${idx}`)}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
        _uid: a.folder || a.id || `album_${idx}`,
        order: typeof a.order === "number" ? a.order : idx
      }));
      return formatted;
    }
  } catch (e) {
    console.warn("[AlbumService] R2 auto-discovery notice:", e);
  }

  // 1. Primary Source of Truth: Firestore Cloud Database
  try {
    const cloudAlbums = await getAlbumsFromFirestore();
    if (Array.isArray(cloudAlbums) && cloudAlbums.length > 0) {
      const formatted: AlbumRecord[] = cloudAlbums.map((a: any, idx: number) => ({
        ...a,
        tracks: deduplicateTracks(a.tracks),
        id: a.id || `Vinyl_Collection_${path.basename(a.folder || `album_${idx}`)}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
        _uid: a.folder || a.id || `album_${idx}`,
        order: typeof a.order === "number" ? a.order : idx
      }));
      // Keep local manifests and Firestore in sync as cache/source
      await writeManifests(formatted);
      await syncAllAlbumsToFirestore(formatted).catch(() => {});
      return formatted;
    }
  } catch (err) {
    console.warn("[AlbumService] Could not fetch from Firestore, falling back to local files:", err);
  }

  // 2. Secondary Source: Local manifest file
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const data = await fsPromises.readFile(MANIFEST_PATH, "utf-8");
      const list = JSON.parse(data);
      if (Array.isArray(list) && list.length > 0) {
        return list.map((a: any, idx: number) => ({
          ...a,
          tracks: deduplicateTracks(a.tracks),
          id: a.id || `Vinyl_Collection_${path.basename(a.folder || `album_${idx}`)}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
          _uid: a.folder || a.id || `album_${idx}`,
          order: typeof a.order === "number" ? a.order : idx
        }));
      }
    }
  } catch (err) {
    console.warn("[AlbumService] Could not read manifest, rescanning Vinyl Collection...", err);
  }

  // 3. Fallback: scan public/Vinyl Collection folder directly
  const scanned = await updateCollection().catch(() => []);
  return scanned.map((a: any, idx: number) => ({
    ...a,
    tracks: deduplicateTracks(a.tracks),
    id: a.id || `Vinyl_Collection_${path.basename(a.folder || `album_${idx}`)}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
    _uid: a.folder || a.id || `album_${idx}`,
    order: typeof a.order === "number" ? a.order : idx
  }));
}

/**
 * Calculates next order index to prepend newly uploaded album to the front
 */
export async function getNextPrependOrder(): Promise<number> {
  const albums = await getAlbums();
  if (albums.length === 0) return 0;
  let minOrder = 0;
  for (const a of albums) {
    if (typeof a.order === "number" && a.order < minOrder) {
      minOrder = a.order;
    }
  }
  return minOrder - 1;
}

/**
 * Saves a new or finalized album to local manifests
 */
export async function saveAlbum(albumData: AlbumRecord): Promise<AlbumRecord> {
  const albums = await getAlbums();
  const safeFolder = path.basename(albumData.folder);
  const albumWithUid: AlbumRecord = {
    ...albumData,
    id: albumData.id || `Vinyl_Collection_${safeFolder}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
    _uid: albumData.folder || albumData.id
  };

  const existingIdx = albums.findIndex(a => 
    a.folder === albumData.folder || 
    a.id === albumWithUid.id ||
    path.basename(a.folder) === safeFolder
  );

  let updatedList: AlbumRecord[];
  if (existingIdx >= 0) {
    updatedList = [...albums];
    updatedList[existingIdx] = { ...albums[existingIdx], ...albumWithUid };
  } else {
    updatedList = [albumWithUid, ...albums];
  }

  // Sort by order
  updatedList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  await writeManifests(updatedList);
  await syncAlbumToFirestore(albumWithUid).catch(() => {});
  console.log(`[AlbumService] Album "${albumData.name}" saved to vinyl-collection.json and Firestore cloud`);

  return albumWithUid;
}

/**
 * Updates album metadata in local manifest and Firestore
 */
export async function updateAlbumMetadata(targetIdOrFolder: string, updates: Partial<AlbumRecord>): Promise<void> {
  const safeFolder = path.basename(targetIdOrFolder);
  const albums = await getAlbums();
  let updatedItem: AlbumRecord | null = null;

  const updatedList = albums.map(album => {
    if (
      album.id === targetIdOrFolder ||
      album.folder === targetIdOrFolder ||
      path.basename(album.folder) === safeFolder ||
      album._uid === targetIdOrFolder
    ) {
      updatedItem = {
        ...album,
        ...updates
      };
      return updatedItem;
    }
    return album;
  });

  await writeManifests(updatedList);
  if (updatedItem) {
    await syncAlbumToFirestore(updatedItem).catch(() => {});
  }
  console.log(`[AlbumService] Updated metadata for "${targetIdOrFolder}" (synced to Firestore)`);
}

/**
 * Reorders albums according to orderList
 */
export async function reorderAlbums(orderList: string[]): Promise<void> {
  if (!Array.isArray(orderList)) return;
  const albums = await getAlbums();
  const map = new Map<string, AlbumRecord>();

  for (const a of albums) {
    map.set(a.id, a);
    map.set(a.folder, a);
    if (a._uid) map.set(a._uid, a);
    map.set(path.basename(a.folder), a);
  }

  const reordered: AlbumRecord[] = [];
  for (let i = 0; i < orderList.length; i++) {
    const key = orderList[i];
    const item = map.get(key);
    if (item && !reordered.includes(item)) {
      reordered.push({ ...item, order: i });
    }
  }

  for (const a of albums) {
    if (!reordered.includes(a)) {
      reordered.push({ ...a, order: reordered.length });
    }
  }

  await writeManifests(reordered);
  await syncAllAlbumsToFirestore(reordered).catch(() => {});
  console.log(`[AlbumService] Reordered ${reordered.length} albums in manifest & Firestore`);
}

/**
 * Deletes an album directly from public/Vinyl Collection folder on disk and updates manifest
 */
export async function deleteAlbum(target: string): Promise<void> {
  const safeFolder = path.basename(target);
  const targetDir = path.join(COLLECTION_DIR, safeFolder);

  console.log(`[AlbumService] Deleting folder from repository: ${targetDir}`);

  if (fs.existsSync(targetDir)) {
    await fsPromises.rm(targetDir, { recursive: true, force: true }).catch((err) => {
      console.warn(`[AlbumService] Could not delete directory ${targetDir}:`, err?.message);
    });
  }

  // Rescan public/Vinyl Collection and regenerate manifest
  await updateCollection().catch(async (err) => {
    console.warn("[AlbumService] Rescan error after delete, updating manifest manually:", err);
    const albums = await getAlbums();
    const filtered = albums.filter(a => 
      a.id !== target && 
      a.folder !== target && 
      path.basename(a.folder) !== safeFolder &&
      a._uid !== target
    );
    await writeManifests(filtered);
  });

  await deleteAlbumFromFirestore(target).catch(() => {});
  console.log(`[AlbumService] Album "${safeFolder}" deleted successfully (and marked deleted in Firestore).`);
}

/**
 * Clears all albums from public/Vinyl Collection and resets manifest
 */
export async function clearAllAlbums(): Promise<void> {
  if (fs.existsSync(COLLECTION_DIR)) {
    const files = await fsPromises.readdir(COLLECTION_DIR);
    for (const f of files) {
      await fsPromises.rm(path.join(COLLECTION_DIR, f), { recursive: true, force: true }).catch(() => {});
    }
  }

  await writeManifests([]);
  await clearAllAlbumsFromFirestore().catch(() => {});
  console.log("[AlbumService] Cleared all albums from Vinyl Collection folder and Firestore.");
}

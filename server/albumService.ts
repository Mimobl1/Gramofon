import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { updateCollection } from "../update-collection.js";
import { getR2Client, getR2Config, isR2Configured, deleteR2ObjectsByPrefix } from "./r2Service.js";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import {
  syncAlbumToFirestore,
  deleteAlbumFromFirestore,
  syncAllAlbumsToFirestore,
  clearAllAlbumsFromFirestore,
  clearDeletedAlbumFromFirestore,
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
 * Normalizes any folder name, relative path, or full public R2 URL to the clean album subfolder name
 */
export function cleanAlbumFolder(input?: string | null): string {
  if (!input) return "";
  let str = String(input).trim();
  try {
    if (str.startsWith("http://") || str.startsWith("https://")) {
      const u = new URL(str);
      str = decodeURIComponent(u.pathname);
    }
  } catch (_) {}
  str = str.replace(/^[\\\/]+/, "");
  str = str.replace(/^Vinyl Collection[\\\/]/i, "");
  str = str.replace(/[\\\/]+$/, "");
  return str.trim();
}

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

    console.log(`[R2 Sync] Scanning bucket: ${bucket}`);
    const allObjects: any[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const res = await client.send(new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken
      }));
      if (res.Contents && res.Contents.length > 0) {
        allObjects.push(...res.Contents);
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    console.log(`[R2 Sync] Found ${allObjects.length} total objects in bucket.`);

    if (allObjects.length === 0) {
      return [];
    }

    const folderMap = new Map<string, { tracks: string[]; cover?: string; latestTime: number }>();

    for (const obj of allObjects) {
      const key = obj.Key;
      if (!key || !key.startsWith("Vinyl Collection/")) continue;
      const rel = key.replace(/^Vinyl Collection\//i, "");
      const parts = rel.split("/");
      if (parts.length < 2) continue;

      const albumFolder = parts[0];
      const fileName = parts.slice(1).join("/");
      if (!fileName) continue;

      const objTime = obj.LastModified ? new Date(obj.LastModified).getTime() : 0;

      if (!folderMap.has(albumFolder)) {
        folderMap.set(albumFolder, { tracks: [], latestTime: objTime });
      }

      const alb = folderMap.get(albumFolder)!;
      if (objTime > alb.latestTime) {
        alb.latestTime = objTime;
      }

      const lower = fileName.toLowerCase();
      if (lower.endsWith(".mp3") || lower.endsWith(".flac") || lower.endsWith(".wav") || lower.endsWith(".m4a") || lower.endsWith(".ogg")) {
        if (!alb.tracks.includes(fileName)) {
          alb.tracks.push(fileName);
        }
      } else if (lower.includes("folder.jpg") || lower.includes("cover.jpg") || lower.includes("cover.png") || lower.endsWith(".jpg") || lower.endsWith(".png")) {
        alb.cover = `${publicBase}/Vinyl Collection/${encodeURIComponent(albumFolder)}/${encodeURIComponent(fileName)}`;
      }
    }

    // Sort folders by latest upload timestamp descending so newest uploads are at index 0 (top of stack)
    const folderEntries = Array.from(folderMap.entries())
      .filter(([_, data]) => data.tracks.length > 0)
      .sort((a, b) => b[1].latestTime - a[1].latestTime);

    const discoveredAlbums: AlbumRecord[] = [];

    for (const [folderName, data] of folderEntries) {
      const cleanTracks = deduplicateTracks(data.tracks);

      let author = "Nepoznati izvođač";
      let name = folderName;
      const dashIdx = folderName.indexOf(" - ");
      if (dashIdx !== -1) {
        author = folderName.slice(0, dashIdx).trim();
        name = folderName.slice(dashIdx + 3).trim();
      }

      const albumId = folderName.replace(/[^a-zA-Z0-9_-]/g, "_");
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
        createdAt: new Date(data.latestTime).toISOString()
      });
    }

    if (discoveredAlbums.length > 0) {
      console.log(`[R2 Sync] Discovered ${discoveredAlbums.length} albums directly from R2 bucket.`);
      const existing = await getAlbumsFromFirestore().catch(() => []);
      const r2FolderSet = new Set(discoveredAlbums.map(d => cleanAlbumFolder(d.folder).toLowerCase()));

      // Automatically purge Firestore docs that were truly deleted from R2
      for (const ex of existing) {
        const cleanF = cleanAlbumFolder(ex.folder || ex.id).toLowerCase();
        if (cleanF && !r2FolderSet.has(cleanF)) {
          console.log(`[R2 Sync] Purging album deleted from R2: ${ex.id} (${ex.folder})`);
          await deleteAlbumFromFirestore(ex.id).catch(() => {});
        }
      }

      const existingMap = new Map();
      existing.forEach((a: any) => {
        const cleanF = cleanAlbumFolder(a.folder || a.id).toLowerCase();
        if (cleanF) existingMap.set(cleanF, a);
        if (a.id) existingMap.set(a.id, a);
      });

      // Clear any deleted_albums tombstones for albums that exist in R2
      for (const disc of discoveredAlbums) {
        await clearDeletedAlbumFromFirestore(disc.id).catch(() => {});
        await clearDeletedAlbumFromFirestore(disc.folder).catch(() => {});
      }

      const finalAlbums = discoveredAlbums.map((disc, idx) => {
        const cleanF = cleanAlbumFolder(disc.folder).toLowerCase();
        const found = existingMap.get(cleanF) || existingMap.get(disc.id);
        if (found) {
          return {
            ...disc,
            ...found,
            id: disc.id,
            folder: disc.folder,
            tracks: disc.tracks.length > 0 ? disc.tracks : (found.tracks || []),
            cover: found.cover || disc.cover,
            color: found.color || "#1a1a1a",
            customCover: found.customCover || "",
            useCustomCover: found.useCustomCover !== undefined ? found.useCustomCover : (!!found.customCover),
            createdAt: found.createdAt || disc.createdAt,
            order: typeof found.order === "number" ? found.order : idx
          };
        }
        return { ...disc, order: idx };
      });

      // Sort so lowest order index (or newest createdAt) appears first (top of stack)
      finalAlbums.sort((a, b) => {
        const orderA = typeof a.order === "number" ? a.order : 9999;
        const orderB = typeof b.order === "number" ? b.order : 9999;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      // Ensure clean consecutive ordering 0, 1, 2, ...
      finalAlbums.forEach((a, i) => { a.order = i; });

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
 * Reads albums from Firestore (cloud database) as the Primary Source of Truth
 */
export async function getAlbums(): Promise<AlbumRecord[]> {
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
      // Keep local manifests in sync as cache
      await writeManifests(formatted);
      return formatted;
    }
  } catch (err) {
    console.warn("[AlbumService] Could not fetch from Firestore:", err);
  }

  // 2. Fallback: Secondary Source: Local manifest file
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
    console.warn("[AlbumService] Could not read manifest...", err);
  }

  // 3. Last Resort: Sync from R2
  try {
    console.log("[AlbumService] Firestore and manifest empty, syncing from R2...");
    const r2Albums = await syncAlbumsFromR2();
    return r2Albums;
  } catch (err) {
    console.error("[AlbumService] Sync from R2 failed:", err);
  }

  return [];
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
  const safeFolder = cleanAlbumFolder(albumData.folder);
  const albumWithUid: AlbumRecord = {
    ...albumData,
    id: albumData.id || `Vinyl_Collection_${safeFolder}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
    _uid: albumData.folder || albumData.id,
    createdAt: albumData.createdAt || new Date().toISOString()
  };

  const cleanTarget = safeFolder.toLowerCase();

  const existingIdx = albums.findIndex(a => 
    cleanAlbumFolder(a.folder).toLowerCase() === cleanTarget || 
    a.id === albumWithUid.id ||
    cleanAlbumFolder(a.id).toLowerCase() === cleanTarget
  );

  let updatedList: AlbumRecord[];
  if (existingIdx >= 0) {
    updatedList = [...albums];
    updatedList[existingIdx] = { ...albums[existingIdx], ...albumWithUid };
  } else {
    // New album: Place at order 0 (top of stack) and shift all existing albums down
    albumWithUid.order = 0;
    const rest = albums.map((a, idx) => ({ ...a, order: idx + 1 }));
    updatedList = [albumWithUid, ...rest];
  }

  // Sort by order ascending
  updatedList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  // Clean consecutive reindexing 0, 1, 2, ...
  updatedList.forEach((a, i) => { a.order = i; });

  await writeManifests(updatedList);
  await syncAllAlbumsToFirestore(updatedList).catch(() => {});
  console.log(`[AlbumService] Album "${albumData.name}" saved at top of stack (order: 0) to vinyl-collection.json and Firestore cloud`);

  return albumWithUid;
}

/**
 * Updates album metadata in local manifest and Firestore
 */
export async function updateAlbumMetadata(targetIdOrFolder: string, updates: Partial<AlbumRecord>): Promise<void> {
  const cleanTarget = cleanAlbumFolder(targetIdOrFolder).toLowerCase();
  const albums = await getAlbums();
  let updatedItem: AlbumRecord | null = null;

  const updatedList = albums.map(album => {
    if (
      album.id === targetIdOrFolder ||
      album.folder === targetIdOrFolder ||
      cleanAlbumFolder(album.folder).toLowerCase() === cleanTarget ||
      cleanAlbumFolder(album.id).toLowerCase() === cleanTarget ||
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
  const decodedTarget = decodeURIComponent(target);
  const safeFolder = path.basename(decodedTarget).replace(/^Vinyl_Collection_/, "").replace(/___/g, " - ");
  const targetDirDirect = path.join(COLLECTION_DIR, decodedTarget);
  const targetDir = path.join(COLLECTION_DIR, safeFolder);

  console.log(`[AlbumService] Attempting to delete album: "${target}"`);

  // 1. Delete from R2 bucket strictly first, and verify success
  const prefixesToTry = [
    `Vinyl Collection/${safeFolder}`,
    `Vinyl Collection/${decodedTarget}`,
    `Vinyl Collection/${target}`
  ];

  let deletionFailed = false;
  for (const pfx of prefixesToTry) {
    if (pfx && pfx.length > "Vinyl Collection/".length) {
      try {
        await deleteR2ObjectsByPrefix(pfx, null);
      } catch (err) {
        console.error(`[AlbumService] R2 deletion failed for ${pfx}:`, err);
        deletionFailed = true;
      }
    }
  }

  if (deletionFailed) {
    throw new Error("Brisanje sa R2 nije uspelo, album nije obrisan iz aplikacije.");
  }

  // 2. Only if R2 deletion succeeded, clean up local/Firestore/manifest
  if (fs.existsSync(targetDirDirect)) {
    await fsPromises.rm(targetDirDirect, { recursive: true, force: true }).catch(() => {});
  }
  if (fs.existsSync(targetDir)) {
    await fsPromises.rm(targetDir, { recursive: true, force: true }).catch(() => {});
  }

  await deleteAlbumFromFirestore(target).catch(() => {});
  await deleteAlbumFromFirestore(safeFolder).catch(() => {});
  await deleteAlbumFromFirestore(decodedTarget).catch(() => {});

  // Force strict re-scan of R2 bucket as the Single Source of Truth
  try {
    const refreshedAlbums = await syncAlbumsFromR2();
    await writeManifests(refreshedAlbums);
    await syncAllAlbumsToFirestore(refreshedAlbums).catch(() => {});
    console.log(`[AlbumService] Album successfully deleted. R2 now has ${refreshedAlbums.length} albums.`);
  } catch (rescanErr) {
    console.warn("[AlbumService] Error rescanning R2 after delete:", rescanErr);
  }
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

import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import multer from "multer";
import { 
  sanitizeFolderName, 
  sanitizeTrackFileName, 
  queueBackgroundCompression 
} from "./audioService.js";
import { 
  saveAlbum, 
  getNextPrependOrder, 
  AlbumRecord 
} from "./albumService.js";
import { 
  isR2Configured, 
  uploadFileToR2, 
  uploadBufferToR2, 
  getR2PublicUrl,
  getR2Config,
  R2Credentials
} from "./r2Service.js";
import { getUserR2Settings } from "./firestoreService.js";

function hslToHex(h: number, s: number, l: number): string {
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const lig = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = lig - c / 2;
  const rr = Math.round((r + m) * 255).toString(16).padStart(2, "0");
  const rg = Math.round((g + m) * 255).toString(16).padStart(2, "0");
  const rb = Math.round((b + m) * 255).toString(16).padStart(2, "0");
  return `#${rr}${rg}${rb}`;
}

function getRandomMediumColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const sat = Math.floor(Math.random() * 26) + 25; // 25..50% (slightly desaturated)
  const light = Math.floor(Math.random() * 21) + 22; // 22..42% (slightly darker shades)
  return hslToHex(hue, sat, light);
}

async function resolveUserCreds(body: any): Promise<Partial<R2Credentials> | null> {
  const email = (body.userEmail || body.email || "").toString().trim().toLowerCase();
  if (!email || email === "demo" || email === "demo@vinyl.local") {
    return null;
  }
  const userSettings = await getUserR2Settings(email);
  if (userSettings && userSettings.accountId && userSettings.accessKeyId) {
    return {
      accountId: userSettings.accountId,
      accessKeyId: userSettings.accessKeyId,
      secretAccessKey: userSettings.secretAccessKey,
      bucketName: userSettings.bucketName,
      publicUrl: userSettings.publicUrl
    };
  }
  return null;
}

const TMP_DIR = path.join(process.cwd(), "tmp_uploads");
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

export const multerUpload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 300 * 1024 * 1024 } // 300MB max per file
});

/**
 * Step 1: Initialize album folder & save cover image
 */
export async function initAlbumUpload(body: any, files?: Express.Multer.File[]) {
  const artist = (body.artistName || "NEPOZNATI IZVOĐAČ").toString().trim().toUpperCase();
  const album = (body.albumName || "NOVI ALBUM").toString().trim().toUpperCase();
  const folderName = sanitizeFolderName(artist, album);
  const userCreds = await resolveUserCreds(body);

  const targetDir = path.join(process.cwd(), "public", "Vinyl Collection", folderName);
  try {
    await fsPromises.mkdir(targetDir, { recursive: true });
  } catch (fsErr: any) {
    console.warn("[Upload] Note: could not create target directory in public (read-only disk):", fsErr?.message);
  }

  let coverPath = "";
  let customCoverDataUrl = "";

  // If client provided pre-compressed data URL
  if (body.customCoverDataUrl && typeof body.customCoverDataUrl === "string" && body.customCoverDataUrl.startsWith("data:image/")) {
    customCoverDataUrl = body.customCoverDataUrl;
  }

  const coverFile = files && files.length > 0 
    ? (files.find(f => f.fieldname === "cover") || files[0]) 
    : null;

  if (coverFile) {
  const timestamp = Date.now();
  const ext = (path.extname(coverFile.originalname) || ".jpg").toLowerCase();
  const coverFileName = `cover_${timestamp}${ext}`;
  const targetCover = path.join(targetDir, coverFileName);
  
  // Cleanup old covers to prevent clutter
  try {
    const filesInDir = await fsPromises.readdir(targetDir);
    for (const f of filesInDir) {
      if (f.startsWith("cover_") || f === "folder.jpg" || f === "folder.png") {
        await fsPromises.unlink(path.join(targetDir, f)).catch(() => {});
      }
    }
  } catch (_) {}

  try {
    await fsPromises.copyFile(coverFile.path, targetCover);
  } catch (fsErr: any) {
    console.warn("[Upload] Note: could not write local cover copy (read-only disk):", fsErr?.message);
  }

  coverPath = `Vinyl Collection/${folderName}/${coverFileName}`;

  if (isR2Configured(userCreds)) {
    try {
      const coverBuf = await fsPromises.readFile(coverFile.path).catch(() => fsPromises.readFile(targetCover));
      if (coverBuf) {
        const r2Res = await uploadBufferToR2(`Vinyl Collection/${folderName}/${coverFileName}`, coverBuf, undefined, userCreds);
        coverPath = r2Res.publicUrl;
        console.log(`[R2] Cover image uploaded to Cloudflare R2: ${r2Res.publicUrl}`);
      }
    } catch (r2Err: any) {
      console.warn("[R2] Cloudflare R2 cover upload notice:", r2Err?.message);
    }
  }

    if (!customCoverDataUrl) {
      try {
        const buf = await fsPromises.readFile(coverFile.path).catch(() => fsPromises.readFile(targetCover));
        if (buf && buf.length <= 950 * 1024) {
          const mime = ext === ".png" ? "image/png" : "image/jpeg";
          customCoverDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
        }
      } catch (_) {}
    }
    try { await fsPromises.unlink(coverFile.path); } catch (_) {}
  }

  const albumDocId = `Vinyl_Collection_${folderName}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  return {
    status: "ok",
    folderName,
    albumDocId,
    coverPath,
    customCoverDataUrl
  };
}

/**
 * Step 2: Handle individual track or track chunk upload
 */
export async function handleTrackChunk(
  body: any, 
  file: Express.Multer.File
) {
  const folderName = (body.folderName || "").toString().trim();
  const rawFileName = (body.fileName || file.originalname || "").toString().trim();
  const chunkIndex = parseInt(body.chunkIndex || "0", 10);
  const totalChunks = parseInt(body.totalChunks || "1", 10);
  const userCreds = await resolveUserCreds(body);

  if (!folderName || !rawFileName) {
    try { await fsPromises.unlink(file.path); } catch (_) {}
    throw new Error("folderName and fileName are required");
  }

  const safeFolder = path.basename(folderName);
  const targetDir = path.join(process.cwd(), "public", "Vinyl Collection", safeFolder);
  try {
    await fsPromises.mkdir(targetDir, { recursive: true });
  } catch (_) {}

  const outFileName = sanitizeTrackFileName(rawFileName);
  const finalDest = path.join(targetDir, outFileName);

  // If single piece upload
  if (totalChunks <= 1) {
    try {
      await fsPromises.copyFile(file.path, finalDest);
    } catch (fsErr: any) {
      console.warn("[Upload] Could not write file to public disk (read-only filesystem):", fsErr?.message);
    }

    if (isR2Configured(userCreds)) {
      try {
        const r2Key = `Vinyl Collection/${safeFolder}/${outFileName}`;
        await uploadFileToR2(r2Key, file.path, undefined, userCreds);
        console.log(`[R2] Uploaded track to Cloudflare R2: ${r2Key}`);
      } catch (r2Err: any) {
        console.warn("[R2] Cloudflare R2 track upload notice:", r2Err?.message);
      }
    }

    try { await fsPromises.unlink(file.path); } catch (_) {}

    return {
      status: "ok",
      completed: true,
      fileName: outFileName
    };
  }

  // If multi-chunk upload, assemble into TMP_DIR (NOT in public folder to prevent premature inclusion)
  const partFileName = `${safeFolder}_${path.parse(outFileName).name}.part`;
  const partFilePath = path.join(TMP_DIR, partFileName);
  const chunkBuffer = await fsPromises.readFile(file.path);
  try { await fsPromises.unlink(file.path); } catch (_) {}

  if (chunkIndex === 0) {
    await fsPromises.writeFile(partFilePath, chunkBuffer);
  } else {
    await fsPromises.appendFile(partFilePath, chunkBuffer);
  }

  if (chunkIndex === totalChunks - 1) {
    try {
      await fsPromises.copyFile(partFilePath, finalDest);
    } catch (fsErr: any) {
      console.warn("[Upload] Could not copy final assembled track to public disk:", fsErr?.message);
    }

    if (isR2Configured(userCreds)) {
      try {
        const r2Key = `Vinyl Collection/${safeFolder}/${outFileName}`;
        await uploadFileToR2(r2Key, partFilePath, undefined, userCreds);
        console.log(`[R2] Uploaded assembled track to Cloudflare R2: ${r2Key}`);
      } catch (r2Err: any) {
        console.warn("[R2] Cloudflare R2 chunked track upload notice:", r2Err?.message);
      }
    }

    try { await fsPromises.unlink(partFilePath); } catch (_) {}

    return {
      status: "ok",
      completed: true,
      fileName: outFileName
    };
  }

  return {
    status: "ok",
    completed: false,
    chunkIndex
  };
}

/**
 * Step 3: Finalize album & store record in Firestore
 */
export async function finalizeAlbumUpload(body: any) {
  const {
    folderName,
    albumName,
    artistName,
    genre,
    year,
    color,
    coverPath,
    customCoverDataUrl,
    tracks: providedTracks
  } = body;

  const userCreds = await resolveUserCreds(body);

  if (!folderName) {
    throw new Error("folderName is required");
  }

  const safeFolder = path.basename(folderName);
  const targetDir = path.join(process.cwd(), "public", "Vinyl Collection", safeFolder);

  let trackNames: string[] = [];
  const trackPaths: string[] = [];

  try {
    if (fs.existsSync(targetDir)) {
      const dirFiles = await fsPromises.readdir(targetDir);
      trackNames = dirFiles.filter(f => /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(f)).sort();
      for (const t of trackNames) {
        trackPaths.push(path.join(targetDir, t));
      }
    }
  } catch (_) {}

  if (Array.isArray(providedTracks) && providedTracks.length > 0) {
    trackNames = providedTracks;
  }

  if (trackNames.length === 0) {
    trackNames = [`${albumName || "Track 01"}.mp3`];
  }

  const newOrder = await getNextPrependOrder();
  const albumDocId = `Vinyl_Collection_${safeFolder}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  const finalColor = (color && /^#[0-9A-Fa-f]{3,6}$/.test(color) && color.toLowerCase() !== "#1a1a1a") ? color : getRandomMediumColor();

  let albumFolder = `Vinyl Collection/${safeFolder}`;
  if (isR2Configured(userCreds)) {
    const r2Conf = getR2Config(userCreds);
    if (r2Conf.publicUrl) {
      const base = r2Conf.publicUrl.trim().replace(/\/$/, "");
      albumFolder = `${base}/Vinyl Collection/${safeFolder}`;
    }
  }

  const albumRecord: AlbumRecord = {
    id: albumDocId,
    name: (albumName || safeFolder).toString().trim().toUpperCase(),
    author: (artistName || "NEPOZNATI IZVOĐAČ").toString().trim().toUpperCase(),
    folder: albumFolder,
    cover: coverPath || "",
    tracks: trackNames,
    color: finalColor,
    genre: genre || "ROCK",
    year: year || "",
    order: 0,
    createdAt: new Date().toISOString()
  };

  if (customCoverDataUrl && customCoverDataUrl.length < 850000) {
    albumRecord.customCover = customCoverDataUrl;
    albumRecord.useCustomCover = true;
  }

  const saved = await saveAlbum(albumRecord);

  // Queue non-blocking audio compression
  if (trackPaths.length > 0) {
    queueBackgroundCompression(trackPaths);
  }

  return {
    status: "ok",
    album: saved
  };
}

/**
 * Fallback: Single multipart upload of an entire album
 */
export async function handleSingleAlbumUpload(body: any, files: Express.Multer.File[]) {
  if (!files || files.length === 0) {
    throw new Error("No files uploaded");
  }

  let artistName = (body.artistName || "").toString().trim();
  let albumName = (body.albumName || "").toString().trim();

  // Deduce from path if available
  if (!albumName) {
    const firstRel = files[0].originalname || "";
    if (firstRel.includes("/")) {
      const parts = firstRel.split("/")[0];
      if (parts.includes(" - ")) {
        const spl = parts.split(" - ");
        artistName = spl[0].trim();
        albumName = spl.slice(1).join(" - ").trim();
      } else {
        albumName = parts.trim();
      }
    }
  }

  artistName = (artistName || "NEPOZNATI IZVOĐAČ").toUpperCase();
  albumName = (albumName || "NOVI ALBUM").toUpperCase();

  const folderName = sanitizeFolderName(artistName, albumName);
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
    throw new Error("No valid audio files found");
  }

  let coverPath = "";
  let customCoverDataUrl = "";

  if (coverFile) {
    const timestamp = Date.now();
    const ext = (path.extname(coverFile.originalname) || ".jpg").toLowerCase();
    const coverFileName = `cover_${timestamp}${ext}`;
    const targetCover = path.join(targetDir, coverFileName);
    
    // Cleanup old covers
    try {
      const filesInDir = await fsPromises.readdir(targetDir);
      for (const f of filesInDir) {
        if (f.startsWith("cover_") || f === "folder.jpg" || f === "folder.png") {
          await fsPromises.unlink(path.join(targetDir, f)).catch(() => {});
        }
      }
    } catch (_) {}

    await fsPromises.copyFile(coverFile.path, targetCover);
    coverPath = `Vinyl Collection/${folderName}/${coverFileName}`;

    if (isR2Configured()) {
      try {
        const coverBuf = await fsPromises.readFile(targetCover);
        const r2Res = await uploadBufferToR2(`Vinyl Collection/${folderName}/${coverFileName}`, coverBuf);
        coverPath = r2Res.publicUrl;
        console.log(`[R2] Single-upload cover uploaded to Cloudflare R2: ${r2Res.publicUrl}`);
      } catch (r2Err: any) {
        console.warn("[R2] Cloudflare R2 cover notice:", r2Err?.message);
      }
    }

    try {
      const buf = await fsPromises.readFile(targetCover);
      const mime = ext === ".png" ? "image/png" : "image/jpeg";
      customCoverDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    } catch (_) {}
  }

  const trackNames: string[] = [];
  const trackPaths: string[] = [];

  audioFiles.sort((a, b) => a.originalname.localeCompare(b.originalname, undefined, { numeric: true }));

  for (const file of audioFiles) {
    const outFileName = sanitizeTrackFileName(file.originalname);
    const finalOutPath = path.join(targetDir, outFileName);

    await fsPromises.copyFile(file.path, finalOutPath);
    trackNames.push(outFileName);
    trackPaths.push(finalOutPath);

    if (isR2Configured()) {
      try {
        await uploadFileToR2(`Vinyl Collection/${folderName}/${outFileName}`, finalOutPath);
        console.log(`[R2] Uploaded track to Cloudflare R2: ${outFileName}`);
      } catch (r2Err: any) {
        console.warn("[R2] Cloudflare R2 single track notice:", r2Err?.message);
      }
    }
  }

  // Cleanup temp files
  for (const f of files) {
    try { await fsPromises.unlink(f.path); } catch (_) {}
  }

  const newOrder = await getNextPrependOrder();
  const albumDocId = `Vinyl_Collection_${folderName}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  let singleAlbumFolder = `Vinyl Collection/${folderName}`;
  if (isR2Configured()) {
    const r2Conf = getR2Config();
    if (r2Conf.publicUrl) {
      const base = r2Conf.publicUrl.trim().replace(/\/$/, "");
      singleAlbumFolder = `${base}/Vinyl Collection/${folderName}`;
    }
  }

  const albumRecord: AlbumRecord = {
    id: albumDocId,
    name: albumName,
    author: artistName,
    folder: singleAlbumFolder,
    cover: coverPath,
    tracks: trackNames,
    color: (body.color && /^#[0-9A-Fa-f]{3,6}$/.test(body.color) && body.color.toLowerCase() !== "#1a1a1a") ? body.color : getRandomMediumColor(),
    genre: body.genre || "ROCK",
    year: body.year || "",
    order: newOrder,
    createdAt: new Date().toISOString()
  };

  if (customCoverDataUrl) {
    albumRecord.customCover = customCoverDataUrl;
    albumRecord.useCustomCover = true;
  }

  const saved = await saveAlbum(albumRecord);

  if (trackPaths.length > 0) {
    queueBackgroundCompression(trackPaths);
  }

  return {
    status: "ok",
    album: saved
  };
}

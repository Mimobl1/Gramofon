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
    const ext = (path.extname(coverFile.originalname) || ".jpg").toLowerCase();
    const targetCover = path.join(targetDir, `folder${ext}`);
    try {
      await fsPromises.copyFile(coverFile.path, targetCover);
    } catch (fsErr: any) {
      console.warn("[Upload] Note: could not write local cover copy (read-only disk):", fsErr?.message);
    }

    coverPath = `Vinyl Collection/${folderName}/folder${ext}`;

    if (!customCoverDataUrl) {
      try {
        const buf = await fsPromises.readFile(coverFile.path).catch(() => fsPromises.readFile(targetCover));
        if (buf && buf.length <= 800 * 1024) {
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
    throw new Error("No audio tracks found for this album");
  }

  const newOrder = await getNextPrependOrder();
  const albumDocId = `Vinyl_Collection_${safeFolder}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  const finalColor = (color && /^#[0-9A-Fa-f]{3,6}$/.test(color)) ? color : "#1a1a1a";

  const albumRecord: AlbumRecord = {
    id: albumDocId,
    name: (albumName || safeFolder).toString().trim().toUpperCase(),
    author: (artistName || "NEPOZNATI IZVOĐAČ").toString().trim().toUpperCase(),
    folder: `Vinyl Collection/${safeFolder}`,
    cover: coverPath || "",
    tracks: trackNames,
    color: finalColor,
    genre: genre || "ROCK",
    year: year || "",
    order: newOrder,
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
    const ext = (path.extname(coverFile.originalname) || ".jpg").toLowerCase();
    const targetCover = path.join(targetDir, `folder${ext}`);
    await fsPromises.copyFile(coverFile.path, targetCover);
    coverPath = `Vinyl Collection/${folderName}/folder${ext}`;

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
  }

  // Cleanup temp files
  for (const f of files) {
    try { await fsPromises.unlink(f.path); } catch (_) {}
  }

  const newOrder = await getNextPrependOrder();
  const albumDocId = `Vinyl_Collection_${folderName}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  const albumRecord: AlbumRecord = {
    id: albumDocId,
    name: albumName,
    author: artistName,
    folder: `Vinyl Collection/${folderName}`,
    cover: coverPath,
    tracks: trackNames,
    color: (body.color && /^#[0-9A-Fa-f]{3,6}$/.test(body.color)) ? body.color : "#1a1a1a",
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

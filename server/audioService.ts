import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { updateCollection } from "../update-collection.js";

const execFileAsync = promisify(execFile);
const TMP_DIR = path.join(process.cwd(), "tmp_uploads");

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * Sanitizes folder names while preserving Unicode international characters (e.g. Serbian Latin Č, Ć, Ž, Š, Đ)
 */
export function sanitizeFolderName(artistName: string, albumName: string): string {
  const safeArtist = (artistName || "UNKNOWN ARTIST")
    .trim()
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ");

  const safeAlbum = (albumName || "NEW ALBUM")
    .trim()
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ");

  return `${safeArtist} - ${safeAlbum}`;
}

/**
 * Sanitizes track filename safely
 */
export function sanitizeTrackFileName(fileName: string): string {
  const parsed = path.parse(fileName);
  const cleanBase = parsed.name
    .replace(/[<>:"/\\|?*]/g, "_")
    .trim() || "track";
  
  const ext = (parsed.ext || ".mp3").toLowerCase();
  return `${cleanBase}${ext}`;
}

/**
 * Gets audio duration via ffprobe
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ]);
    const d = parseFloat(stdout.trim());
    return isNaN(d) || d <= 0 ? 210 : d;
  } catch (e) {
    return 210;
  }
}

/**
 * Compresses an audio file safely into TMP_DIR first to prevent temporary file leakage
 */
export async function compressAudioSafely(filePath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(filePath)) return false;
    const stat = await fsPromises.stat(filePath);
    const sizeMb = stat.size / (1024 * 1024);

    // Skip if already small enough
    if (filePath.toLowerCase().endsWith(".mp3") && sizeMb <= 8.5) {
      return false;
    }

    const duration = await getAudioDuration(filePath);

    // Target ~6.5MB
    let chosenBitrate = 192;
    const targetKbps = Math.floor((6.5 * 1024 * 1024 * 8) / (Math.max(duration, 30) * 1000));

    if (targetKbps >= 240 && duration <= 220) chosenBitrate = 224;
    else if (targetKbps >= 180) chosenBitrate = 192;
    else if (targetKbps >= 145) chosenBitrate = 160;
    else if (targetKbps >= 120) chosenBitrate = 128;
    else chosenBitrate = 112;

    const tempFileName = `compress_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.mp3`;
    const tempOut = path.join(TMP_DIR, tempFileName);

    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", filePath,
        "-vn",
        "-ar", "44100",
        "-ac", "2",
        "-b:a", `${chosenBitrate}k`,
        tempOut
      ]);

      const newStat = await fsPromises.stat(tempOut);
      if (newStat.size > 0) {
        // Atomic copy over original file
        await fsPromises.copyFile(tempOut, filePath);
        await fsPromises.unlink(tempOut).catch(() => {});
        console.log(`[AudioService] Compressed ${path.basename(filePath)} (${sizeMb.toFixed(2)}MB -> ${(newStat.size / (1024 * 1024)).toFixed(2)}MB)`);
        return true;
      }
    } catch (ffmpegErr) {
      await fsPromises.unlink(tempOut).catch(() => {});
      console.warn(`[AudioService] Compression failed for ${filePath}:`, ffmpegErr);
    }
  } catch (err) {
    console.warn(`[AudioService] Error during compression:`, err);
  }
  return false;
}

/**
 * Compresses multiple tracks in the background asynchronously
 */
export function queueBackgroundCompression(trackPaths: string[]): void {
  (async () => {
    try {
      let anyChanged = false;
      for (const p of trackPaths) {
        const changed = await compressAudioSafely(p);
        if (changed) anyChanged = true;
      }
      if (anyChanged) {
        await updateCollection().catch(() => {});
      }
    } catch (err) {
      console.error("[AudioService] Background compression error:", err);
    }
  })();
}

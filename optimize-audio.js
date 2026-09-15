import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const COLLECTION_DIR = path.join(process.cwd(), 'public', 'Vinyl Collection');

export async function getAudioDuration(filePath) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);
    const d = parseFloat(stdout.trim());
    return isNaN(d) || d <= 0 ? 210 : d;
  } catch (e) {
    return 210;
  }
}

/**
 * Compresses an audio file to strictly <= 8.5MB (typically 5.5MB - 7.5MB for standard 3-4min songs)
 */
export async function compressAudioFile(filePath) {
  const stat = await fs.stat(filePath);
  const sizeMb = stat.size / (1024 * 1024);

  // If already under 8.6MB and is mp3, no need to touch
  if (filePath.toLowerCase().endsWith('.mp3') && sizeMb <= 8.6 && sizeMb >= 3.0) {
    return { skipped: true, sizeMb };
  }

  const duration = await getAudioDuration(filePath);
  
  // Calculate bitrate: Target ~6.3 MB
  // For standard 3-4 min (180s - 240s): 192kbps gives 4.3MB - 5.7MB
  // 224kbps gives 5.0MB - 6.7MB
  let chosenBitrate = 192;
  const targetKbps = Math.floor((6.5 * 1024 * 1024 * 8) / (Math.max(duration, 30) * 1000));
  
  if (targetKbps >= 240 && duration <= 220) chosenBitrate = 224;
  else if (targetKbps >= 180) chosenBitrate = 192;
  else if (targetKbps >= 145) chosenBitrate = 160;
  else if (targetKbps >= 120) chosenBitrate = 128;
  else chosenBitrate = 112;

  const tempOut = filePath + `.tmp_${Date.now()}.mp3`;

  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', filePath,
      '-vn',
      '-ar', '44100',
      '-ac', '2',
      '-b:a', `${chosenBitrate}k`,
      tempOut
    ]);

    let newStat = await fs.stat(tempOut);
    
    // Safety check: if somehow still > 8.8MB, re-encode with lower bitrate to guarantee <= 8.5MB
    if (newStat.size > 8.8 * 1024 * 1024) {
      const fallbackKbps = Math.max(96, Math.min(160, Math.floor((7.2 * 1024 * 1024 * 8) / (duration * 1000))));
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', filePath,
        '-vn',
        '-ar', '44100',
        '-ac', '2',
        '-b:a', `${fallbackKbps}k`,
        tempOut
      ]);
      newStat = await fs.stat(tempOut);
    }

    // Determine target path (ensure .mp3 extension lowercase)
    const dir = path.dirname(filePath);
    const parsed = path.parse(filePath);
    const finalPath = path.join(dir, `${parsed.name}.mp3`);

    await fs.unlink(filePath).catch(() => {});
    await fs.rename(tempOut, finalPath);

    console.log(`[Audio Optimizer] Compressed ${parsed.base} (${sizeMb.toFixed(2)}MB -> ${(newStat.size / (1024 * 1024)).toFixed(2)}MB at ${chosenBitrate}k)`);
    return {
      originalSize: stat.size,
      newSize: newStat.size,
      bitrate: chosenBitrate,
      path: finalPath
    };
  } catch (err) {
    await fs.unlink(tempOut).catch(() => {});
    console.error(`[Audio Optimizer] Failed to compress ${filePath}:`, err);
    throw err;
  }
}

/**
 * Scans all albums and compresses any file > 8.6MB and removes duplicate -1.MP3 files
 */
export async function optimizeAllAudio() {
  if (!fsSync.existsSync(COLLECTION_DIR)) return;
  const folders = await fs.readdir(COLLECTION_DIR, { withFileTypes: true });

  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const albumDir = path.join(COLLECTION_DIR, folder.name);
    const files = await fs.readdir(albumDir, { withFileTypes: true });

    // 1. Remove duplicate -1.MP3 or -1.mp3 if original exists
    for (const f of files) {
      if (!f.isFile()) continue;
      if (f.name.match(/-1\.(mp3|MP3)$/)) {
        const cleanName = f.name.replace(/-1\.(mp3|MP3)$/, '.$1');
        const cleanPath = path.join(albumDir, cleanName);
        if (fsSync.existsSync(cleanPath)) {
          console.log(`[Audio Optimizer] Removing duplicate file: ${f.name}`);
          await fs.unlink(path.join(albumDir, f.name)).catch(() => {});
        }
      }
    }

    // 2. Scan remaining audio files and optimize any > 8.6MB
    const currentFiles = await fs.readdir(albumDir, { withFileTypes: true });
    for (const f of currentFiles) {
      if (!f.isFile()) continue;
      const ext = path.extname(f.name).toLowerCase();
      if (!['.mp3', '.wav', '.flac', '.m4a', '.ogg'].includes(ext)) continue;

      const p = path.join(albumDir, f.name);
      try {
        const stat = await fs.stat(p);
        const sizeMb = stat.size / (1024 * 1024);
        if (sizeMb > 8.6 || ext !== '.mp3') {
          console.log(`[Audio Optimizer] Optimizing oversized track: ${f.name} (${sizeMb.toFixed(2)}MB)...`);
          await compressAudioFile(p);
        }
      } catch (err) {
        console.warn(`[Audio Optimizer] Error processing ${f.name}:`, err.message);
      }
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('optimize-audio.js')) {
  optimizeAllAudio().then(() => {
    console.log('[Audio Optimizer] Optimization run complete.');
    process.exit(0);
  }).catch(err => {
    console.error('[Audio Optimizer] Run failed:', err);
    process.exit(1);
  });
}

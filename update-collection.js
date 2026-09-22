import fs from 'fs/promises';
import path from 'path';
import { optimizeAllAudio } from './optimize-audio.js';
import { getR2Client, getR2Config, isR2Configured } from './server/r2Service.js';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

const COLLECTION_DIR = path.join(process.cwd(), 'public', 'Vinyl Collection');
const MANIFEST_PATH = path.join(process.cwd(), 'public', 'vinyl-collection.json');
const JS_MANIFEST_PATH = path.join(process.cwd(), 'public', 'collection-data.js');
// ... (rest of the file - I need to keep the file content intact, just changing the function)

function hslToHex(h, s, l) {
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

function getRandomMediumColor() {
  const hue = Math.floor(Math.random() * 360);
  const sat = Math.floor(Math.random() * 26) + 25; // 25..50% (slightly desaturated)
  const light = Math.floor(Math.random() * 21) + 22; // 22..42% (slightly darker shades)
  return hslToHex(hue, sat, light);
}

async function updateCollection() {
  try {
    // Read the existing collection to preserve colors if possible
    let existingCollection = [];
    try {
      const data = await fs.readFile(MANIFEST_PATH, 'utf-8');
      existingCollection = JSON.parse(data);
    } catch (e) {
      console.log('No existing vinyl-collection.json found, creating a new one.');
    }

    const collectionMap = new Map();
    existingCollection.forEach(album => {
      collectionMap.set(album.folder, album);
    });

    const newCollection = [];

    // Ensure COLLECTION_DIR exists
    try {
      await fs.mkdir(COLLECTION_DIR, { recursive: true });
    } catch (_) {}

    // Read directories in Vinyl Collection safely
    let items = [];
    try {
      items = await fs.readdir(COLLECTION_DIR, { withFileTypes: true });
    } catch (readErr) {
      console.warn(`[update-collection] Warning reading ${COLLECTION_DIR}:`, readErr?.message);
    }

    const dirItems = items.filter(item => item.isDirectory());

    // If there are no album directories on disk, preserve existing collection
    if (dirItems.length === 0 && existingCollection.length > 0) {
      console.log(`[update-collection] No album directories found on disk. Preserving existing manifest with ${existingCollection.length} album(s).`);
      await fs.writeFile(JS_MANIFEST_PATH, `window.VINYL_COLLECTION = ${JSON.stringify(existingCollection, null, 2)};\n`, 'utf-8');
      return existingCollection;
    }
    
    for (const item of dirItems) {
        const albumFolderName = item.name;
        const albumFolderPath = path.join(COLLECTION_DIR, albumFolderName);
        const folderRelativePath = `Vinyl Collection/${albumFolderName}`;
        
        // Parse author and name from folder name "Author - Album"
        let author = "UNKNOWN ARTIST";
        let name = albumFolderName.toUpperCase();
        let shouldRenameFolder = false;
        let newAlbumFolderName = albumFolderName;
        
        if (albumFolderName.includes(' - ')) {
          const parts = albumFolderName.split(' - ');
          author = parts[0].trim().toUpperCase();
          name = parts.slice(1).join(' - ').trim().toUpperCase();
        } else {
          // Add spaces before capitals for PascalCase names
          const formatted = albumFolderName
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_.]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
          name = formatted;
          author = "UNKNOWN ARTIST";
          shouldRenameFolder = true;
          newAlbumFolderName = `Unknown Artist - ${formatted}`;
        }

        // Rename folder if needed
        let finalFolderPath = albumFolderPath;
        let finalRelativePath = folderRelativePath;
        if (shouldRenameFolder) {
          try {
            const newFolderPath = path.join(COLLECTION_DIR, newAlbumFolderName);
            await fs.rename(albumFolderPath, newFolderPath);
            finalFolderPath = newFolderPath;
            finalRelativePath = `Vinyl Collection/${newAlbumFolderName}`;
            console.log(`Renamed poorly named folder: "${albumFolderName}" -> "${newAlbumFolderName}"`);
          } catch (e) {
            console.error(`Could not rename folder ${albumFolderName}`, e);
          }
        }

        // Read files in the album folder
        const albumFiles = await fs.readdir(finalFolderPath, { withFileTypes: true });
        
        const tracks = [];
        let cover = "";

        for (const file of albumFiles) {
          if (file.isFile()) {
            const ext = path.extname(file.name).toLowerCase();
            // Audio files
            if (['.mp3', '.wav', '.flac', '.m4a', '.ogg'].includes(ext)) {
              // Ignore files starting with ._ or .DS_Store
              if (!file.name.startsWith('._') && !file.name.startsWith('.DS_Store') && !file.name.startsWith('-1.DS_Store')) {
                tracks.push(file.name);
              }
            }
            // Cover images
            if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
              if (file.name.toLowerCase().includes('cover') || file.name.toLowerCase().includes('front') || file.name.toLowerCase().includes('folder')) {
                cover = `${finalRelativePath}/${file.name}`;
              } else if (!cover && !file.name.startsWith('__ia_thumb') && !file.name.startsWith('._')) {
                // Fallback to any image if no cover-like name
                cover = `${finalRelativePath}/${file.name}`;
              }
            }
          }
        }
        
        // Sort tracks alphabetically
        tracks.sort();

        // Get existing album data or create new
        const existingAlbum = collectionMap.get(finalRelativePath) || collectionMap.get(folderRelativePath);
        
        const albumData = {
          id: existingAlbum?.id || `Vinyl_Collection_${newAlbumFolderName || albumFolderName}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
          name: existingAlbum?.name || name,
          author: existingAlbum?.author || author,
          color: existingAlbum?.color || getRandomMediumColor(),
          duration: existingAlbum?.duration || "",
          folder: finalRelativePath,
          cover: existingAlbum?.cover && existingAlbum.cover !== "" ? existingAlbum.cover : cover,
          customCover: existingAlbum?.customCover || "",
          useCustomCover: existingAlbum?.useCustomCover !== undefined ? existingAlbum.useCustomCover : (!!existingAlbum?.customCover),
          genre: existingAlbum?.genre || "ROCK",
          year: existingAlbum?.year || "",
          order: typeof existingAlbum?.order === "number" ? existingAlbum.order : newCollection.length,
          tracks: tracks,
          _uid: finalRelativePath
        };

        newCollection.push(albumData);
    }

    // Sort collection by order
    newCollection.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Write back to vinyl-collection.json
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(newCollection, null, 2), 'utf-8');
    await fs.writeFile(JS_MANIFEST_PATH, `window.VINYL_COLLECTION = ${JSON.stringify(newCollection, null, 2)};\n`, 'utf-8');
    console.log(`Successfully updated vinyl-collection.json with ${newCollection.length} albums.`);
    return newCollection;
  } catch (err) {
    console.warn('[update-collection] Non-fatal notice updating collection:', err?.message || err);
    return [];
  }
}

export { updateCollection };

async function run() {
  try {
    await updateCollection();
  } catch (err) {
    console.warn('[update-collection] Warning running update collection:', err?.message || err);
  }
  
  if (process.argv.includes('--watch')) {
    console.log(`Watching for changes in ${COLLECTION_DIR}...`);
    let debounceTimer;
    import('fs').then(fsSync => {
      fsSync.watch(COLLECTION_DIR, { recursive: true }, (eventType, filename) => {
        if (filename && !filename.startsWith('.')) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log(`Change detected: ${filename}. Updating collection...`);
            updateCollection();
          }, 1000);
        }
      });
    });
  }
}

if (process.argv[1] && process.argv[1].endsWith('update-collection.js')) {
  run();
}

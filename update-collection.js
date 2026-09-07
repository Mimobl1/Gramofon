import fs from 'fs/promises';
import path from 'path';

const COLLECTION_DIR = path.join(process.cwd(), 'public', 'Vinyl Collection');
const MANIFEST_PATH = path.join(process.cwd(), 'public', 'vinyl-collection.json');
const JS_MANIFEST_PATH = path.join(process.cwd(), 'public', 'collection-data.js');

// Helper to generate a random dark hex color
function getRandomDarkColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 3; i++) {
    // Generate a dark color component (0-7)
    color += letters[Math.floor(Math.random() * 8)];
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
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

    // Read directories in Vinyl Collection
    const items = await fs.readdir(COLLECTION_DIR, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
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
          name: name,
          author: author,
          color: existingAlbum?.color || getRandomDarkColor(),
          duration: existingAlbum?.duration || "",
          folder: finalRelativePath,
          cover: existingAlbum?.cover && existingAlbum.cover !== "" ? existingAlbum.cover : cover,
          tracks: tracks
        };

        newCollection.push(albumData);
      }
    }

    // Write back to vinyl-collection.json
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(newCollection, null, 2), 'utf-8');
    await fs.writeFile(JS_MANIFEST_PATH, `window.VINYL_COLLECTION = ${JSON.stringify(newCollection, null, 2)};`, 'utf-8');
    console.log(`Successfully updated vinyl-collection.json with ${newCollection.length} albums.`);

  } catch (err) {
    console.error('Error updating collection:', err);
  }
}

async function run() {
  await updateCollection();
  
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

run();

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const PALETTE = [
  '#2a2f3a', '#2f2a3a', '#2a3a35', '#3a2f2a',
  '#2a333a', '#3a2a33', '#33362a', '#2a2a2f'
];

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function normalizeAlbumName(name: string): string {
  return name.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function splitArtistAlbum(folderName: string, tracks: string[]) {
  const raw = normalizeAlbumName(folderName);
  if (raw.includes(' - ')) {
    const [a, b] = raw.split(' - ');
    return { author: a.trim().toUpperCase(), album: b.trim().toUpperCase() };
  }
  if (tracks && tracks.length > 0) {
    for (const t of tracks) {
      const stem = path.parse(t).name;
      if (stem.includes(' - ')) {
        const art = stem.split(' - ')[0].trim();
        if (art) return { author: art.toUpperCase(), album: raw.toUpperCase() };
      }
    }
  }
  return { author: 'UNKNOWN ARTIST', album: raw.toUpperCase() || 'UNKNOWN ALBUM' };
}

function generateCollectionManifest(): any[] {
  const collectionDir = path.resolve(__dirname, 'public/Vinyl Collection');
  const manifestPath = path.resolve(__dirname, 'public/vinyl-collection.json');

  if (!fs.existsSync(collectionDir)) {
    return [];
  }

  const entries = fs.readdirSync(collectionDir, { withFileTypes: true });
  const albumFolders = entries
    .filter((e) => e.isDirectory())
    .map((e) => ({
      name: e.name,
      mtime: fs.statSync(path.join(collectionDir, e.name)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .map((e) => e.name);

  const albums: any[] = [];

  for (const folder of albumFolders) {
    const folderPath = path.join(collectionDir, folder);
    const files = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => f.name);

    const tracks = files
      .filter((f) => AUDIO_EXTS.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    if (tracks.length === 0) continue;

    const covers = files
      .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    const cover = covers.length > 0 ? covers[0] : '';
    const { author, album } = splitArtistAlbum(folder, tracks);
    const relFolder = `Vinyl Collection/${folder}`;

    albums.push({
      name: album,
      author: author,
      color: pickColor(`${author}-${album}`),
      duration: '',
      folder: relFolder,
      cover: cover ? `${relFolder}/${cover}` : '',
      tracks: tracks,
    });
  }

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(albums, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error('Failed to write vinyl-collection.json', err);
  }

  return albums;
}

function vinylCollectionPlugin(): Plugin {
  return {
    name: 'vinyl-collection-auto-manifest',
    buildStart() {
      generateCollectionManifest();
    },
    configureServer(server) {
      generateCollectionManifest();
      server.middlewares.use((req, res, next) => {
        const parsedUrl = req.url ? req.url.split('?')[0] : '';
        if (parsedUrl === '/vinyl-collection.json' || parsedUrl === '/api/collection') {
          const albums = generateCollectionManifest();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.end(JSON.stringify(albums, null, 2));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), vinylCollectionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

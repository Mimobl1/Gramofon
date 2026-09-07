        const COLLECTION_MANIFEST_URL = "vinyl-collection.json";
        const IS_FILE_PROTOCOL = window.location.protocol === "file:";
        const DEFAULT_COLLECTION = [
            {
                "name": "SOB ROCK",
                "author": "JOHN MAYER",
                "color": "#2a2a2f",
                "duration": "",
                "folder": "Vinyl Collection/John Mayer - Sob Rock",
                "cover": "Vinyl Collection/John Mayer - Sob Rock/cover.jpg",
                "tracks": [
                    "01. Last Train Home.mp3",
                    "02. Shouldn't Matter but It Does.mp3",
                    "03. New Light.mp3",
                    "05. Wild Blue.mp3",
                    "06. Shot in the Dark.mp3",
                    "07. I Guess I Just Feel Like.mp3",
                    "10. All I Want Is to Be With You.mp3"
                ]
            },
            {
                "name": "SAMPLE ALBUM",
                "author": "LOREM IPSUM",
                "color": "#3a2f2a",
                "duration": "",
                "folder": "Vinyl Collection/Lorem Ipsum - Sample album",
                "cover": "",
                "tracks": [
                    "Together Again.mp3"
                ]
            },
            {
                "name": "TOGETHER AGAIN",
                "author": "RAY CHARLES",
                "color": "#2f2a3a",
                "duration": "",
                "folder": "Vinyl Collection/Ray Charles - Together Again",
                "cover": "",
                "tracks": [
                    "Charles, Ray (1965) - Together Again, side A (archive)-01.mp3",
                    "Charles, Ray (1965) - Together Again, side A (archive)-02.mp3",
                    "Charles, Ray (1965) - Together Again, side A (archive)-04.mp3",
                    "Charles, Ray (1965) - Together Again, side A (archive)-06.mp3",
                    "Charles, Ray (1965) - Together Again, side B (archive)-04.mp3",
                    "Charles, Ray (1965) - Together Again, side B (archive)-05.mp3",
                    "Charles, Ray (1965) - Together Again, side B (archive)-06.mp3"
                ]
            },
            {
                "name": "STEAK DINNER",
                "author": "T-BONE WALKER",
                "color": "#2a2f3a",
                "duration": "",
                "folder": "Vinyl Collection/T-Bone Walker - Steak Dinner",
                "cover": "",
                "tracks": [
                    "01 Hard Times.mp3",
                    "02 All Night Long.mp3",
                    "03 Stormy Monday Blues 8.mp3",
                    "04 Please Come Back To Me.mp3",
                    "07 Louisiana Bayou Drive.mp3"
                ]
            },
            {
                "name": "RUBBER SOUL",
                "author": "THE BEATLES",
                "color": "#3a2f2a",
                "duration": "",
                "folder": "Vinyl Collection/The Beatles - Rubber Soul",
                "cover": "Vinyl Collection/The Beatles - Rubber Soul/folder.jpg",
                "tracks": [
                    "01. Drive My Car.mp3",
                    "02. Norwegian Wood (This Bird Has Flown).mp3",
                    "03. You Won't See Me.mp3",
                    "04. Nowhere Man.mp3",
                    "05. Think For Yourself.mp3",
                    "07. Michelle.mp3",
                    "08. What Goes On.mp3",
                    "10. I'm Looking Through You.mp3",
                    "11. In My Life.mp3",
                    "12. Wait.mp3"
                ]
            },
            {
                "name": "MORRISON HOTEL",
                "author": "THE DOORS",
                "color": "#33362a",
                "duration": "",
                "folder": "Vinyl Collection/The Doors - Morrison Hotel",
                "cover": "",
                "tracks": [
                    "The Doors - Blue Sunday.MP3",
                    "The Doors - Indian Summer.MP3",
                    "The Doors - Land Ho!.MP3",
                    "The Doors - Peace Frog.MP3",
                    "The Doors - Queen Of The Highway.MP3",
                    "The Doors - Roadhouse Blues.MP3",
                    "The Doors - Ship Of Fools.MP3",
                    "The Doors - The Spy.MP3",
                    "The Doors - Waiting For The Sun.MP3"
                ]
            }
        ];
        let originalCollection = [];
        let collection = [];
        let activeGenre = "ALL";

        let scene, camera, renderer, groups = [];
        const DISK_LAYER = 1; 

        const scrollSensitivity = 850; 
        let totalMeshes = 0;
        let maxScroll = 0;

        let targetScroll = 0;
        let currentScroll = 0;
        let lastIndex = 0; 
        let interactiveIndex = -1; 
        let openStates = [];
        let pendingOpenIndex = -1; 
        let isHovered = false;
        let launchIndex = -1;
        let launchStartMs = 0;
        let launchTargetUrl = "";
        let launchSelectedPayload = null;
        let launchNavigated = false;
        let playingIndex = -1;
        let hasLoadedRecord = false;
        const LAUNCH_MS = 620;
        const WARM_FLAG_KEY = "vinyl_assets_warmed_v1";
        const PLAYING_INDEX_KEY = "archive_playing_index_v1";
        const SCROLL_STATE_KEY = "archive_scroll_state_v1";
        const SELECTED_ALBUM_KEY = "vinyl_selected_album_v1";
        const ARCHIVE_ALBUMS_KEY = "vinyl_archive_albums_v1";
        const ALBUM_DURATION_CACHE_KEY = "vinyl_album_duration_cache_v1";
        const PLAYBACK_STATE_KEY = "vinyl_player_playback_state_v1";
        const RECORD_LOADED_KEY = "vinyl_record_loaded_v1";
        const FEEDBACK_DELAY_MS = 30000;
        const routeFade = document.getElementById('route-fade');
        const EMBEDDED = new URLSearchParams(window.location.search).get("embedded") === "1";
        const archiveDeck = new Audio();
        archiveDeck.preload = "metadata";
        let bgBridge = {
            active: false,
            currentSide: "A",
            currentTrackIndex: 0,
            sideDurations: {A:1175,B:1410},
            base: 1,
            albumName: "",
            tracks: [],
            sideSplit: 0
        };

        // Touch varijable
        let touchStartY = 0;
        let isTouchMove = false;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const playBtn = document.getElementById('play-button');
        const nowPlayingBadge = document.getElementById('now-playing-badge');
        const playerNavLink = document.getElementById('playerNavLink');
        

        

        async function ensureArchiveFontsReady() {
            if (!document.fonts || !document.fonts.load) return;
            const loads = [
                document.fonts.load("300 16px Roboto"),
                document.fonts.load("400 16px Roboto"),
                document.fonts.load("700 16px Roboto"),
                document.fonts.load("900 16px Roboto")
            ];
            const timeout = new Promise((resolve) => setTimeout(resolve, 1200));
            await Promise.race([Promise.all(loads), timeout]);
        }

        function normalizeCollectionItem(item) {
            if (!item || typeof item !== "object") return null;
            const tracks = Array.isArray(item.tracks) ? item.tracks : [];
            return {
                name: String(item.name || "UNKNOWN ALBUM").toUpperCase(),
                author: String(item.author || "UNKNOWN ARTIST").toUpperCase(),
                color: String(item.color || ""),
                duration: String(item.duration || ""),
                folder: String(item.folder || ""),
                cover: String(item.cover || ""),
                tracks: tracks
            };
        }

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

        function uniqueAlbumColorByIndex(index) {
            const i = Math.max(0, Number(index) || 0);
            // Unique dark tint per album with stronger saturation.
            const hue = (i * 137.50776405 + 210) % 360;
            let sat = 42 + ((i * 13) % 20);      // 42..61
            if ((hue >= 160 && hue <= 260) || (hue >= 80 && hue <= 155)) sat += 8;
            sat = Math.min(70, sat);
            const light = 20 + ((i * 7) % 8);    // 20..27
            return hslToHex(hue, sat, light);
        }

        function applyCollectionData(data) {
            const normalized = Array.isArray(data) ? data.map(normalizeCollectionItem).filter(Boolean) : [];
            let overrides = {};
            try {
                overrides = JSON.parse(localStorage.getItem('vinyl_album_overrides_v1')) || {};
            } catch(e) {}
            
            originalCollection = normalized.map((item, idx) => {
                const folderKey = item.folder;
                const folderOverrides = overrides[folderKey] || {};
                return {
                    ...item,
                    color: folderOverrides.color || uniqueAlbumColorByIndex(idx),
                    name: folderOverrides.name || item.name,
                    author: folderOverrides.author || item.author,
                    genre: folderOverrides.genre || item.genre || "",
                    year: folderOverrides.year || item.year || ""
                };
            });
            filterCollection();
        }

        function filterCollection() {
            if (activeGenre === "ALL") {
                collection = [...originalCollection];
            } else {
                collection = originalCollection.filter(item => 
                    (item.genre && item.genre.toUpperCase() === activeGenre) || item.name.includes(activeGenre) || item.author.includes(activeGenre) || item.folder.toUpperCase().includes(activeGenre)
                );
            }
            totalMeshes = collection.length;
            maxScroll = Math.max(0, (totalMeshes - 1) * scrollSensitivity);
            openStates = new Array(totalMeshes).fill(false);
            targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
            currentScroll = Math.max(0, Math.min(maxScroll, currentScroll));
            
            if (scene) {
                rebuildMeshes();
            }
        }
        
        function rebuildMeshes() {
            groups.forEach(g => scene.remove(g));
            groups = [];
            
            const coverGeo = new THREE.BoxGeometry(6, 6, 0.12);
            coverGeo.translate(0, 4, 0);
            const sharedDiskNormalMap = generateVinylNormalMap(1024);

            for (let i = 0; i < totalMeshes; i++) {
                const group = new THREE.Group();
                const item = collection[i];
                const texture = generateCoverTexture(item, 1024);
                
                const material = new THREE.MeshStandardMaterial({ 
                    map: texture, 
                    roughness: 0.5, 
                    metalness: 0.65,
                    transparent: true 
                });
                const edgeMat = new THREE.MeshStandardMaterial({ 
                    color: new THREE.Color(item.color), 
                    roughness: 0.5, 
                    metalness: 0.65,
                    transparent: true 
                });
                
                const cover = new THREE.Mesh(coverGeo, [edgeMat, edgeMat, edgeMat, edgeMat, material, material]);
                cover.name = "cover";
                const disk = createVinylDisk(item, sharedDiskNormalMap);
                disk.position.set(0, 4, -0.05);
                
                group.add(disk);
                group.add(cover);
                group.userData = { 
                    index: i, 
                    openProgress: 0, 
                    openAmount: 0,   
                    hoverVal: 0,
                    tiltX: 0
                };
                scene.add(group);
                groups.push(group);
            }
            lastIndex = -1; // force update of UI
        }

        function parseHrefList(html) {
            const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
            const out = [];
            Array.from(doc.querySelectorAll("a[href]")).forEach((a) => {
                const rawHref = a.getAttribute("href");
                if (!rawHref) return;
                const href = String(rawHref).split("#")[0].split("?")[0];
                if (!href) return;
                if (href.startsWith("?") || href.startsWith("#")) return;
                if (href === "../" || href === "..") return;
                out.push(decodeURIComponent(href));
            });
            return out;
        }

        function deriveMetaFromFolder(folderName) {
            const clean = String(folderName || "").trim();
            const parts = clean.split(" - ").map((s) => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                return { author: parts[0].toUpperCase(), name: parts.slice(1).join(" - ").toUpperCase() };
            }
            return { author: "UNKNOWN ARTIST", name: clean.toUpperCase() || "UNKNOWN ALBUM" };
        }

        function hashString(str) {
            let h = 2166136261 >>> 0;
            const s = String(str || "");
            for (let i = 0; i < s.length; i += 1) {
                h ^= s.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            return h >>> 0;
        }

        function pickAlbumColor(inputColor, seedKey) {
            const c = String(inputColor || "").trim();
            if (/^#[0-9a-f]{3}$/i.test(c) || /^#[0-9a-f]{6}$/i.test(c)) {
                return c;
            }
            const idx = hashString(seedKey);
            return uniqueAlbumColorByIndex(idx);
        }

        async function fetchTextSafe(path) {
            try {
                const res = await fetch(encodeURI(path), { cache: "no-store" });
                if (!res.ok) return null;
                return await res.text();
            } catch (_) {
                return null;
            }
        }

        async function scanCollectionFolderAlbums() {
            const roots = ["Vinyl Collection", "collection", "Collection"];
            let root = "";
            let rootHtml = null;
            for (const r of roots) {
                const html = await fetchTextSafe(`${r}/`);
                if (html) {
                    root = r;
                    rootHtml = html;
                    break;
                }
            }
            if (!root || !rootHtml) return [];

            const AUDIO_RE = /\.(mp3|flac|wav|m4a|aac|ogg)$/i;
            const foundAudio = [];
            const visitedDirs = new Set();

            const walkDir = async (relativeDir, depth = 0) => {
                if (depth > 5) return;
                const dirPath = relativeDir ? `${root}/${relativeDir}` : root;
                const key = dirPath.toLowerCase();
                if (visitedDirs.has(key)) return;
                visitedDirs.add(key);

                const listing = relativeDir ? await fetchTextSafe(`${dirPath}/`) : rootHtml;
                if (!listing) return;
                const entries = parseHrefList(listing);
                for (const entry of entries) {
                    const clean = String(entry || "").replace(/^\.?\//, "").replace(/\/+$/g, "");
                    if (!clean || clean === "." || clean === "..") continue;
                    const nextRelative = relativeDir ? `${relativeDir}/${clean}` : clean;
                    if (/\/$/.test(entry)) {
                        await walkDir(nextRelative, depth + 1);
                        continue;
                    }
                    if (AUDIO_RE.test(clean)) {
                        foundAudio.push(nextRelative);
                    }
                }
            };

            await walkDir("", 0);

            const grouped = new Map();
            for (const relPath of foundAudio) {
                const bits = relPath.split("/").filter(Boolean);
                if (!bits.length) continue;
                const folderName = bits[0];
                const trackRel = bits.slice(1).join("/") || bits[0];
                if (!grouped.has(folderName)) grouped.set(folderName, []);
                grouped.get(folderName).push(trackRel);
            }

            const albums = [];
            for (const [folderName, tracksRaw] of grouped.entries()) {
                const tracks = tracksRaw
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
                if (!tracks.length) continue;
                const meta = deriveMetaFromFolder(folderName);
                albums.push({
                    name: meta.name,
                    author: meta.author,
                    color: pickAlbumColor("", folderName),
                    duration: "",
                    folder: `${root}/${folderName}`,
                    cover: "",
                    tracks
                });
            }
            albums.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
            return albums;
        }

        function formatDuration(totalSeconds) {
            const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
            const hh = Math.floor(s / 3600);
            const mm = Math.floor((s % 3600) / 60);
            const ss = s % 60;
            if (hh > 0) {
                return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
            }
            return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
        }

        function getDurationCache() {
            try {
                const raw = localStorage.getItem(ALBUM_DURATION_CACHE_KEY);
                const parsed = raw ? JSON.parse(raw) : {};
                return parsed && typeof parsed === "object" ? parsed : {};
            } catch (_) {
                return {};
            }
        }

        function setDurationCache(map) {
            try {
                localStorage.setItem(ALBUM_DURATION_CACHE_KEY, JSON.stringify(map || {}));
            } catch (_) {}
        }

        function readAudioDuration(url) {
            return new Promise((resolve) => {
                const a = document.createElement("audio");
                const done = (dur) => {
                    a.removeAttribute("src");
                    a.load();
                    resolve(Number.isFinite(dur) && dur > 0 ? dur : 0);
                };
                const to = setTimeout(() => done(0), 3000);
                a.preload = "metadata";
                a.onloadedmetadata = () => {
                    clearTimeout(to);
                    done(a.duration);
                };
                a.onerror = () => {
                    clearTimeout(to);
                    done(0);
                };
                a.src = encodeURI(url);
            });
        }

        async function enrichAlbumDurations(albums) {
            if (!Array.isArray(albums) || !albums.length) return albums;
            const cache = getDurationCache();
            for (const album of albums) {
                if (!album || !album.folder || !Array.isArray(album.tracks)) continue;
                const key = `${album.folder}::${album.tracks.length}`;
                if (cache[key]) {
                    album.duration = cache[key];
                    continue;
                }
                let total = 0;
                for (const t of album.tracks) {
                    const fullPath = `${album.folder}/${t}`;
                    total += await readAudioDuration(fullPath);
                }
                const formatted = formatDuration(total);
                if (formatted) {
                    album.duration = formatted;
                    cache[key] = formatted;
                }
            }
            setDurationCache(cache);
            return albums;
        }

        async function loadCollectionManifest() {
            if (window.VINYL_COLLECTION && Array.isArray(window.VINYL_COLLECTION) && window.VINYL_COLLECTION.length > 0) {
                console.log("Loaded collection from window.VINYL_COLLECTION:", window.VINYL_COLLECTION.length, "albums");
                applyCollectionData(window.VINYL_COLLECTION);
                document.querySelector('.archive-title').innerText = "Loaded " + window.VINYL_COLLECTION.length + " albums";
                enrichAlbumDurations(window.VINYL_COLLECTION).catch(err => console.warn("Background enrichment failed:", err));
                return;
            }

            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 10000));
            try {
                console.log("Fetching manifest from:", COLLECTION_MANIFEST_URL);
                const fetchPromise = fetch(`${COLLECTION_MANIFEST_URL}?t=${Date.now()}`, { 
                    cache: "no-store",
                    credentials: "include"
                });
                const res = await Promise.race([fetchPromise, timeoutPromise]);
                
                if (res && res.ok) {
                    const data = await res.json();
                    const parsed = Array.isArray(data) ? data : [];
                    if (parsed.length) {
                        applyCollectionData(parsed);
                        console.log("Collection loaded successfully:", parsed.length, "albums");
                        document.querySelector('.archive-title').innerText = "Loaded " + parsed.length + " albums";
                        enrichAlbumDurations(parsed).catch(err => console.warn("Background enrichment failed:", err));
                        return;
                    } else {
                        document.querySelector('.archive-title').innerText = "ERROR: Parsed array is empty!";
                    }
                } else {
                    console.warn("Manifest fetch timed out or failed");
                    document.querySelector('.archive-title').innerText = "ERROR: Fetch failed (res.ok false)";
                }
            } catch (e) {
                console.warn("Manifest fetch error:", e);
                document.querySelector('.archive-title').innerText = "ERROR: " + e.message;
            }
            console.log("Using default collection as fallback");
            applyCollectionData(DEFAULT_COLLECTION);
        }

        let audioCtx;
        
        const sleeveSound = new Audio("/sfx/Vinyl out sound.mp3");
        sleeveSound.volume = 0.7; 
        sleeveSound.load();

        function playSleeve() {
            try {
                sleeveSound.pause();
                sleeveSound.currentTime = 0;
                sleeveSound.play().catch(e => {});
            } catch(_) {}
        }

        function easeInOutExpo(x) {
            return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
        }
        function easeInCubic(x) {
            return x * x * x;
        }

        function refreshRecordLoadedState() {
            try {
                hasLoadedRecord = localStorage.getItem(RECORD_LOADED_KEY) === "1";
            } catch(_) {
                hasLoadedRecord = false;
            }
            if (!hasLoadedRecord) {
                playingIndex = -1;
            }
        }

        function isPlayingLockedIndex(idx) {
            return hasLoadedRecord && idx === playingIndex;
        }

        function getSelectedAlbumForBridge(){
            try {
                const selected = JSON.parse(localStorage.getItem(SELECTED_ALBUM_KEY) || "null");
                if(selected && Array.isArray(selected.tracks) && selected.tracks.length){
                    return selected;
                }
            } catch(_) {}
            return null;
        }

        function saveBridgePlaybackState(playing){
            if(!bgBridge.active) return;
            const state = {
                powered: true,
                playing: !!playing,
                currentSide: bgBridge.currentSide,
                albumName: bgBridge.albumName,
                base: bgBridge.base || 1,
                elapsedMs: 0,
                rot: 0,
                currentTrackIndex: bgBridge.currentTrackIndex,
                deckCurrentTime: Number.isFinite(archiveDeck.currentTime) ? archiveDeck.currentTime : 0,
                sideDurations: bgBridge.sideDurations,
                savedAtEpochMs: Date.now()
            };
            try { localStorage.setItem(PLAYBACK_STATE_KEY, JSON.stringify(state)); } catch(_) {}
        }

        function sideRangeForBridge(side){
            if(side === "A"){
                return {start:0, end:Math.max(0,bgBridge.sideSplit-1)};
            }
            return {start:bgBridge.sideSplit, end:Math.max(bgBridge.sideSplit,bgBridge.tracks.length-1)};
        }

        function ensureBridgeTrackInSide(){
            const range = sideRangeForBridge(bgBridge.currentSide);
            if(bgBridge.currentTrackIndex < range.start || bgBridge.currentTrackIndex > range.end){
                bgBridge.currentTrackIndex = range.start;
            }
        }

        function setBridgeSourceByIndex(idx){
            const src = bgBridge.tracks[idx];
            if(!src) return;
            const encoded = encodeURI(src);
            const absolute = new URL(encoded, window.location.href).href;
            if(archiveDeck.src !== absolute){
                archiveDeck.src = encoded;
            }
        }

        function startArchiveBridgeFromState(){
            let state = null;
            try { state = JSON.parse(localStorage.getItem(PLAYBACK_STATE_KEY) || "null"); } catch(_) { state = null; }
            if(!state || !state.playing) return;
            try {
                if(localStorage.getItem(RECORD_LOADED_KEY) !== "1") return;
            } catch(_) {}
            const selected = getSelectedAlbumForBridge();
            if(!selected) return;
            const albumName = String(selected.name || "");
            if(String(state.albumName || "") !== albumName) return;
            bgBridge.active = true;
            bgBridge.albumName = albumName;
            bgBridge.tracks = selected.tracks.slice();
            bgBridge.sideSplit = Math.ceil(bgBridge.tracks.length / 2);
            bgBridge.currentSide = state.currentSide === "B" ? "B" : "A";
            bgBridge.currentTrackIndex = Number.isFinite(state.currentTrackIndex) ? Number(state.currentTrackIndex) : 0;
            bgBridge.sideDurations = (state.sideDurations && typeof state.sideDurations === "object") ? state.sideDurations : bgBridge.sideDurations;
            bgBridge.base = Number.isFinite(state.base) ? Number(state.base) : 1;
            ensureBridgeTrackInSide();
            setBridgeSourceByIndex(bgBridge.currentTrackIndex);
            try { archiveDeck.currentTime = Math.max(0, Number(state.deckCurrentTime || 0)); } catch(_) {}
            archiveDeck.playbackRate = bgBridge.base;
            archiveDeck.play().catch(()=>{});
        }

        function ensureArchiveBridgePlayback(){
            if(!bgBridge.active) return;
            if(!archiveDeck.paused) return;
            archiveDeck.play().catch(()=>{});
        }

        function playTick() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const duration = 0.04;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(1500, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(250, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + duration);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        }

        function generateVinylNormalMap(size = 1024) {
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgb(128, 128, 255)';
            ctx.fillRect(0, 0, size, size);
            const centerX = size / 2;
            const centerY = size / 2;
            for(let r = 180; r < 495; r += 1.3) {
                const strength = Math.random() * 12 + 3; 
                ctx.beginPath();
                ctx.strokeStyle = `rgb(${128 + strength}, ${128}, 255)`;
                ctx.lineWidth = 0.9;
                ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
                ctx.stroke();
            }
            return new THREE.CanvasTexture(canvas);
        }

        function generateArchiveBackgroundTexture() {
            const canvas = document.createElement("canvas");
            canvas.width = 2048;
            canvas.height = 2048;
            const ctx = canvas.getContext("2d");
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const r = Math.min(canvas.width, canvas.height) / 2;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, "#000");
            grad.addColorStop(1, "#020202");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            return texture;
        }

        function generateCoverTexture(item, size = 512) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = size;
            canvas.height = size;

            const hexNorm = (v) => {
                const s = String(v || "").trim();
                if (/^#[0-9a-f]{3}$/i.test(s)) {
                    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
                }
                return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : "#1a5fd0";
            };
            const mix = (a, b, t) => {
                const aa = hexNorm(a);
                const bb = hexNorm(b);
                const p = Math.max(0, Math.min(1, t));
                const ar = parseInt(aa.slice(1, 3), 16), ag = parseInt(aa.slice(3, 5), 16), ab = parseInt(aa.slice(5, 7), 16);
                const br = parseInt(bb.slice(1, 3), 16), bg = parseInt(bb.slice(3, 5), 16), bbv = parseInt(bb.slice(5, 7), 16);
                const rr = Math.round(ar + (br - ar) * p).toString(16).padStart(2, "0");
                const rg = Math.round(ag + (bg - ag) * p).toString(16).padStart(2, "0");
                const rb = Math.round(ab + (bbv - ab) * p).toString(16).padStart(2, "0");
                return `#${rr}${rg}${rb}`;
            };
            const hash = (str) => {
                let h = 2166136261 >>> 0;
                const s = String(str || "");
                for (let i = 0; i < s.length; i += 1) {
                    h ^= s.charCodeAt(i);
                    h = Math.imul(h, 16777619);
                }
                return h >>> 0;
            };
            const titleCase = (s) => String(s || "")
                .toLowerCase()
                .split(/\s+/)
                .map((w) => (w ? (w[0].toUpperCase() + w.slice(1)) : w))
                .join(" ");
            const trackNameOnly = (name) => {
                const base = decodeURIComponent(String(name || "").trim())
                    .replace(/\.(mp3|flac|wav|m4a|aac|ogg)\s*$/i, "")
                    .replace(/[_]+/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                const rayTogetherAgain = (() => {
                    const src = base.toLowerCase();
                    if (!String(item?.name || "").toUpperCase().includes("TOGETHER AGAIN")) return "";
                    if (/side a .*?-0?1/.test(src)) return "Together Again";
                    if (/side a .*?-0?2/.test(src)) return "I Like To Hear It Sometime";
                    if (/side a .*?-0?4/.test(src)) return "Please Forgive And Forget";
                    if (/side a .*?-0?6/.test(src)) return "Next Door To The Blues";
                    if (/side b .*?-0?4/.test(src)) return "All Night Long";
                    if (/side b .*?-0?5/.test(src)) return "Don't Let Her Know";
                    if (/side b .*?-0?6/.test(src)) return "Watch It Baby";
                    return "";
                })();
                if (rayTogetherAgain) return rayTogetherAgain;
                const cleaned = base
                    .replace(/^\s*(?:track\s*)?\d{1,3}\s*[\.\-\)_]\s*/i, "")
                    .replace(/^\s*\d{1,3}\s+/, "")
                    .replace(/^\s*[^-]{2,60}\s-\s+/i, "")
                    .replace(/\s*,?\s*side\s*[ab]\s*\(archive\)\s*[-_ ]*\d*\s*$/i, "")
                    .replace(/\s*,?\s*side\s*[ab]\s*[-_ ]*\d*\s*$/i, "")
                    .replace(/\s*\(archive\)\s*[-_ ]*\d*\s*$/i, "")
                    .replace(/\s*[-_ ]\d{1,2}\s*$/i, "")
                    .replace(/\s*\((19|20)\d{2}\)\s*$/i, "")
                    .replace(/\s*\[[^\]]+\]\s*$/i, "")
                    .replace(/[_]+/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                return cleaned || base || "Unknown track";
            };
            const wrapText = (textVal, maxWidth, maxLines, lineHeight, x, y) => {
                const words = String(textVal || "").split(/\s+/).filter(Boolean);
                let line = "";
                let lines = 0;
                for (let i = 0; i < words.length; i += 1) {
                    const test = line ? `${line} ${words[i]}` : words[i];
                    if (ctx.measureText(test).width <= maxWidth) {
                        line = test;
                    } else {
                        ctx.fillText(line, x, y + lines * lineHeight);
                        lines += 1;
                        if (lines >= maxLines) return;
                        line = words[i];
                    }
                }
                if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
            };
            const measureWrapped = (textVal, maxWidth) => {
                const words = String(textVal || "").split(/\s+/).filter(Boolean);
                const lines = [];
                let line = "";
                for (let i = 0; i < words.length; i += 1) {
                    const test = line ? `${line} ${words[i]}` : words[i];
                    if (ctx.measureText(test).width <= maxWidth) {
                        line = test;
                    } else {
                        if (line) lines.push(line);
                        line = words[i];
                    }
                }
                if (line) lines.push(line);
                return lines;
            };
            const drawRightSpacedText = (textVal, xRight, yTop, spacingPx) => {
                const textStr = String(textVal || "");
                ctx.textAlign = "left";
                let x = xRight;
                for (let i = textStr.length - 1; i >= 0; i -= 1) {
                    const ch = textStr[i];
                    const w = ctx.measureText(ch).width;
                    x -= w;
                    ctx.fillText(ch, x, yTop);
                    x -= spacingPx;
                }
            };
            const KNOWN_RELEASE_YEARS = {
                "MORRISON HOTEL": "1970",
                "RUBBER SOUL": "1965",
                "SOB ROCK": "2021"
            };
            const getYear = () => {
                if (item && item.year && /^\d{4}$/.test(String(item.year))) return String(item.year);
                const hay = `${item.name || ""} ${item.folder || ""}`;
                const m = hay.match(/(19|20)\d{2}/);
                if (m) return m[0];
                const key = String(item.name || "").toUpperCase().trim();
                return KNOWN_RELEASE_YEARS[key] || "----";
            };

            const accent = hexNorm(item.color || "#1a5fd0");
            ctx.fillStyle = accent;
            ctx.fillRect(0, 0, size, size);
            ctx.save();
            ctx.globalCompositeOperation = "overlay";
            const overlay = ctx.createLinearGradient(0, 0, size, size);
            overlay.addColorStop(0, "rgba(0,0,0,0.3)");
            overlay.addColorStop(1, "rgba(0,0,0,0.6)");
            ctx.fillStyle = overlay;
            ctx.fillRect(0, 0, size, size);
            ctx.restore();

            // Visible grain over the gradient.
            const seed = hash(item.name || "");
            ctx.save();
            ctx.globalAlpha = 0.16;
            for (let i = 0; i < 7600; i += 1) {
                const x = (seed * (i + 31) * 1103515245 + 12345) % size;
                const y = (seed * (i + 67) * 214013 + 2531011) % size;
                ctx.fillStyle = (i % 2 === 0) ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)";
                ctx.fillRect(x, y, 2, 2);
            }
            ctx.restore();

            // Typography/layout based on provided design
            const margin = size * 0.062;
            const contentW = size - margin * 2;
            const text = "rgba(247,249,255,0.98)";
            const textSoft = "rgba(228,236,249,0.88)";

            ctx.textBaseline = "top";
            ctx.textAlign = "left";
            ctx.fillStyle = text;
            ctx.font = `300 ${Math.round(size * 0.073)}px Roboto`;
            ctx.fillText(titleCase(item.author || "Unknown Artist"), margin, size * 0.06);

            ctx.textAlign = "right";
            ctx.font = `900 ${Math.round(size * 0.043)}px Roboto`;
            ctx.fillText(getYear(), size - margin, size * 0.075);
            ctx.font = `400 ${Math.round(size * 0.018)}px Roboto`;
            ctx.fillStyle = textSoft;
            drawRightSpacedText("RELEASE", size - margin, size * 0.128, 5);

            const words = String(item.name || "Untitled").toUpperCase().split(/\s+/).filter(Boolean);
            const split = Math.ceil(words.length / 2);
            const line1 = words.slice(0, split).join(" ");
            const line2 = words.slice(split).join(" ");
            let titlePx = Math.round(size * 0.19);
            ctx.textAlign = "left";
            ctx.fillStyle = text;
            ctx.font = `900 ${titlePx}px Roboto`;
            while ((ctx.measureText(line1).width > contentW || (line2 && ctx.measureText(line2).width > contentW)) && titlePx > Math.round(size * 0.1)) {
                titlePx -= 2;
                ctx.font = `900 ${titlePx}px Roboto`;
            }
            const titleY = size * 0.30;
            ctx.fillText(line1, margin, titleY);
            if (line2) ctx.fillText(line2, margin, titleY + titlePx * 0.9);

            const tracks = (item.tracks || []).map(trackNameOnly).filter(Boolean);
            const listText = tracks.map((t, i) => `${i + 1}. ${t}`).join(", ");
            ctx.fillStyle = textSoft;
            let tracksFontPx = Math.round(size * 0.026);
            const tracksY = size * 0.69;
            const tracksMaxH = size * 0.20;
            const tracksW = contentW * 0.98;
            while (tracksFontPx >= Math.round(size * 0.016)) {
                ctx.font = `400 ${tracksFontPx}px Roboto`;
                const lineHeight = tracksFontPx * 1.34;
                const lines = measureWrapped(listText, tracksW);
                const neededH = lines.length * lineHeight;
                if (neededH <= tracksMaxH) {
                    const maxLines = Math.max(1, Math.floor(tracksMaxH / lineHeight));
                    wrapText(listText, tracksW, maxLines, lineHeight, margin, tracksY);
                    break;
                }
                tracksFontPx -= 1;
            }

            ctx.font = `700 ${Math.round(size * 0.029)}px Roboto`;
            ctx.fillStyle = text;
            ctx.fillText("33 RPM ALBUM", margin, size * 0.92);
            ctx.textAlign = "right";
            ctx.fillText("VINYL RECORD", size - margin, size * 0.92);

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        }

        function generateArchiveLabelTexture(item, side = "A", size = 512) {
            const toHex = (value) => {
                if (typeof value !== "string") return null;
                const v = value.trim();
                if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return null;
                if (v.length === 4) {
                    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
                }
                return v.toLowerCase();
            };
            const desaturateAndDarken = (hex, desat = 0.45, darken = 0.34) => {
                const norm = toHex(hex);
                if (!norm) return "#262626";
                const r = parseInt(norm.slice(1, 3), 16);
                const g = parseInt(norm.slice(3, 5), 16);
                const b = parseInt(norm.slice(5, 7), 16);
                const gray = (r + g + b) / 3;
                const d = Math.max(0, Math.min(1, desat));
                const k = Math.max(0, Math.min(1, darken));
                const nr = Math.round((r * (1 - d) + gray * d) * (1 - k));
                const ng = Math.round((g * (1 - d) + gray * d) * (1 - k));
                const nb = Math.round((b * (1 - d) + gray * d) * (1 - k));
                return `rgb(${nr}, ${ng}, ${nb})`;
            };
            const mixHexWithWhite = (hex, amount = 0.10) => {
                const norm = toHex(hex);
                if (!norm) return "#efe9d8";
                const p = Math.max(0, Math.min(1, amount));
                const r = parseInt(norm.slice(1, 3), 16);
                const g = parseInt(norm.slice(3, 5), 16);
                const b = parseInt(norm.slice(5, 7), 16);
                const nr = Math.round(r + (255 - r) * p);
                const ng = Math.round(g + (255 - g) * p);
                const nb = Math.round(b + (255 - b) * p);
                return `rgb(${nr}, ${ng}, ${nb})`;
            };
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            const c = size / 2;
            const r = size * 0.49;

            ctx.clearRect(0, 0, size, size);

            ctx.beginPath();
            ctx.arc(c, c, r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = desaturateAndDarken(item.color || "", 0.5, 0.38);
            ctx.fill();

            ctx.strokeStyle = "#252525";
            ctx.lineWidth = size * 0.0065;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(c, c, size * 0.462, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(24,24,24,0.8)";
            ctx.lineWidth = size * 0.0038;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(c, c, size * 0.31, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(24,24,24,0.24)";
            ctx.lineWidth = size * 0.003;
            ctx.stroke();

            const bandH = size * 0.13;
            const bandTop = size * 0.435;
            const bandInset = size * 0.048;
            ctx.fillStyle = "#181818";
            ctx.fillRect(bandInset, bandTop, size - bandInset * 2, bandH);
            ctx.strokeStyle = "#1f1f1f";
            ctx.lineWidth = size * 0.002;
            ctx.strokeRect(bandInset, bandTop, size - bandInset * 2, bandH);

            ctx.fillStyle = "#f1f1f1";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `400 ${Math.round(4.3 * (size / 100))}px Roboto`;
            ctx.fillText("STEREO", size * 0.245, c);
            ctx.fillText("33 RPM", size * 0.755, c);

            ctx.fillStyle = "#f3f3f3";
            ctx.font = `900 ${Math.round(5.8 * (size / 100))}px Roboto`;
            ctx.fillText((item.author || "").toUpperCase(), c, size * 0.24);

            ctx.fillStyle = "#ececec";
            ctx.font = `400 ${Math.round(3.9 * (size / 100))}px Roboto`;
            ctx.fillText((item.name || "").toUpperCase(), c, size * 0.305);

            ctx.fillStyle = "#f1f1f1";
            ctx.font = `400 ${Math.round(5.8 * (size / 100))}px Roboto`;
            ctx.fillText(`SIDE ${side}`, c, size * 0.647);

            ctx.fillStyle = "#e9e9e9";
            ctx.font = `300 ${Math.round(2.8 * (size / 100))}px Roboto`;
            ctx.fillText("DESIGN PORTFOLIO", c, size * 0.761);
            ctx.fillText("MILAN SAMARDZIC", c, size * 0.792);

            ctx.beginPath();
            ctx.arc(c, c, size * 0.07, 0, Math.PI * 2);
            ctx.fillStyle = "#181818";
            ctx.fill();

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        }

        function createVinylDisk(item, diskNormalMap) {
            const diskMat = new THREE.MeshStandardMaterial({ 
                color: 0x050505, 
                roughness: 0.28,
                metalness: 0.75,
                normalMap: diskNormalMap, 
                normalScale: new THREE.Vector2(1.4, 1.4)
            });
            const geo = new THREE.CylinderGeometry(2.85, 2.85, 0.05, 64);
            const disk = new THREE.Mesh(geo, diskMat);
            disk.rotation.x = Math.PI / 2;
            disk.name = "disk";
            disk.layers.set(DISK_LAYER);
            
            const labelTexture = generateArchiveLabelTexture(item, "A", 512);
            const labelGeo = new THREE.CircleGeometry(1.05, 64);
            const labelMat = new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.5, metalness: 0.6 });
            const labelMesh = new THREE.Mesh(labelGeo, labelMat);
            labelMesh.position.y = 0.026;
            labelMesh.rotation.x = -Math.PI / 2;
            labelMesh.layers.set(DISK_LAYER); 
            disk.add(labelMesh);
            return disk;
        }

        function pickAlbumIndexAtPointer() {
            raycaster.layers.enable(0);
            raycaster.layers.enable(DISK_LAYER);
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            if (!intersects.length) return -1;
            for (let i = 0; i < intersects.length; i += 1) {
                let hitObj = intersects[i].object;
                while (hitObj.parent && !groups.includes(hitObj)) hitObj = hitObj.parent;
                if (hitObj.userData && typeof hitObj.userData.index !== "undefined") {
                    if (hitObj.visible && hitObj.position.z > -8) {
                        return hitObj.userData.index;
                    }
                }
            }
            return -1;
        }

        function handleInteractionAtIndex(idx) {
            if (!totalMeshes || launchIndex !== -1) return;
            if (!Number.isFinite(idx) || idx < 0 || idx >= totalMeshes) return;
            if (isPlayingLockedIndex(idx)) {
                openStates[idx] = false;
                return;
            }
            const currentFocusIdx = Math.round(currentScroll / scrollSensitivity);
            if (idx !== currentFocusIdx) {
                targetScroll = idx * scrollSensitivity;
                openStates.fill(false);
                // Open immediately on first click while camera settles.
                openStates[idx] = true;
                pendingOpenIndex = -1;
                playSleeve();
            } else {
                const targetState = !openStates[idx];
                openStates.fill(false);
                openStates[idx] = targetState;
                if (targetState) playSleeve();
            }
            document.getElementById('audio-hint').style.display = 'none';
        }

        function startLaunchToPlayer(idx, url, selectedPayload = null) {
            if (launchIndex !== -1) return;
            
            bgBridge.active = false;
            try { archiveDeck.pause(); } catch(_) {}
            launchIndex = idx;
            launchStartMs = performance.now();
            launchTargetUrl = url;
            launchSelectedPayload = selectedPayload;
            launchNavigated = false;
            pendingOpenIndex = -1;
            openStates.fill(false);
            openStates[idx] = true;
            targetScroll = idx * scrollSensitivity;
            currentScroll = targetScroll;
            try {
                localStorage.setItem(SCROLL_STATE_KEY, JSON.stringify({
                    targetScroll,
                    currentScroll,
                    openIndex: idx
                }));
            } catch(_) {}
            playBtn.classList.remove('visible');
            playBtn.style.display = 'none';
            playBtn.style.pointerEvents = 'none';
            if (routeFade) {
                routeFade.style.transition = 'opacity 420ms cubic-bezier(0.16, 1, 0.3, 1) 380ms';
            }
            routeFade?.classList.add('on');
        }

        function resetLaunchState() {
            if (launchSelectedPayload?.name) {
                const name = String(launchSelectedPayload.name).toUpperCase();
                const idx = collection.findIndex((a) => String(a?.name || "").toUpperCase() === name);
                if (idx >= 0) {
                    playingIndex = idx;
                    try { localStorage.setItem(PLAYING_INDEX_KEY, String(idx)); } catch(_) {}
                }
            }
            launchIndex = -1;
            launchStartMs = 0;
            launchTargetUrl = "";
            launchSelectedPayload = null;
            launchNavigated = false;
            pendingOpenIndex = -1;
            openStates.fill(false);
            routeFade?.classList.remove('on');
            if (routeFade) routeFade.style.transition = '';
            playBtn.style.pointerEvents = 'auto';
        }

        function resetArchiveToFirst() {
            targetScroll = 0;
            currentScroll = 0;
            pendingOpenIndex = -1;
            openStates.fill(false);
            if (playBtn) {
                playBtn.classList.remove('visible');
                playBtn.style.display = 'none';
            }
        }

        function init() {
            scene = new THREE.Scene();
            scene.background = generateArchiveBackgroundTexture();
            scene.fog = null;

            camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 8.8, 28);
            camera.lookAt(0, 3, 0);
            
            camera.layers.enable(0);
            camera.layers.enable(DISK_LAYER);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.outputEncoding = THREE.sRGBEncoding;
            document.getElementById('canvas-container').appendChild(renderer.domElement);

            const radialMain = new THREE.PointLight(0xffffff, 1.68, 24);
            radialMain.position.set(-3, 10, 16);
            radialMain.decay = 3.2;
            scene.add(radialMain);

            const radialSub = new THREE.PointLight(0xffffff, 0.3, 25);
            radialSub.position.set(6, 3, 14);
            radialSub.decay = 2.0;
            radialSub.layers.set(DISK_LAYER);
            scene.add(radialSub);

            const reflectionLight = new THREE.PointLight(0xffffff, 0.125, 50);
            reflectionLight.position.set(4.75, 8, 18); 
            reflectionLight.layers.set(DISK_LAYER);
            scene.add(reflectionLight);

            const coverGeo = new THREE.BoxGeometry(6, 6, 0.12);
            coverGeo.translate(0, 4, 0);
            const sharedDiskNormalMap = generateVinylNormalMap(1024);

            for (let i = 0; i < totalMeshes; i++) {
                const group = new THREE.Group();
                const item = collection[i];
                const texture = generateCoverTexture(item, 1024);
                
                const material = new THREE.MeshStandardMaterial({ 
                    map: texture, 
                    roughness: 0.5, 
                    metalness: 0.65,
                    transparent: true 
                });
                const edgeMat = new THREE.MeshStandardMaterial({ 
                    color: new THREE.Color(item.color), 
                    roughness: 0.5, 
                    metalness: 0.65,
                    transparent: true 
                });
                
                const cover = new THREE.Mesh(coverGeo, [edgeMat, edgeMat, edgeMat, edgeMat, material, material]);
                cover.name = "cover";
                const disk = createVinylDisk(item, sharedDiskNormalMap);
                disk.position.set(0, 4, -0.05);
                
                group.add(disk);
                group.add(cover);
                group.userData = { 
                    index: i, 
                    openProgress: 0, 
                    openAmount: 0,   
                    hoverVal: 0,
                    tiltX: 0
                };
                scene.add(group);
                groups.push(group);
            }

            // Desktop Mouse Events
            window.addEventListener('wheel', (e) => {
                if (launchIndex !== -1) return;
                targetScroll -= e.deltaY; 
                targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
                pendingOpenIndex = -1; 
                if (Math.abs(e.deltaY) > 5) openStates.fill(false);
            }, { passive: true });

            window.addEventListener('mousemove', (e) => {
                mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            });

            window.addEventListener('mousedown', (e) => {
               if (e.target.closest('#play-button')) return;
               mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
               mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
               const foundIdx = pickAlbumIndexAtPointer();
               interactiveIndex = foundIdx;
               isHovered = foundIdx !== -1 && !isPlayingLockedIndex(foundIdx);
               handleInteractionAtIndex(foundIdx);
            });

            // Touch Events (Mobile/Tablet)
            window.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
                isTouchMove = false;
                mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
            }, { passive: false });

            window.addEventListener('touchmove', (e) => {
                if (launchIndex !== -1) return;
                e.preventDefault(); // Sprečava nativno skrolanje
                const touchY = e.touches[0].clientY;
                const deltaY = touchY - touchStartY;
                touchStartY = touchY;

                // Tolerancija za tap vs scroll
                if (Math.abs(deltaY) > 1.5) {
                    isTouchMove = true;
                    // Touch skrolanje treba biti osjetljivije
                    targetScroll -= deltaY * 3.5; 
                    targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
                    
                    if (Math.abs(deltaY) > 2) openStates.fill(false);

                    mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                    mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
                }
            }, { passive: false });

            window.addEventListener('touchend', (e) => {
                if (!isTouchMove) {
                    // Ignoriši ako je tapnuto play dugme (ono ima svoj handler)
                    if (e.target.closest('#play-button')) return;
                    
                    // Direct pick at current touch position (no stale hover state).
                    const foundIdx = pickAlbumIndexAtPointer();
                    interactiveIndex = foundIdx;
                    isHovered = foundIdx !== -1 && !isPlayingLockedIndex(foundIdx);
                    handleInteractionAtIndex(foundIdx);
                }
            });

            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!totalMeshes) return;
                const currentIdx = Math.round(currentScroll / scrollSensitivity);
                try { localStorage.setItem(RECORD_LOADED_KEY, "1"); } catch(_) {}
                hasLoadedRecord = true;
                const selected = collection[currentIdx];
                if (!selected) return;
                const selectedPayload = { ...selected };
                try {
                    localStorage.setItem(SELECTED_ALBUM_KEY, JSON.stringify(selectedPayload));
                } catch(_) {}
                const q = new URLSearchParams({
                    album: selected.name,
                    name: selected.name,
                    author: selected.author || "",
                    color: selected.color || "",
                    duration: selected.duration || "",
                    folder: selected.folder || ""
                });
                startLaunchToPlayer(currentIdx, `vinyl-player.html?${q.toString()}`, selectedPayload);
            });
            playerNavLink?.addEventListener('click', (e) => {
                e.preventDefault();
                if(EMBEDDED && window.parent){
                    window.parent.postMessage({type:"archive-close"}, "*");
                    return;
                }
                window.location.href = "vinyl-player.html";
            });

            animate();
        }

        function warmGlobalAssetsOnce() {
            try {
                localStorage.setItem(ARCHIVE_ALBUMS_KEY, JSON.stringify(collection.length ? collection : DEFAULT_COLLECTION));
                if (localStorage.getItem(WARM_FLAG_KEY) === "1") return;
                const warm = (url, mode = "same-origin") => {
                    try { fetch(url, { cache: "force-cache", mode }).catch(()=>{}); } catch(_) {}
                };
                warm("archive.html");
                warm("vinyl-player.html");
                warm("sjaj-overlay.png");
                warm("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "no-cors");
                localStorage.setItem(WARM_FLAG_KEY, "1");
            } catch(_) {}
        }

        function animate() {
            requestAnimationFrame(animate);

            let launchProgress = 0;
            if (launchIndex !== -1) {
                launchProgress = Math.min(1, (performance.now() - launchStartMs) / LAUNCH_MS);
                if (launchProgress >= 1 && !launchNavigated) {
                    launchNavigated = true;
                    if(EMBEDDED && window.parent){
                        window.parent.postMessage({type:"archive-select-album", album: launchSelectedPayload}, "*");
                        resetLaunchState();
                        return;
                    }
                    if(!launchTargetUrl) return;
                    window.location.href = launchTargetUrl;
                    return;
                }
            }
            
            currentScroll += (targetScroll - currentScroll) * 0.08; 
            const scrollProgress = currentScroll / scrollSensitivity; 

            if (pendingOpenIndex !== -1) {
                const distToTarget = Math.abs(pendingOpenIndex - scrollProgress);
                if (distToTarget < 0.25) { 
                    openStates[pendingOpenIndex] = true;
                    pendingOpenIndex = -1;
                }
            }

            raycaster.layers.enable(0);
            raycaster.layers.enable(DISK_LAYER);
            raycaster.setFromCamera(mouse, camera);
            
            const intersects = raycaster.intersectObjects(scene.children, true);
            let foundIdx = -1;
            if (intersects.length > 0) {
                for(let i = 0; i < intersects.length; i++) {
                    let hitObj = intersects[i].object;
                    while(hitObj.parent && !groups.includes(hitObj)) hitObj = hitObj.parent;
                    if (hitObj.userData && typeof hitObj.userData.index !== 'undefined') {
                        if (hitObj.visible && hitObj.position.z > -8) {
                            foundIdx = hitObj.userData.index;
                            break; 
                        }
                    }
                }
            }

            interactiveIndex = foundIdx;
            isHovered = foundIdx !== -1 && !isPlayingLockedIndex(foundIdx);
            document.body.style.cursor = isHovered ? 'pointer' : 'default';

            const displayIdx = totalMeshes ? Math.max(0, Math.min(totalMeshes - 1, Math.round(scrollProgress))) : 0;
            if (displayIdx !== lastIndex) {
                playTick();
                lastIndex = displayIdx;
            }
            
            document.getElementById('counter').innerText = `${totalMeshes} Albums`;

            let playBtnUpdated = false;
            let nowPlayingUpdated = false;

            groups.forEach((group, i) => {
                let dist = i - scrollProgress;
                const cover = group.children.find(c => c.name === "cover");
                const disk = group.children.find(c => c.name === "disk");
                
                const isLaunching = i === launchIndex;
                const targetOpen = isLaunching ? 1 : (openStates[i] ? 1 : 0);
                group.userData.openProgress += (targetOpen - group.userData.openProgress) * 0.045;
                group.userData.openAmount = easeInOutExpo(group.userData.openProgress);
                if (isLaunching) {
                    group.userData.openProgress = 1;
                    group.userData.openAmount = 1;
                }

                group.userData.hoverVal += (((i === interactiveIndex) ? 1 : 0) - group.userData.hoverVal) * 0.1;

                if (i === interactiveIndex) {
                    group.userData.tiltX += (mouse.y * 0.15 - group.userData.tiltX) * 0.1;
                } else {
                    group.userData.tiltX *= 0.85;
                }
                
                const baseRotX = -Math.PI * 0.04; 
                let z = 8 - (dist >= 0 ? dist * 2.8 : 0);
                let y = dist < 0 ? Math.abs(dist) * 0.15 : 0;
                let rotX = baseRotX + (dist < 0 ? Math.abs(dist) * 2.8 : 0);

                group.position.set(0, y, z);
                group.rotation.x = rotX + group.userData.tiltX;

                const s = 1 + (group.userData.hoverVal * 0.03);
                group.scale.set(s, s, s);
                
                const openVal = group.userData.openAmount;
                cover.position.x = openVal * -1.2; 
                const launchEase = isLaunching ? easeInCubic(launchProgress) : 0;
                if (isLaunching) {
                    group.userData.tiltX = 0;
                    cover.position.x = -1.2;
                    disk.position.x = 1.8 + launchEase * 28;
                    disk.rotation.y = -2.2 - (launchProgress * Math.PI * 1.15);
                    disk.rotation.z = 0;
                    disk.rotation.x = Math.PI / 2;
                } else {
                    disk.position.x = openVal * 1.8;
                    disk.rotation.y = openVal * -2.2;
                    disk.rotation.z = 0;
                    disk.rotation.x = (Math.PI / 2) + group.userData.tiltX * 0.5;
                }

                disk.visible = isLaunching || openVal > 0.005;
                if (!isLaunching && openStates[i]) disk.rotation.y -= 0.008;

                const fadeStartThreshold = Math.PI / 4; 
                let opacity = 1;
                if (rotX > fadeStartThreshold) {
                    opacity = Math.max(0, 1 - (rotX - fadeStartThreshold) * 3.5);
                    if (!isLaunching && openStates[i] && opacity < 0.2) {
                        openStates[i] = false;
                    }
                }

                // Ažuriranje pozicije PLAY dugmeta
                if (openVal > 0.1 && i === displayIdx && !isPlayingLockedIndex(i)) {
                    const vector = new THREE.Vector3();
                    disk.getWorldPosition(vector);
                    vector.project(camera);

                    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                    const yPos = (vector.y * -0.5 + 0.5) * window.innerHeight;

                    playBtn.style.left = `${x}px`;
                    playBtn.style.top = `${yPos}px`;
                    playBtn.classList.add('visible');
                    playBtn.style.display = 'flex';
                    playBtnUpdated = true;
                }

                if (playingIndex === i && i === interactiveIndex && opacity > 0.05) {
                    const v = new THREE.Vector3();
                    cover.getWorldPosition(v);
                    v.y += 2.35;
                    v.project(camera);
                    const bx = (v.x * 0.5 + 0.5) * window.innerWidth;
                    const by = (v.y * -0.5 + 0.5) * window.innerHeight;
                    nowPlayingBadge.style.left = `${bx}px`;
                    nowPlayingBadge.style.top = `${by}px`;
                    nowPlayingBadge.style.display = 'block';
                    nowPlayingUpdated = true;
                }

                group.traverse(child => { 
                    if(child.material) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        mats.forEach(m => {
                            m.opacity = opacity;
                            m.transparent = true;
                            m.depthWrite = opacity > 0.9;
                        });
                    } 
                });
                group.visible = opacity > 0.001;
            });

            if (!playBtnUpdated) {
                playBtn.classList.remove('visible');
                setTimeout(() => { if(!playBtn.classList.contains('visible')) playBtn.style.display = 'none'; }, 400);
            }
            if (!nowPlayingUpdated) {
                nowPlayingBadge.style.display = 'none';
            }

            renderer.render(scene, camera);
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        document.addEventListener("DOMContentLoaded", async () => {
            



            // Genre pills logic
            const genreBtns = document.querySelectorAll(".genre-pill");
            genreBtns.forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const genre = e.target.getAttribute("data-genre");
                    if (!genre || genre === activeGenre) return;
                    
                    genreBtns.forEach(b => b.classList.remove("active"));
                    e.target.classList.add("active");
                    activeGenre = genre;
                    
                    filterCollection();
                });
            });

            // Verify collection source before app init so archive is ready immediately.
            try { localStorage.removeItem("vinyl_archive_albums_v1"); } catch(_) {}
            await loadCollectionManifest();
            if (!collection.length) {
                console.warn("Collection empty, applying defaults");
                applyCollectionData(DEFAULT_COLLECTION);
            }
            await ensureArchiveFontsReady();
            refreshRecordLoadedState();
            try {
                const saved = Number(localStorage.getItem(PLAYING_INDEX_KEY));
                if (Number.isFinite(saved) && saved >= 0 && saved < totalMeshes) playingIndex = saved;
            } catch(_) {}
            if (!hasLoadedRecord) {
                playingIndex = -1;
            }
            // Always start archive from the first album.
            resetArchiveToFirst();
            warmGlobalAssetsOnce();
            
            console.log("Starting init with", totalMeshes, "albums");
            init();
        });
        startArchiveBridgeFromState();
        window.addEventListener("pageshow", () => {
            // In standalone mode reset to first album; embedded mode is controlled by parent.
            if (!EMBEDDED) resetArchiveToFirst();
            refreshRecordLoadedState();
            startArchiveBridgeFromState();
        });
        window.addEventListener("focus", () => {
            // Avoid unexpected jump-to-first while already browsing embedded archive.
            if (!EMBEDDED) resetArchiveToFirst();
        });
        window.addEventListener("message", (event) => {
            const data = event?.data;
            if (!data || data.type !== "archive-reset-first") return;
            resetArchiveToFirst();
        });
        ["pointerdown","mousedown","touchstart","wheel","keydown"].forEach((evt)=>{
            window.addEventListener(evt, ensureArchiveBridgePlayback, {passive:true});
        });
        document.addEventListener("visibilitychange", () => {
            if(!document.hidden) ensureArchiveBridgePlayback();
        });
        archiveDeck.addEventListener("ended", () => {
            if(!bgBridge.active) return;
            const range = sideRangeForBridge(bgBridge.currentSide);
            if(bgBridge.currentTrackIndex < range.end){
                bgBridge.currentTrackIndex += 1;
                setBridgeSourceByIndex(bgBridge.currentTrackIndex);
                archiveDeck.currentTime = 0;
                archiveDeck.play().catch(()=>{});
                saveBridgePlaybackState(true);
                return;
            }
            bgBridge.active = false;
            saveBridgePlaybackState(false);
        });

        // Edit Modal Logic
        const editAlbumBtn = document.getElementById("editAlbumBtn");
        const editModalOverlay = document.getElementById("editModalOverlay");
        const editCloseBtn = document.getElementById("editCloseBtn");
        
        const editAlbumName = document.getElementById("editAlbumName");
        const editAlbumAuthor = document.getElementById("editAlbumAuthor");
        const editAlbumGenre = document.getElementById("editAlbumGenre");
        const editAlbumYear = document.getElementById("editAlbumYear");
        const editAlbumColor = document.getElementById("editAlbumColor");
        const editAlbumColorSwatch = document.getElementById("editAlbumColorSwatch");
        const rightColorPickerContainer = document.getElementById("rightColorPickerContainer");
        const cpHue = document.getElementById("cpHue");
        const cpSat = document.getElementById("cpSat");
        const cpLight = document.getElementById("cpLight");
        const cpPreview = document.getElementById("cpPreview");
        const cpCloseBtn = document.getElementById("cpCloseBtn");

        function cpHslToHex(h, s, l) {
            l /= 100;
            const a = s * Math.min(l, 1 - l) / 100;
            const f = n => {
                const k = (n + h / 30) % 12;
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        }

        function hexToHsl(hex) {
            let r = 0, g = 0, b = 0;
            if (hex.length === 7) {
                r = parseInt(hex.slice(1,3), 16);
                g = parseInt(hex.slice(3,5), 16);
                b = parseInt(hex.slice(5,7), 16);
            }
            r /= 255; g /= 255; b /= 255;
            let cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
            let h = 0, s = 0, l = 0;
            if (delta === 0) h = 0;
            else if (cmax === r) h = ((g - b) / delta) % 6;
            else if (cmax === g) h = (b - r) / delta + 2;
            else h = (r - g) / delta + 4;
            h = Math.round(h * 60);
            if (h < 0) h += 360;
            l = (cmax + cmin) / 2;
            s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
            s = +(s * 100).toFixed(1);
            l = +(l * 100).toFixed(1);
            return {h, s, l};
        }

        function updateCustomCp(hexVal) {
            const hsl = hexToHsl(hexVal);
            cpHue.value = hsl.h;
            cpSat.value = hsl.s;
            cpLight.value = hsl.l;
            updateCpBackgrounds();
        }

        function updateCpBackgrounds() {
            const h = cpHue.value;
            const s = cpSat.value;
            const l = cpLight.value;
            const currentHex = cpHslToHex(h, s, l);
            cpPreview.style.backgroundColor = currentHex;
            
            cpSat.style.background = `linear-gradient(to right, ${cpHslToHex(h, 0, l)}, ${cpHslToHex(h, 100, l)})`;
            cpLight.style.background = `linear-gradient(to right, #000, ${cpHslToHex(h, s, 50)}, #fff)`;
            
            return currentHex;
        }

        editAlbumBtn.addEventListener("click", () => {
            if (lastIndex >= 0 && lastIndex < collection.length) {
                const item = collection[lastIndex];
                editAlbumName.value = item.name || "";
                editAlbumAuthor.value = item.author || "";
                editAlbumGenre.value = item.genre || "";
                editAlbumYear.value = item.year || "";
                const initColor = (item.color && item.color.startsWith('#') && item.color.length === 7) ? item.color : "#1a1a1a";
                editAlbumColor.value = initColor;
                editAlbumColorSwatch.style.backgroundColor = initColor;
                updateCustomCp(initColor);
                editModalOverlay.classList.add("active");
            }
        });

        const syncColorToPreview = () => {
            const newColor = editAlbumColor.value.trim();
            if (lastIndex >= 0 && lastIndex < collection.length && /^#[0-9A-Fa-f]{3,6}$/.test(newColor)) {
                collection[lastIndex].color = newColor;
                editAlbumColorSwatch.style.backgroundColor = newColor;
                if (groups[lastIndex]) {
                    const group = groups[lastIndex];
                    const cover = group.children.find(c => c.name === "cover");
                    if (cover) {
                        const edgeMat = new THREE.MeshStandardMaterial({ 
                            color: new THREE.Color(newColor), 
                            roughness: 0.5, 
                            metalness: 0.65,
                            transparent: true 
                        });
                        const texture = generateCoverTexture(collection[lastIndex], 1024);
                        const material = new THREE.MeshStandardMaterial({ 
                            map: texture, 
                            roughness: 0.5, 
                            metalness: 0.65,
                            transparent: true 
                        });
                        cover.material = [edgeMat, edgeMat, edgeMat, edgeMat, material, material];
                    }
                }
            }
        };

        const autoSaveEdits = () => {
            if (lastIndex >= 0 && lastIndex < collection.length) {
                const item = collection[lastIndex];
                const folderKey = item.folder;
                
                let overrides = {};
                try {
                    overrides = JSON.parse(localStorage.getItem('vinyl_album_overrides_v1')) || {};
                } catch(e) {}

                if (!overrides[folderKey]) {
                    overrides[folderKey] = {};
                }

                const newName = editAlbumName.value.trim() || item.name;
                const newAuthor = editAlbumAuthor.value.trim() || item.author;
                const newGenre = editAlbumGenre.value;
                const newYear = editAlbumYear.value.trim();
                const newColor = editAlbumColor.value.trim() || item.color;

                overrides[folderKey].name = newName;
                overrides[folderKey].author = newAuthor;
                overrides[folderKey].genre = newGenre;
                overrides[folderKey].year = newYear;
                overrides[folderKey].color = newColor;

                localStorage.setItem('vinyl_album_overrides_v1', JSON.stringify(overrides));

                item.name = newName;
                item.author = newAuthor;
                item.genre = newGenre;
                item.year = newYear;
                item.color = newColor;

                const origItem = originalCollection.find(x => x.folder === folderKey);
                if (origItem) {
                    origItem.name = newName;
                    origItem.author = newAuthor;
                    origItem.genre = newGenre;
                    origItem.year = newYear;
                    origItem.color = newColor;
                }
            }
        };

        // Attach auto-save to input events
        [editAlbumName, editAlbumAuthor, editAlbumGenre, editAlbumYear, editAlbumColor].forEach(el => {
            el.addEventListener('input', () => {
                autoSaveEdits();
                if(el === editAlbumColor) syncColorToPreview();
            });
            el.addEventListener('change', () => {
                autoSaveEdits();
            });
        });

        editAlbumColorSwatch.addEventListener("click", (e) => {
            e.stopPropagation();
            editModalOverlay.classList.remove("active");
            rightColorPickerContainer.classList.add("active");
        });

        document.addEventListener("click", (e) => {
            if (rightColorPickerContainer.classList.contains("active")) {
                const isClickInside = rightColorPickerContainer.contains(e.target);
                if (!isClickInside) {
                    rightColorPickerContainer.classList.remove("active");
                    editModalOverlay.classList.add("active");
                }
            }
        });

        [cpHue, cpSat, cpLight].forEach(el => {
            el.addEventListener('input', () => {
                const hex = updateCpBackgrounds();
                editAlbumColor.value = hex;
                editAlbumColorSwatch.style.backgroundColor = hex;
                syncColorToPreview();
                autoSaveEdits();
            });
        });

        cpCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            rightColorPickerContainer.classList.remove("active");
            editModalOverlay.classList.add("active");
        });
        
        editAlbumColor.addEventListener("input", (e) => {
            const val = e.target.value.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                editAlbumColorSwatch.style.backgroundColor = val;
                updateCustomCp(val);
            }
            syncColorToPreview();
        });

        const closeEditModal = () => {
            editModalOverlay.classList.remove("active");
            filterCollection(); 
            rebuildMeshes();
            lastIndex = -1;
        };

        editCloseBtn.addEventListener("click", closeEditModal);
        
        editModalOverlay.addEventListener("click", (e) => {
            if (e.target === editModalOverlay) {
                closeEditModal();
            }
        });

        window.addEventListener("keydown", (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

            if (e.key === "Escape") {
                if (rightColorPickerContainer.classList.contains("active")) {
                    rightColorPickerContainer.classList.remove("active");
                    editModalOverlay.classList.add("active");
                } else if (editModalOverlay.classList.contains("active")) {
                    closeEditModal();
                }
                return;
            }

            if (editModalOverlay.classList.contains("active") || rightColorPickerContainer.classList.contains("active")) {
                return;
            }

            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                targetScroll += scrollSensitivity;
                targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
                openStates.fill(false);
                pendingOpenIndex = -1;
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                targetScroll -= scrollSensitivity;
                targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
                openStates.fill(false);
                pendingOpenIndex = -1;
            }
        });

        window.addEventListener("pagehide", () => {
            try {
                let openIndex = -1;
                for (let i = 0; i < openStates.length; i++) {
                    if (openStates[i]) { openIndex = i; break; }
                }
                localStorage.setItem(SCROLL_STATE_KEY, JSON.stringify({
                    targetScroll,
                    currentScroll,
                    openIndex
                }));
            } catch(_) {}
            if(bgBridge.active){
                saveBridgePlaybackState(!archiveDeck.paused);
            }
        });

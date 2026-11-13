const USER_AGENT = 'Remotion-Cloud-MCP-Studio/7.0 (https://github.com/chibaole123a-ops/remotion-mcp)';

export interface VisualMediaItem {
  id: string;
  source: 'wikimedia' | 'openverse' | 'internet_archive';
  mediaType: 'image' | 'video';
  title: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  license?: string;
  visionAttached?: boolean;
}

export interface VisualMediaSearchResult {
  query: string;
  mediaTypeFilter: string;
  items: VisualMediaItem[];
  imageBlocks: Array<{ type: 'image'; data: string; mimeType: string; mime_type: string }>;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 5500): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchImageBase64(
  url: string,
  timeoutMs = 4500,
  maxBytes = 350_000
): Promise<{ data: string; mimeType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/jpeg,image/png,image/webp,image/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/') || ct.includes('svg')) return null;

    const lenHeader = Number(res.headers.get('content-length') || 0);
    if (lenHeader > maxBytes) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength < 512 || buf.byteLength > maxBytes) return null;

    const mimeType = ct.includes('png')
      ? 'image/png'
      : ct.includes('webp')
      ? 'image/webp'
      : 'image/jpeg';

    return {
      data: bytesToBase64(new Uint8Array(buf)),
      mimeType,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchWikimediaMedia(query: string, mediaType: 'all' | 'image' | 'video', limit: number): Promise<VisualMediaItem[]> {
  const suffix = mediaType === 'video' ? ' filetype:video' : mediaType === 'image' ? ' filetype:bitmap' : '';
  const apiUrl =
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6` +
    `&gsrsearch=${encodeURIComponent(query + suffix)}&gsrlimit=${Math.min(12, limit * 2)}` +
    `&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=360&format=json&origin=*`;

  const data = await fetchJsonWithTimeout(apiUrl, 6000);
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  const items: VisualMediaItem[] = [];

  for (const page of pages as any[]) {
    const info = page?.imageinfo?.[0];
    if (!info?.url) continue;
    const mime = String(info.mime || '').toLowerCase();
    const isVideo = mime.startsWith('video/') || /\.(mp4|webm|ogv)$/i.test(info.url);
    const isImage = mime.startsWith('image/') && !mime.includes('svg') && !mime.includes('tiff');

    if (mediaType === 'image' && !isImage) continue;
    if (mediaType === 'video' && !isVideo) continue;
    if (!isImage && !isVideo) continue;

    // Skip huge files (> 35 MB) so GitHub Actions pre-fetch stays fast
    if (typeof info.size === 'number' && info.size > 35 * 1024 * 1024) continue;

    const cleanTitle = String(page.title || '')
      .replace(/^File:/i, '')
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();

    items.push({
      id: `wm-${page.pageid}`,
      source: 'wikimedia',
      mediaType: isVideo ? 'video' : 'image',
      title: cleanTitle || query,
      url: info.url,
      thumbnailUrl: info.thumburl || (isImage ? info.url : undefined),
      width: info.width,
      height: info.height,
      license: info.extmetadata?.LicenseShortName?.value || 'Wikimedia Commons',
    });

    if (items.length >= limit) break;
  }

  return items;
}

async function searchOpenverseImages(query: string, limit: number): Promise<VisualMediaItem[]> {
  const apiUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${Math.min(10, limit * 2)}`;
  const data = await fetchJsonWithTimeout(apiUrl, 5500);
  const results = Array.isArray(data?.results) ? data.results : [];
  const items: VisualMediaItem[] = [];

  for (const r of results) {
    if (!r?.url) continue;
    items.push({
      id: `ov-${r.id}`,
      source: 'openverse',
      mediaType: 'image',
      title: r.title || query,
      url: r.url,
      thumbnailUrl: r.thumbnail || r.url,
      width: r.width,
      height: r.height,
      license: r.license ? `CC-${String(r.license).toUpperCase()}` : 'Openverse',
    });
    if (items.length >= limit) break;
  }

  return items;
}

async function searchInternetArchiveVideos(query: string, limit: number): Promise<VisualMediaItem[]> {
  const cleanQ = query.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  if (!cleanQ) return [];

  const searchUrl =
    `https://archive.org/advancedsearch.php?q=mediatype:movies+AND+${encodeURIComponent(cleanQ)}` +
    `&fl[]=identifier,title&sort[]=downloads+desc&rows=${Math.min(6, limit * 2)}&output=json`;
  const searchData = await fetchJsonWithTimeout(searchUrl, 5500);
  const docs = Array.isArray(searchData?.response?.docs) ? searchData.response.docs : [];
  const items: VisualMediaItem[] = [];

  const metas = await Promise.all(
    docs.slice(0, 4).map(async (doc: any) => {
      const meta = await fetchJsonWithTimeout(`https://archive.org/metadata/${doc.identifier}`, 4500);
      return { doc, meta };
    })
  );

  for (const { doc, meta } of metas) {
    const files = Array.isArray(meta?.files) ? meta.files : [];
    const mp4 = files.find(
      (f: any) =>
        typeof f?.name === 'string' &&
        /\.mp4$/i.test(f.name) &&
        (!f.size || Number(f.size) < 35 * 1024 * 1024)
    );
    if (!mp4) continue;

    items.push({
      id: `ia-${doc.identifier}`,
      source: 'internet_archive',
      mediaType: 'video',
      title: String(doc.title || doc.identifier),
      url: `https://archive.org/download/${doc.identifier}/${encodeURIComponent(mp4.name)}`,
      thumbnailUrl: `https://archive.org/services/img/${doc.identifier}`,
      license: 'Internet Archive',
    });
    if (items.length >= limit) break;
  }

  return items;
}

export async function searchVisualMedia(
  query: string,
  mediaType: 'all' | 'image' | 'video' = 'all',
  limit = 5,
  attachVisionThumbnails = true
): Promise<VisualMediaSearchResult> {
  const clampedLimit = Math.max(1, Math.min(8, limit));

  const tasks: Array<Promise<VisualMediaItem[]>> = [
    searchWikimediaMedia(query, mediaType, clampedLimit),
  ];
  if (mediaType === 'all' || mediaType === 'image') {
    tasks.push(searchOpenverseImages(query, clampedLimit));
  }
  if (mediaType === 'all' || mediaType === 'video') {
    tasks.push(searchInternetArchiveVideos(query, Math.min(3, clampedLimit)));
  }

  const settled = await Promise.all(tasks);
  const merged: VisualMediaItem[] = [];
  const seenUrls = new Set<string>();

  const pushUnique = (lists: VisualMediaItem[][]) => {
    for (const list of lists) {
      for (const item of list) {
        if (seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        merged.push(item);
        if (merged.length >= clampedLimit) break;
      }
      if (merged.length >= clampedLimit) break;
    }
  };

  pushUnique(settled);

  // Broaden fallback automatically when a multi-word descriptive query returns 0 hits
  if (merged.length === 0) {
    const tokens = query
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    if (tokens.length > 2) {
      const relaxedQuery = tokens.slice(0, 2).join(' ');
      const retryTasks: Array<Promise<VisualMediaItem[]>> = [
        searchWikimediaMedia(relaxedQuery, mediaType, clampedLimit),
      ];
      if (mediaType === 'all' || mediaType === 'image') {
        retryTasks.push(searchOpenverseImages(relaxedQuery, clampedLimit));
      }
      pushUnique(await Promise.all(retryTasks));
    }
  }

  const imageBlocks: Array<{ type: 'image'; data: string; mimeType: string; mime_type: string }> = [];

  if (attachVisionThumbnails && merged.length > 0) {
    const thumbTargets = merged.slice(0, 4);
    const fetchedThumbs = await Promise.all(
      thumbTargets.map(async (item) => {
        if (!item.thumbnailUrl) return null;
        const img = await fetchImageBase64(item.thumbnailUrl);
        return { item, img };
      })
    );

    for (const entry of fetchedThumbs) {
      if (entry?.img) {
        entry.item.visionAttached = true;
        imageBlocks.push({
          type: 'image',
          data: entry.img.data,
          mimeType: entry.img.mimeType,
          mime_type: entry.img.mimeType,
        });
      }
    }
  }

  return {
    query,
    mediaTypeFilter: mediaType,
    items: merged,
    imageBlocks,
  };
}

export interface BuiltinSfxEntry {
  name: string;
  category: 'transition' | 'ui' | 'camera' | 'emphasis' | 'comedy';
  url: string;
  description: string;
}

export const REMOTION_BUILTIN_SFX: BuiltinSfxEntry[] = [
  { name: 'whoosh', category: 'transition', url: 'https://remotion.media/whoosh.wav', description: 'Smooth air whoosh for camera pans, slides, and scene transitions' },
  { name: 'whip', category: 'transition', url: 'https://remotion.media/whip.wav', description: 'Fast whip-pan swoosh for snappy cuts and kinetic motion' },
  { name: 'pageTurn', category: 'transition', url: 'https://remotion.media/page-turn.wav', description: 'Tactile paper page turn for documentary, book, or timeline shifts' },
  { name: 'uiSwitch', category: 'ui', url: 'https://remotion.media/switch.wav', description: 'Clean UI toggle switch click for cards, stats, and interface reveals' },
  { name: 'mouseClick', category: 'ui', url: 'https://remotion.media/mouse-click.wav', description: 'Crisp mouse click for cursor interactions and button taps' },
  { name: 'ding', category: 'emphasis', url: 'https://remotion.media/ding.wav', description: 'Bright chime ding for key insights, tips, or positive milestones' },
  { name: 'snapchatNotification', category: 'ui', url: 'https://remotion.media/snapchat-notification.wav', description: 'Notification pop sound for incoming badges or alerts' },
  { name: 'shutterModern', category: 'camera', url: 'https://remotion.media/shutter-modern.wav', description: 'Modern DSLR shutter snap for photo reveals and freeze-frames' },
  { name: 'shutterOld', category: 'camera', url: 'https://remotion.media/shutter-old.wav', description: 'Vintage mechanical camera shutter for historical or archival shots' },
  { name: 'vineBoom', category: 'emphasis', url: 'https://remotion.media/vine-boom.wav', description: 'Heavy low-end boom hit for dramatic reveals or punchlines' },
  { name: 'dramaticBoomer', category: 'emphasis', url: 'https://remotion.media/dramatic-boomer.wav', description: 'Deep cinematic impact boom for major turning points' },
  { name: 'recordScratch', category: 'emphasis', url: 'https://remotion.media/record-scratch.wav', description: 'Vinyl record scratch for abrupt plot twists or pattern interrupts' },
  { name: 'windowsXpError', category: 'comedy', url: 'https://remotion.media/windows-xp-error.wav', description: 'Retro OS error chime for tech glitches or humorous mistakes' },
  { name: 'loadingLag', category: 'ui', url: 'https://remotion.media/loading-lag.wav', description: 'Loading/buffering cue for suspense or tech pacing' },
  { name: 'animeWow', category: 'comedy', url: 'https://remotion.media/anime-wow.wav', description: 'Expressive anime wow reaction' },
  { name: 'yippee', category: 'comedy', url: 'https://remotion.media/yippee.wav', description: 'Playful celebratory reaction' },
  { name: 'bruh', category: 'comedy', url: 'https://remotion.media/bruh.wav', description: 'Deadpan reaction sound' },
  { name: 'triggered', category: 'comedy', url: 'https://remotion.media/triggered.wav', description: 'High-intensity glitch/alarm emphasis' },
];

export async function searchSfxCatalog(
  query: string,
  category?: string,
  includeWebFoley = false
) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const rankedBuiltin = REMOTION_BUILTIN_SFX.map((entry) => {
    if (category && category !== 'all' && entry.category !== category) {
      return { entry, score: -1 };
    }
    const haystack = `${entry.name} ${entry.category} ${entry.description}`.toLowerCase();
    let score = terms.length === 0 ? 1 : 0;
    for (const t of terms) {
      if (haystack.includes(t)) score += 2;
    }
    return { entry, score };
  })
    .filter((x) => x.score >= (terms.length > 0 ? 2 : 0))
    .sort((a, b) => b.score - a.score)
    .map((x) => ({
      ...x.entry,
      source: '@remotion/sfx',
      importCode: `import { ${x.entry.name} } from '@remotion/sfx';`,
      usageSnippet: `<Sequence from={triggerFrame} durationInFrames={45}><Audio src={${x.entry.name}} volume={0.55} /></Sequence>`,
    }));

  const webFoley: Array<{
    name: string;
    source: string;
    url: string;
    usageSnippet: string;
  }> = [];

  if (includeWebFoley || rankedBuiltin.length === 0) {
    const cleanQ = query.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    if (cleanQ) {
      const iaUrl =
        `https://archive.org/advancedsearch.php?q=mediatype:audio+AND+(sound+effect+OR+sfx+OR+foley+OR+ambience)+AND+${encodeURIComponent(cleanQ)}` +
        `&fl[]=identifier,title&sort[]=downloads+desc&rows=5&output=json`;
      const iaData = await fetchJsonWithTimeout(iaUrl, 5000);
      const docs = Array.isArray(iaData?.response?.docs) ? iaData.response.docs : [];
      for (const doc of docs.slice(0, 3)) {
        const meta = await fetchJsonWithTimeout(`https://archive.org/metadata/${doc.identifier}`, 4000);
        const files = Array.isArray(meta?.files) ? meta.files : [];
        const audioFile = files.find(
          (f: any) =>
            typeof f?.name === 'string' &&
            /\.(mp3|wav|ogg)$/i.test(f.name) &&
            !String(f.name).includes('_vbr') &&
            (!f.size || Number(f.size) < 12 * 1024 * 1024)
        );
        if (audioFile) {
          const directUrl = `https://archive.org/download/${doc.identifier}/${encodeURIComponent(audioFile.name)}`;
          webFoley.push({
            name: String(doc.title || doc.identifier),
            source: 'internet_archive',
            url: directUrl,
            usageSnippet: `<Sequence from={triggerFrame} durationInFrames={90}><Audio src="${directUrl}" volume={0.45} /></Sequence>`,
          });
        }
      }
    }
  }

  return {
    query,
    builtinMatches: rankedBuiltin,
    allBuiltinNames: REMOTION_BUILTIN_SFX.map((s) => s.name),
    webFoleyMatches: webFoley,
  };
}

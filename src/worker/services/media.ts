const USER_AGENT = 'Remotion-Cloud-MCP-Studio/7.0 (https://github.com/chibaole123a-ops/remotion-mcp)';

export interface VisualMediaItem {
  id: string;
  source: 'wikimedia' | 'openverse' | 'internet_archive' | 'pexels' | 'pixabay' | 'nasa' | 'wikipedia';
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

async function searchPexelsMedia(
  query: string,
  mediaType: 'all' | 'image' | 'video',
  limit: number,
  apiKey?: string
): Promise<VisualMediaItem[]> {
  if (!apiKey) return [];
  const items: VisualMediaItem[] = [];
  const headers = { Authorization: apiKey, 'User-Agent': USER_AGENT };

  const fetchList = async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  if (mediaType === 'all' || mediaType === 'video') {
    const vData: any = await fetchList(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${Math.min(5, limit)}&orientation=landscape`
    );
    for (const v of vData?.videos || []) {
      const hd =
        (v.video_files || []).find((f: any) => f.file_type === 'video/mp4' && Number(f.width) >= 1280 && Number(f.width) <= 1920) ||
        (v.video_files || []).find((f: any) => f.file_type === 'video/mp4');
      if (!hd?.link) continue;
      items.push({
        id: `pexels-vid-${v.id}`,
        source: 'pexels',
        mediaType: 'video',
        title: v.user?.name ? `Pexels B-Roll by ${v.user.name}` : `Pexels Video ${v.id}`,
        url: hd.link,
        thumbnailUrl: v.image,
        width: hd.width || v.width,
        height: hd.height || v.height,
        license: 'Pexels License',
      });
    }
  }

  if ((mediaType === 'all' || mediaType === 'image') && items.length < limit) {
    const pData: any = await fetchList(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(5, limit)}`
    );
    for (const p of pData?.photos || []) {
      const url = p?.src?.large2x || p?.src?.original;
      if (!url) continue;
      items.push({
        id: `pexels-img-${p.id}`,
        source: 'pexels',
        mediaType: 'image',
        title: p.alt || `Pexels Photo ${p.id}`,
        url,
        thumbnailUrl: p?.src?.medium || url,
        width: p.width,
        height: p.height,
        license: 'Pexels License',
      });
    }
  }
  return items.slice(0, limit);
}

async function searchPixabayMedia(
  query: string,
  mediaType: 'all' | 'image' | 'video',
  limit: number,
  apiKey?: string
): Promise<VisualMediaItem[]> {
  if (!apiKey) return [];
  const items: VisualMediaItem[] = [];

  if (mediaType === 'all' || mediaType === 'video') {
    const vData = await fetchJsonWithTimeout(
      `https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&per_page=${Math.min(5, limit)}`,
      5000
    );
    for (const hit of vData?.hits || []) {
      const vid = hit?.videos?.large || hit?.videos?.medium;
      if (!vid?.url) continue;
      items.push({
        id: `pixabay-vid-${hit.id}`,
        source: 'pixabay',
        mediaType: 'video',
        title: hit.tags || `Pixabay Video ${hit.id}`,
        url: vid.url,
        thumbnailUrl: hit.userImageURL || undefined,
        width: vid.width,
        height: vid.height,
        license: 'Pixabay Content License',
      });
    }
  }

  if ((mediaType === 'all' || mediaType === 'image') && items.length < limit) {
    const pData = await fetchJsonWithTimeout(
      `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&image_type=photo&min_width=1200&per_page=${Math.min(5, limit)}`,
      5000
    );
    for (const hit of pData?.hits || []) {
      const url = hit?.largeImageURL || hit?.webformatURL;
      if (!url) continue;
      items.push({
        id: `pixabay-img-${hit.id}`,
        source: 'pixabay',
        mediaType: 'image',
        title: hit.tags || `Pixabay Photo ${hit.id}`,
        url,
        thumbnailUrl: hit.previewURL || url,
        width: hit.imageWidth,
        height: hit.imageHeight,
        license: 'Pixabay Content License',
      });
    }
  }
  return items.slice(0, limit);
}

async function searchNasaMedia(
  query: string,
  mediaType: 'all' | 'image' | 'video',
  limit: number
): Promise<VisualMediaItem[]> {
  const mediaParam = mediaType === 'all' ? 'image,video' : mediaType;
  const apiUrl = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=${mediaParam}&page_size=${Math.min(8, limit * 2)}`;
  const data = await fetchJsonWithTimeout(apiUrl, 5000);
  const rawItems = Array.isArray(data?.collection?.items) ? data.collection.items : [];
  const items: VisualMediaItem[] = [];

  const resolved = await Promise.all(
    rawItems.slice(0, Math.min(5, limit * 2)).map(async (entry: any) => {
      const meta = entry?.data?.[0];
      if (!meta?.nasa_id) return null;
      const kind = meta.media_type === 'video' ? 'video' : 'image';
      const previewLink = Array.isArray(entry.links)
        ? entry.links.find((l: any) => l?.rel === 'preview' && typeof l?.href === 'string')?.href
        : undefined;

      let directUrl: string | undefined = kind === 'image' ? previewLink : undefined;
      if (typeof entry.href === 'string' && entry.href.startsWith('https://')) {
        const manifest = await fetchJsonWithTimeout(entry.href, 3500);
        if (Array.isArray(manifest)) {
          const urls = manifest.filter((u): u is string => typeof u === 'string');
          if (kind === 'video') {
            directUrl =
              urls.find((u) => /~medium\.mp4$/i.test(u)) ||
              urls.find((u) => /~small\.mp4$/i.test(u)) ||
              urls.find((u) => /\.mp4$/i.test(u));
          } else {
            directUrl =
              urls.find((u) => /~large\.jpg$/i.test(u)) ||
              urls.find((u) => /~medium\.jpg$/i.test(u)) ||
              urls.find((u) => /\.(jpe?g|png)$/i.test(u)) ||
              previewLink;
          }
        }
      }

      if (!directUrl) return null;
      return {
        id: `nasa-${meta.nasa_id}`,
        source: 'nasa' as const,
        mediaType: kind as 'image' | 'video',
        title: String(meta.title || meta.nasa_id),
        url: directUrl,
        thumbnailUrl: previewLink || (kind === 'image' ? directUrl : undefined),
        license: 'NASA Public Domain',
      };
    })
  );

  for (const item of resolved) {
    if (item) items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

async function searchWikipediaMedia(query: string, limit: number): Promise<VisualMediaItem[]> {
  const langs = /[À-ỹ]/i.test(query) ? ['vi', 'en'] : ['en', 'vi'];
  const perLangResults = await Promise.all(
    langs.map(async (lang) => {
      const apiUrl =
        `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search` +
        `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${Math.min(5, limit + 1)}` +
        `&prop=pageimages&pithumbsize=1400&piprop=original|thumbnail&format=json&origin=*`;
      const data = await fetchJsonWithTimeout(apiUrl, 4500);
      const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
      const found: VisualMediaItem[] = [];
      for (const page of pages as any[]) {
        const origUrl = page?.original?.source;
        const thumbUrl = page?.thumbnail?.source;
        const chosenUrl = origUrl || thumbUrl;
        if (!chosenUrl || /\.(svg|tiff?)($|\?)/i.test(chosenUrl)) continue;
        const width = Number(page?.original?.width || page?.thumbnail?.width || 0) || undefined;
        const height = Number(page?.original?.height || page?.thumbnail?.height || 0) || undefined;
        if (width && height && (width < 320 || height < 240)) continue;
        found.push({
          id: `wiki-${lang}-${page.pageid}`,
          source: 'wikipedia',
          mediaType: 'image',
          title: String(page.title || query),
          url: chosenUrl,
          thumbnailUrl: thumbUrl || chosenUrl,
          width,
          height,
          license: `Wikipedia (${lang.toUpperCase()})`,
        });
      }
      return found;
    })
  );

  const combined: VisualMediaItem[] = [];
  for (const list of perLangResults) {
    for (const item of list) {
      if (!combined.some((x) => x.url === item.url)) combined.push(item);
      if (combined.length >= limit) return combined;
    }
  }
  return combined;
}

export async function searchVisualMedia(
  query: string,
  mediaType: 'all' | 'image' | 'video' = 'all',
  limit = 5,
  attachVisionThumbnails = true,
  apiKeys?: { pexelsKey?: string; pixabayKey?: string }
): Promise<VisualMediaSearchResult> {
  const clampedLimit = Math.max(1, Math.min(8, limit));

  const tasks: Array<Promise<VisualMediaItem[]>> = [
    ...(apiKeys?.pexelsKey ? [searchPexelsMedia(query, mediaType, clampedLimit, apiKeys.pexelsKey)] : []),
    ...(apiKeys?.pixabayKey ? [searchPixabayMedia(query, mediaType, clampedLimit, apiKeys.pixabayKey)] : []),
    searchWikimediaMedia(query, mediaType, clampedLimit),
    searchNasaMedia(query, mediaType, Math.min(4, clampedLimit)),
  ];
  if (mediaType === 'all' || mediaType === 'image') {
    tasks.push(searchOpenverseImages(query, clampedLimit));
    tasks.push(searchWikipediaMedia(query, clampedLimit));
  }
  if (mediaType === 'all' || mediaType === 'video') {
    tasks.push(searchInternetArchiveVideos(query, Math.min(3, clampedLimit)));
  }

  const settled = await Promise.all(tasks);
  const pool: VisualMediaItem[] = [];
  const seenUrls = new Set<string>();

  const pushUnique = (lists: VisualMediaItem[][]) => {
    for (const list of lists) {
      for (const item of list) {
        if (seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        pool.push(item);
      }
    }
  };

  pushUnique(settled);

  // Broaden fallback automatically when a multi-word descriptive query returns 0 hits
  if (pool.length === 0) {
    const tokens = query
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    if (tokens.length > 2) {
      const relaxedQuery = tokens.slice(0, 2).join(' ');
      const retryTasks: Array<Promise<VisualMediaItem[]>> = [
        searchWikimediaMedia(relaxedQuery, mediaType, clampedLimit),
        searchNasaMedia(relaxedQuery, mediaType, Math.min(3, clampedLimit)),
      ];
      if (mediaType === 'all' || mediaType === 'image') {
        retryTasks.push(searchOpenverseImages(relaxedQuery, clampedLimit));
        retryTasks.push(searchWikipediaMedia(relaxedQuery, clampedLimit));
      }
      pushUnique(await Promise.all(retryTasks));
    }
  }

  // Rank HD landscape assets first so full-frame Ken Burns shots never pixelate
  const scoreResolution = (it: VisualMediaItem) => {
    const w = Number(it.width || 0);
    const h = Number(it.height || 0);
    const isLandscape = w > 0 && h > 0 ? w >= h : true;
    return (it.mediaType === 'video' ? 40 : 0) + (w >= 1200 ? 30 : w >= 800 ? 15 : 0) + (isLandscape ? 10 : 0);
  };
  const merged = pool.sort((a, b) => scoreResolution(b) - scoreResolution(a)).slice(0, clampedLimit);

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

  const shouldSearchFoley = includeWebFoley || category === 'ambience' || rankedBuiltin.length === 0;
  if (shouldSearchFoley) {
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
    mixingTip:
      '5-Layer Studio Mix: layer subtle ambience/room-tone at volume 0.08-0.14 behind Voiceover (1.0) + smooth-ducked BGM + lead-in transition SFX (-5 frames) + impact/hit SFX.',
  };
}

const WATERMARKED_STOCK_DOMAIN_RE =
  /(^|\.)(shutterstock|gettyimages|istockphoto|alamy|123rf|dreamstime|depositphotos|vecteezy|stock\.adobe|megapixl|canstockphoto|pond5|bigstockphoto|dissolve|storyblocks)\./i;

const WATERMARK_URL_HINT_RE = /(watermark|wm=|\/sample[-_]?image|\/comp[-_]?image)/i;

function isBlockedPrivateHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host) return true;
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost') ||
    host.endsWith('.arpa')
  ) {
    return true;
  }
  // Reject integer or hex IPv4 aliases (e.g. 2130706433, 0x7f000001)
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) return true;

  // IPv4 RFC1918 / loopback / link-local / CGNAT
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  // IPv6 loopback, unspecified, link-local, unique-local, IPv4-mapped
  if (
    host === '::1' ||
    host === '::' ||
    host.startsWith('fe80:') ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.includes('::ffff:127.') ||
    host.includes('::ffff:10.') ||
    host.includes('::ffff:192.168.') ||
    host.includes('::ffff:169.254.')
  ) {
    return true;
  }

  return false;
}

export function validatePublicMediaUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: `Unsupported protocol "${parsed.protocol}" (only http/https allowed).` };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'Embedded URL credentials are not allowed.' };
  }

  if (isBlockedPrivateHostname(parsed.hostname)) {
    return { ok: false, reason: `Blocked private, loopback, or metadata host "${parsed.hostname}" (SSRF guard).` };
  }

  if (WATERMARKED_STOCK_DOMAIN_RE.test(parsed.hostname)) {
    return {
      ok: false,
      reason: `Rejected watermarked commercial stock domain "${parsed.hostname}". Use clean sources (Wikimedia, NASA, Wikipedia, Openverse, Pexels, Pixabay, Internet Archive, or non-watermarked editorial/brand CDNs).`,
    };
  }

  if (WATERMARK_URL_HINT_RE.test(parsed.pathname + parsed.search)) {
    return { ok: false, reason: 'URL path/query indicates a watermarked preview sample.' };
  }

  return { ok: true, url: parsed };
}

function extractMetaMediaFromHtml(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:video(?::url|:secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?::url|:secure_url)?["']/i,
    /<meta[^>]+property=["']og:image(?::url|:secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url|:secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) {
      try {
        const unescaped = match[1].trim().replace(/&amp;/g, '&').replace(/&#0*38;/g, '&');
        const resolved = new URL(unescaped, baseUrl).toString();
        const check = validatePublicMediaUrl(resolved);
        if (check.ok) return resolved;
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function fetchWithValidatedRedirects(
  startUrl: string,
  init: RequestInit,
  timeoutMs = 5500,
  maxHops = 4
): Promise<{ res: Response; finalUrl: string } | { error: string }> {
  let currentUrl = startUrl;
  for (let hop = 0; hop <= maxHops; hop++) {
    const check = validatePublicMediaUrl(currentUrl);
    if (!check.ok) return { error: check.reason };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(currentUrl, {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          ...(init.headers || {}),
        },
      });
      clearTimeout(timer);

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        try {
          await res.body?.cancel();
        } catch {}
        if (!loc) return { error: `HTTP ${res.status} redirect without Location header.` };
        currentUrl = new URL(loc, currentUrl).toString();
        continue;
      }
      return { res, finalUrl: currentUrl };
    } catch (err: any) {
      clearTimeout(timer);
      return { error: err?.name === 'AbortError' ? 'Request timed out' : err?.message || 'Network error' };
    }
  }
  return { error: 'Too many redirects (> 4).' };
}

export interface ExternalAssetVerificationResult {
  verified: boolean;
  inputUrl: string;
  resolvedUrl?: string;
  extractedFromPage?: boolean;
  mediaType?: 'image' | 'video' | 'audio';
  mimeType?: string;
  contentLengthBytes?: number;
  visionAttached: boolean;
  reason: string;
  imageBlock?: { type: 'image'; data: string; mimeType: string; mime_type: string };
}

export async function verifyExternalAsset(
  rawUrl: string,
  expectedType: 'auto' | 'image' | 'video' | 'audio' = 'auto',
  attachVisionThumbnail = true,
  depth = 0
): Promise<ExternalAssetVerificationResult> {
  const initialCheck = validatePublicMediaUrl(rawUrl);
  if (!initialCheck.ok) {
    return {
      verified: false,
      inputUrl: rawUrl,
      visionAttached: false,
      reason: initialCheck.reason,
    };
  }

  // Probe with HEAD first; fallback to tiny Range GET if server rejects HEAD
  let probe = await fetchWithValidatedRedirects(initialCheck.url.toString(), { method: 'HEAD' }, 5000);
  if ('error' in probe) {
    return {
      verified: false,
      inputUrl: rawUrl,
      visionAttached: false,
      reason: `Fetch failed: ${probe.error}`,
    };
  }

  if (probe.res.status === 405 || probe.res.status === 403 || probe.res.status === 501) {
    try {
      await probe.res.body?.cancel();
    } catch {}
    probe = await fetchWithValidatedRedirects(
      probe.finalUrl,
      { method: 'GET', headers: { Range: 'bytes=0-2047' } },
      5500
    );
    if ('error' in probe) {
      return {
        verified: false,
        inputUrl: rawUrl,
        visionAttached: false,
        reason: `Fetch failed: ${probe.error}`,
      };
    }
  }

  const { res, finalUrl } = probe;
  if (!res.ok) {
    try {
      await res.body?.cancel();
    } catch {}
    return {
      verified: false,
      inputUrl: rawUrl,
      resolvedUrl: finalUrl,
      visionAttached: false,
      reason: `Remote server returned HTTP ${res.status}.`,
    };
  }

  const rawMime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const lenHeader = res.headers.get('content-length');
  const contentLengthBytes = lenHeader ? Number(lenHeader) : undefined;
  try {
    await res.body?.cancel();
  } catch {}

  // If URL is an HTML article/page (only unwrap 1 hop), attempt safe og:image / og:video extraction
  if ((rawMime.includes('text/html') || rawMime.includes('xhtml')) && depth === 0) {
    const htmlFetch = await fetchWithValidatedRedirects(finalUrl, { method: 'GET' }, 5500);
    if (!('error' in htmlFetch) && htmlFetch.res.ok) {
      try {
        const reader = htmlFetch.res.body?.getReader();
        let htmlSnippet = '';
        if (reader) {
          const decoder = new TextDecoder();
          while (htmlSnippet.length < 65536) {
            const { value, done } = await reader.read();
            if (done) break;
            htmlSnippet += decoder.decode(value, { stream: true });
            if (htmlSnippet.includes('</head>')) break;
          }
          try {
            await reader.cancel();
          } catch {}
        }
        const extractedUrl = extractMetaMediaFromHtml(htmlSnippet, htmlFetch.finalUrl);
        if (extractedUrl) {
          const nested = await verifyExternalAsset(extractedUrl, expectedType, attachVisionThumbnail, 1);
          return {
            ...nested,
            inputUrl: rawUrl,
            extractedFromPage: true,
          };
        }
      } catch {}
    }
    return {
      verified: false,
      inputUrl: rawUrl,
      resolvedUrl: finalUrl,
      mimeType: rawMime || 'text/html',
      visionAttached: false,
      reason: 'URL returned an HTML webpage instead of a direct media file and no clean og:image/og:video was found.',
    };
  }

  let detectedType: 'image' | 'video' | 'audio' | null = null;
  if (rawMime.startsWith('image/')) detectedType = 'image';
  else if (rawMime.startsWith('video/')) detectedType = 'video';
  else if (rawMime.startsWith('audio/')) detectedType = 'audio';
  else if (/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(finalUrl)) detectedType = 'image';
  else if (/\.(mp4|webm|mov|ogv)(\?|$)/i.test(finalUrl)) detectedType = 'video';
  else if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(finalUrl)) detectedType = 'audio';

  if (!detectedType) {
    return {
      verified: false,
      inputUrl: rawUrl,
      resolvedUrl: finalUrl,
      mimeType: rawMime || 'unknown',
      visionAttached: false,
      reason: `Unsupported or non-media Content-Type "${rawMime || 'unknown'}". Direct image/video/audio required.`,
    };
  }

  if (rawMime.includes('svg') || rawMime.includes('tiff')) {
    return {
      verified: false,
      inputUrl: rawUrl,
      resolvedUrl: finalUrl,
      mediaType: detectedType,
      mimeType: rawMime,
      visionAttached: false,
      reason: `Format "${rawMime}" cannot be safely rasterized/verified in <Img>; use JPG, PNG, WebP, or MP4.`,
    };
  }

  if (expectedType !== 'auto' && detectedType !== expectedType) {
    return {
      verified: false,
      inputUrl: rawUrl,
      resolvedUrl: finalUrl,
      mediaType: detectedType,
      mimeType: rawMime,
      visionAttached: false,
      reason: `Expected "${expectedType}" asset, but URL serves "${detectedType}" (${rawMime}).`,
    };
  }

  if (typeof contentLengthBytes === 'number' && !Number.isNaN(contentLengthBytes)) {
    if (contentLengthBytes > 45 * 1024 * 1024) {
      return {
        verified: false,
        inputUrl: rawUrl,
        resolvedUrl: finalUrl,
        mediaType: detectedType,
        mimeType: rawMime,
        contentLengthBytes,
        visionAttached: false,
        reason: `File size ${(contentLengthBytes / (1024 * 1024)).toFixed(1)} MB exceeds the 45 MB fast-prefetch limit.`,
      };
    }
    if (contentLengthBytes > 0 && contentLengthBytes < 512) {
      return {
        verified: false,
        inputUrl: rawUrl,
        resolvedUrl: finalUrl,
        mediaType: detectedType,
        mimeType: rawMime,
        contentLengthBytes,
        visionAttached: false,
        reason: `File size (${contentLengthBytes} bytes) is suspiciously tiny/corrupt.`,
      };
    }
  }

  let imageBlock: { type: 'image'; data: string; mimeType: string; mime_type: string } | undefined;
  if (detectedType === 'image' && attachVisionThumbnail) {
    const img = await fetchImageBase64(finalUrl, 5000, 350_000);
    if (img) {
      imageBlock = {
        type: 'image',
        data: img.data,
        mimeType: img.mimeType,
        mime_type: img.mimeType,
      };
    }
  }

  return {
    verified: true,
    inputUrl: rawUrl,
    resolvedUrl: finalUrl,
    mediaType: detectedType,
    mimeType: rawMime || detectedType,
    contentLengthBytes,
    visionAttached: Boolean(imageBlock),
    imageBlock,
    reason: imageBlock
      ? 'Verified clean direct media URL and attached Vision preview — inspect visually to confirm no watermarks or broken crops before embedding.'
      : 'Verified clean direct media URL (headers, Content-Type, size, and domain checks passed).',
  };
}

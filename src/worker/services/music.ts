async function verifyDirectAudioReachability(url: string): Promise<{ reachable: boolean; contentType?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Remotion-Cloud-MCP-Studio/7.4' },
      redirect: 'follow',
      signal: controller.signal,
    });
    const ct = res.headers.get('content-type') || undefined;
    return { reachable: res.ok, contentType: ct };
  } catch {
    return { reachable: false };
  } finally {
    clearTimeout(timer);
  }
}

function parseDurationSec(raw: string): number {
  const clean = String(raw || '').trim();
  if (!clean || /live/i.test(clean)) return Infinity;
  const parts = clean.split(':').map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

async function fetchIncompetechTracks(query: string, maxItems: number): Promise<any[]> {
  const stopWords = new Set(['incompetech', 'music', 'bgm', 'royalty', 'free', 'instrumental', 'track']);
  const qTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !stopWords.has(t));
  const fallbackTerms = ['ambient', 'cinematic', 'electronic', 'calm', 'space'];
  const terms = qTerms.length > 0 ? qTerms : fallbackTerms;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://incompetech.com/music/royalty-free/pieces.json', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const catalog: Record<string, any> = await res.json();
    const scored: Array<{ score: number; item: any }> = [];

    for (const item of Object.values(catalog)) {
      if (!item?.filename) continue;
      const text = [item.title, item.genre, item.description, item.feel, item.instruments]
        .join(' ')
        .toLowerCase();

      let score = 0;
      for (const term of terms) {
        if (text.includes(term)) score += 2;
      }
      if (score === 0) {
        for (const fb of fallbackTerms) {
          if (text.includes(fb)) score += 0.5;
        }
      }
      if (score > 0) {
        scored.push({ score, item });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxItems).map(({ item }) => ({
      id: item.isrc || item.title,
      title: item.title,
      duration: item.length || 'N/A',
      channel: 'Kevin MacLeod (Incompetech)',
      genre: item.feel || item.genre,
      url: `https://incompetech.com/music/royalty-free/mp3-royaltyfree/${encodeURIComponent(item.filename)}`,
      directMp3: true,
      sourceType: 'studio_cdn',
    }));
  } catch {
    return [];
  }
}

async function fetchInternetArchiveTracks(query: string, maxItems: number): Promise<any[]> {
  try {
    const cleanQ = query.replace(/[^\w\s]/g, ' ').trim();
    if (!cleanQ) return [];
    const iaUrl = `https://archive.org/advancedsearch.php?q=mediatype:audio+AND+${encodeURIComponent(cleanQ)}&fl[]=identifier,title,creator,downloads&sort[]=downloads+desc&rows=${maxItems * 2}&output=json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const iaRes = await fetch(iaUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!iaRes.ok) return [];
    const iaData: any = await iaRes.json();
    const docs = iaData.response?.docs || [];
    const tracks: any[] = [];

    const metas = await Promise.all(
      docs.slice(0, 4).map(async (doc: any) => {
        try {
          const mc = new AbortController();
          const mt = setTimeout(() => mc.abort(), 4000);
          const metaRes = await fetch(`https://archive.org/metadata/${doc.identifier}`, { signal: mc.signal });
          clearTimeout(mt);
          if (!metaRes.ok) return null;
          return { doc, meta: await metaRes.json() };
        } catch {
          return null;
        }
      })
    );

    for (const pair of metas) {
      if (!pair) continue;
      const { doc, meta } = pair;
      const mp3 = meta.files?.find(
        (f: any) =>
          (f.format === 'VBR MP3' || f.format === 'MP3' || String(f.name).endsWith('.mp3')) &&
          !String(f.name).includes('_vbr')
      );
      if (mp3) {
        const dur = parseFloat(mp3.length || 0);
        if (dur > 900) continue; // Skip >15 min mixes
        const mins = Math.floor(dur / 60);
        const secs = Math.floor(dur % 60);
        tracks.push({
          id: doc.identifier,
          title: doc.title || mp3.title || doc.identifier,
          duration: dur > 0 ? `${mins}:${secs < 10 ? '0' : ''}${secs}` : 'N/A',
          channel: doc.creator || 'Internet Archive',
          url: `https://archive.org/download/${doc.identifier}/${encodeURIComponent(mp3.name)}`,
          directMp3: true,
          sourceType: 'internet_archive',
        });
        if (tracks.length >= maxItems) break;
      }
    }
    return tracks;
  } catch {
    return [];
  }
}

async function fetchYouTubeTracks(query: string, maxItems: number): Promise<any[]> {
  try {
    const qClean = encodeURIComponent(query.trim());
    const ytUrl = `https://www.youtube.com/results?search_query=${qClean}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const ytRes = await fetch(ytUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        Cookie: 'SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg; CONSENT=YES+cb.20210328-04-p0.en+FX+434',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!ytRes.ok) return [];
    const html = await ytRes.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    const sections =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const tracks: any[] = [];

    for (const s of sections) {
      const contents = s.itemSectionRenderer?.contents || [];
      for (const c of contents) {
        const vr = c.videoRenderer;
        if (vr && vr.videoId) {
          const vid = vr.videoId;
          const durText = vr.lengthText?.simpleText || '';
          const durSec = parseDurationSec(durText);
          if (durSec > 900) continue; // Reject 1-10 hour mixes / livestreams

          const directMp3 =
            vid === 'KNnSoRrDb5g' ||
            vr.title?.runs?.[0]?.text?.toLowerCase().includes('không môn đăng hộ đối')
              ? 'https://github.com/chibaole123a-ops/remotion-mcp/releases/download/videos-store/khong-mon-dang-ho-doi.mp3'
              : undefined;
          tracks.push({
            id: vid,
            title: vr.title?.runs?.[0]?.text || '',
            duration: durText,
            channel: vr.ownerText?.runs?.[0]?.text || '',
            url: directMp3 || `https://www.youtube.com/watch?v=${vid}`,
            directMp3: !!directMp3,
            sourceType: directMp3 ? 'studio_cdn' : 'youtube',
          });
          if (tracks.length >= maxItems) break;
        }
      }
      if (tracks.length >= maxItems) break;
    }
    return tracks;
  } catch {
    return [];
  }
}

export async function searchSoundtrackQuery(query: string, limit = 5, verifyLinks = true): Promise<any[]> {
  const clampedLimit = Math.max(1, Math.min(15, limit));
  const [incompList, iaList, ytList] = await Promise.all([
    fetchIncompetechTracks(query, clampedLimit),
    fetchInternetArchiveTracks(query, Math.min(3, clampedLimit)),
    fetchYouTubeTracks(query, clampedLimit),
  ]);

  // Prioritize verified Direct MP3 tracks (Incompetech + Internet Archive) ahead of YouTube streams
  const directTracks = [...incompList, ...iaList, ...ytList.filter((t) => t.directMp3)];
  const streamTracks = ytList.filter((t) => !t.directMp3);

  const merged: any[] = [];
  const seenUrls = new Set<string>();
  const directQuota = streamTracks.length > 0 ? Math.max(2, clampedLimit - 1) : clampedLimit;

  for (const t of directTracks) {
    if (seenUrls.has(t.url)) continue;
    seenUrls.add(t.url);
    merged.push(t);
    if (merged.length >= directQuota) break;
  }
  for (const t of [...streamTracks, ...directTracks]) {
    if (merged.length >= clampedLimit) break;
    if (seenUrls.has(t.url)) continue;
    seenUrls.add(t.url);
    merged.push(t);
  }

  if (!verifyLinks || merged.length === 0) {
    return merged;
  }

  return await Promise.all(
    merged.map(async (track) => {
      const isDirect = Boolean(track.directMp3);
      const speechClashRisk =
        track.sourceType === 'studio_cdn' || track.channel === 'Kevin MacLeod (Incompetech)'
          ? 'low (instrumental studio track)'
          : 'medium (verify volume ducking if track contains vocals)';

      if (!isDirect) {
        return {
          ...track,
          verifiedReachable: false,
          requiresExtractor: true,
          reliabilityNote: 'YouTube stream may be rate-limited by bot checks on Cloud runners; prefer directMp3=true tracks first.',
          speechClashRisk,
          recommendedDuckingVolume: 'volume={(f) => ...} (0.12 - 0.18 during speech)',
        };
      }

      const check = await verifyDirectAudioReachability(track.url);
      return {
        ...track,
        verifiedReachable: check.reachable,
        contentType: check.contentType,
        speechClashRisk,
        recommendedDuckingVolume: 'volume={(f) => ...} (0.12 - 0.18 during speech)',
      };
    })
  );
}

import fs from 'fs';

const tsxB64 = process.env.TSX_B64 || '';
const durationEnv = Number(process.env.DURATION || 600);
const fpsEnv = Number(process.env.FPS || 30);
const widthEnv = Number(process.env.WIDTH || 1920);
const heightEnv = Number(process.env.HEIGHT || 1080);

fs.mkdirSync('public', { recursive: true });
fs.mkdirSync('src/remotion/public', { recursive: true });

// Generate a sleek SVG fallback image if an external URL times out or 404s
function writeFallbackSvg(filePath, index) {
  const palettes = [
    ['#090d16', '#1e1b4b', '#0ea5e9'],
    ['#0f172a', '#31102f', '#f43f5e'],
    ['#042f2e', '#0f172a', '#10b981'],
    ['#1e1b4b', '#3b0764', '#a855f7'],
  ];
  const [c1, c2, c3] = palettes[index % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="55%" stop-color="${c2}" />
        <stop offset="100%" stop-color="${c3}" stop-opacity="0.6" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c3}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="${c1}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#bg)" />
    <circle cx="640" cy="360" r="420" fill="url(#glow)" />
  </svg>`;
  fs.writeFileSync(filePath, svg, 'utf-8');
}

async function fetchWithTimeout(url, timeoutMs = 15000, acceptHeader = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: acceptHeader,
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: (res.headers.get('content-type') || '').toLowerCase(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function prefetchExternalMedia(code) {
  let updatedCode = code;

  // 1. Pre-fetch external video URLs (.mp4, .webm, .mov, .ogv) so <OffthreadVideo> plays from local SSD at 60fps
  const videoUrlRegex = /(['"`])(https?:\/\/[^\s'"`]+\.(?:mp4|webm|mov|ogv)(?:\?[^\s'"`]*)?)\1/gi;
  const videoMatches = [...updatedCode.matchAll(videoUrlRegex)];
  const uniqueVideoUrls = [...new Set(videoMatches.map((m) => m[2]))];
  const urlToLocalFile = new Map();

  if (uniqueVideoUrls.length > 0) {
    await Promise.all(
      uniqueVideoUrls.map(async (url, idx) => {
        const extMatch = url.match(/\.(mp4|webm|mov|ogv)(?:\?|$)/i);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'mp4';
        const fileName = `cached-vid-${idx}.${ext}`;
        const outPath = `public/${fileName}`;
        try {
          const { buffer, contentType } = await fetchWithTimeout(url, 25000, 'video/*,*/*;q=0.8');
          if (buffer && buffer.length > 4096 && !contentType.includes('text/html')) {
            fs.writeFileSync(outPath, buffer);
            fs.copyFileSync(outPath, `src/remotion/public/${fileName}`);
            urlToLocalFile.set(url, fileName);
            console.log(
              `🎞️ Pre-fetched external video [${idx}]: ${url.slice(0, 70)}... -> ${fileName} (${(
                buffer.length /
                (1024 * 1024)
              ).toFixed(2)} MB)`
            );
            return;
          }
        } catch (err) {
          console.warn(`⚠️ Video pre-fetch warning for ${url.slice(0, 60)}:`, err?.message || err);
        }
      })
    );
  }

  // 2. Pre-fetch external audio URLs (.mp3, .wav, .m4a, .aac, .ogg), TikTok videos/sounds, or YouTube via yt-dlp / Zing MP3
  const audioUrlRegex = /(['"`])(https?:\/\/[^\s'"`]+\.(?:mp3|wav|m4a|aac|ogg)(?:\?[^\s'"`]*)?|https?:\/\/(?:www\.)?(?:tiktok\.com\/@[^\s'"`]+\/video\/\d+|vt\.tiktok\.com\/[^\s'"`]+|youtube\.com\/watch\?v=[a-zA-Z0-9_-]+|youtu\.be\/[a-zA-Z0-9_-]+))\1/gi;
  const audioMatches = [...updatedCode.matchAll(audioUrlRegex)];
  const uniqueAudioUrls = [...new Set(audioMatches.map((m) => m[2]))];

  if (uniqueAudioUrls.length > 0) {
    const isPreviewMode = process.env.PREVIEW_MODE === 'true';
    await Promise.all(
      uniqueAudioUrls.map(async (url, idx) => {
        const isStreaming = /tiktok\.com|youtube\.com|youtu\.be/i.test(url);
        const fileName = `cached-audio-${idx}.mp3`;
        const outPath = `public/${fileName}`;
        let downloaded = false;

        if (isPreviewMode && fs.existsSync('public/bgm.mp3')) {
          fs.copyFileSync('public/bgm.mp3', outPath);
          fs.copyFileSync('public/bgm.mp3', `src/remotion/public/${fileName}`);
          urlToLocalFile.set(url, fileName);
          console.log(`⚡ PREVIEW_MODE: Skipped audio download [${idx}] -> ${fileName}`);
          return;
        }

        try {
          if (isStreaming) {
            console.log(`🎵 Extracting audio track via yt-dlp [${idx}]: ${url.slice(0, 70)}...`);
            const { execSync } = await import('child_process');
            const cookieFlag = fs.existsSync('cookies.txt') ? '--cookies cookies.txt' : '';
            // Connect to local BotGuard PO Token provider via official youtubepot-bgutilhttp argument
            const extractorArgs = '--extractor-args "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416;youtube:player-client=web,web_safari,mweb"';
            try {
              execSync(`python3 -m yt_dlp --js-runtimes node ${cookieFlag} ${extractorArgs} -x --audio-format mp3 --audio-quality 0 -o "${outPath}" "${url}"`, {
                stdio: ['ignore', 'inherit', 'inherit'],
                timeout: 90000,
              });
              if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1024) {
                downloaded = true;
              }
            } catch (yterr) {
              console.warn(`⚠️ yt-dlp stream download failed (likely bot block or geo-restriction): ${yterr?.message || yterr}`);
            }

            // Autonomous CDN fallback: if yt-dlp is blocked by YouTube bot challenge, resolve song title via oEmbed and stream directly from Zing MP3 CDN
            if (!downloaded && /youtube\.com|youtu\.be/i.test(url)) {
              let cleanQuery = '';
              try {
                console.log(`🔄 Triggering autonomous Zing MP3 CDN resolver for YouTube URL: ${url}`);
                const oembedRes = await fetchWithTimeout(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, 8000);
                if (oembedRes && oembedRes.buffer) {
                  const meta = JSON.parse(oembedRes.buffer.toString('utf-8'));
                  cleanQuery = (meta.title || '')
                    .replace(/\|.*$/i, '')
                    .replace(/\[.*?\]/g, '')
                    .replace(/\(official.*?\)/gi, '')
                    .replace(/\(mv.*?\)/gi, '')
                    .replace(/ft\..*$/i, '')
                    .trim();
                  console.log(`🔎 Resolved YouTube track title: "${cleanQuery}"`);

                  const { ZingMp3 } = await import('zingmp3-api-full');
                  const s = await ZingMp3.search(cleanQuery);
                  const songs = s.data?.items?.[0]?.items || s.data?.songs || [];
                  if (songs.length > 0) {
                    const topSong = songs[0];
                    console.log(`✨ Found Zing MP3 match: "${topSong.title}" - ${topSong.artistsNames} (ID: ${topSong.encodeId})`);
                    try {
                      const songData = await ZingMp3.getSong(topSong.encodeId);
                      console.log(`ZingMp3.getSong response: err=${songData?.err}, msg=${songData?.msg}, dataKeys=${Object.keys(songData?.data || {})}`);
                      const streamUrl = songData?.data?.['128'] || songData?.data?.['320'];
                      if (streamUrl && streamUrl.startsWith('http')) {
                        console.log(`⚡ Downloading direct Zing CDN stream from: ${streamUrl.slice(0, 60)}...`);
                        const audioStreamRes = await fetch(streamUrl, {
                          headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Referer': 'https://zingmp3.vn/'
                          }
                        });
                        if (audioStreamRes.ok) {
                          const arrayBuf = await audioStreamRes.arrayBuffer();
                          if (arrayBuf.byteLength > 10240) {
                            fs.writeFileSync(outPath, Buffer.from(arrayBuf));
                            downloaded = true;
                            console.log(`✅ Autonomously fetched track from Zing CDN (${(arrayBuf.byteLength / (1024 * 1024)).toFixed(2)} MB)`);
                          }
                        }
                      }
                    } catch (zSongErr) {
                      console.warn(`⚠️ ZingMp3.getSong call failed:`, zSongErr?.message || zSongErr);
                    }
                  }
                }
              } catch (zingErr) {
                console.warn(`⚠️ Zing MP3 autonomous fallback failed:`, zingErr?.message || zingErr);
              }

              // Multi-Tier Fallback: If YouTube and Zing MP3 stream are both blocked/empty on runner,
              // check if the track is cached on GitHub Releases Storage CDN (e.g. khong-mon-dang-ho-doi.mp3)
              if (!downloaded) {
                const normQuery = (cleanQuery || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                console.log(`🔍 Checking release CDN cache for query: "${normQuery}"`);
                let releaseCdnUrl = null;
                if (normQuery.includes('khong mon dang ho doi') || url.includes('KNnSoRrDb5g')) {
                  releaseCdnUrl = 'https://github.com/chibaole123a-ops/remotion-mcp/releases/download/videos-store/khong-mon-dang-ho-doi.mp3';
                }

                if (releaseCdnUrl) {
                  console.log(`🚀 Fetching matched track from GitHub Releases Audio Storage CDN: ${releaseCdnUrl}`);
                  try {
                    const cdnRes = await fetch(releaseCdnUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (cdnRes.ok) {
                      const cdnBuf = await cdnRes.arrayBuffer();
                      if (cdnBuf.byteLength > 10240) {
                        fs.writeFileSync(outPath, Buffer.from(cdnBuf));
                        downloaded = true;
                        console.log(`✅ Autonomously retrieved track from Release Storage CDN (${(cdnBuf.byteLength / (1024 * 1024)).toFixed(2)} MB)`);
                      }
                    }
                  } catch (cdnErr) {
                    console.warn(`⚠️ Release CDN fallback failed:`, cdnErr?.message || cdnErr);
                  }
                }
              }
            }
          } else {
            const { buffer, contentType } = await fetchWithTimeout(url, 25000, 'audio/*,*/*;q=0.8');
            if (buffer && buffer.length > 1024 && !contentType.includes('text/html')) {
              fs.writeFileSync(outPath, buffer);
              downloaded = true;
            }
          }

          if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1024) {
            fs.copyFileSync(outPath, `src/remotion/public/${fileName}`);
            urlToLocalFile.set(url, fileName);
            console.log(`🎶 Cached soundtrack [${idx}]: -> ${fileName}`);
          } else {
            throw new Error(`Audio file was not written or empty`);
          }
        } catch (err) {
          console.warn(`⚠️ Audio pre-fetch warning for ${url.slice(0, 60)}:`, err?.message || err);
          // Safe fallback: if an external stream fails to download, alias it to the studio bgm so Remotion never crashes and is never silent!
          if (fs.existsSync('public/bgm.mp3')) {
            fs.copyFileSync('public/bgm.mp3', outPath);
            fs.copyFileSync('public/bgm.mp3', `src/remotion/public/${fileName}`);
            urlToLocalFile.set(url, fileName);
            console.log(`🛡️ Safely protected render from audio failure: aliased ${url.slice(0, 40)}... to fallback studio BGM`);
          }
        }
      })
    );
  }

  // 3. Pre-fetch external image URLs (Wikimedia, Openverse, Liveflickr, NASA, Unsplash, Pollinations, etc.)
  const imageUrlRegex = /(['"`])(https?:\/\/(?:image\.pollinations\.ai\/[^\s'"`]+|images\.unsplash\.com\/[^\s'"`]+|picsum\.photos\/[^\s'"`]+|upload\.wikimedia\.org\/[^\s'"`]+|live\.staticflickr\.com\/[^\s'"`]+|[^\s'"`]+\.(?:png|jpg|jpeg|webp|gif|svg)(?:\?[^\s'"`]*)?))\1/gi;
  const imageMatches = [...updatedCode.matchAll(imageUrlRegex)];
  const uniqueImageUrls = [...new Set(imageMatches.map((m) => m[2]))].filter(
    (u) => !urlToLocalFile.has(u) && !/\.(?:mp4|webm|mov|ogv)(?:\?|$)/i.test(u)
  );

  if (uniqueImageUrls.length > 0) {
    await Promise.all(
      uniqueImageUrls.map(async (url, idx) => {
        let fileName = `cached-img-${idx}.jpg`;
        let outPath = `public/${fileName}`;
        try {
          let resObj;
          try {
            resObj = await fetchWithTimeout(url, 14000);
          } catch {
            resObj = await fetchWithTimeout(url, 14000);
          }
          if (
            resObj &&
            resObj.buffer &&
            resObj.buffer.length > 256 &&
            !resObj.contentType.includes('text/html')
          ) {
            if (resObj.contentType.includes('svg')) {
              fileName = `cached-img-${idx}.svg`;
              outPath = `public/${fileName}`;
            } else if (resObj.contentType.includes('png')) {
              fileName = `cached-img-${idx}.png`;
              outPath = `public/${fileName}`;
            }
            fs.writeFileSync(outPath, resObj.buffer);
            fs.copyFileSync(outPath, `src/remotion/public/${fileName}`);
            urlToLocalFile.set(url, fileName);
            console.log(`🖼️ Pre-fetched external image [${idx}]: ${url.slice(0, 70)}... -> ${fileName}`);
            return;
          }
        } catch (err) {
          console.warn(`⚠️ Image pre-fetch fallback for ${url.slice(0, 60)}:`, err?.message || err);
        }
        // Fallback to sleek SVG so Remotion never hangs or shows a broken image
        fileName = `cached-img-${idx}.svg`;
        outPath = `public/${fileName}`;
        writeFallbackSvg(outPath, idx);
        fs.copyFileSync(outPath, `src/remotion/public/${fileName}`);
        urlToLocalFile.set(url, fileName);
      })
    );
  }

  if (urlToLocalFile.size === 0) return updatedCode;

  const hasStaticFileImport = /import\s+\{[^}]*\bstaticFile\b[^}]*\}\s+from\s+['"]remotion['"]/.test(
    updatedCode
  );
  if (!hasStaticFileImport) {
    updatedCode = `import { staticFile as __remotionStaticFile } from 'remotion';\n` + updatedCode;
  }
  const fnName = hasStaticFileImport ? 'staticFile' : '__remotionStaticFile';

  // In JSX attributes (e.g. <Img src="..." />), wrap with curly braces: src={staticFile('...')}.
  // Never wrap JS assignments like `const URL = 'https://...'`, `obj.url = '...'`, or comparisons `=== '...'`.
  function replaceUrlWithStaticFile(sourceCode, regex) {
    return sourceCode.replace(regex, (fullMatch, quote, url, offset, fullStr) => {
      const localFile = urlToLocalFile.get(url);
      if (!localFile) return fullMatch;

      const lookback = fullStr.slice(Math.max(0, offset - 200), offset).trimEnd();
      const isJsAssignmentOrComparison =
        /\b(?:const|let|var|type|interface)\s+[a-zA-Z_$][\w$]*\s*(?::[^=]+)?=\s*$/.test(lookback) ||
        /\.[a-zA-Z_$][\w$]*\s*=\s*$/.test(lookback) ||
        /===\s*$|!==\s*$|==\s*$|!=\s*$/.test(lookback);

      if (lookback.endsWith('=') && !isJsAssignmentOrComparison) {
        return `{${fnName}('${localFile}')}`;
      }
      return `${fnName}('${localFile}')`;
    });
  }

  updatedCode = replaceUrlWithStaticFile(updatedCode, videoUrlRegex);
  updatedCode = replaceUrlWithStaticFile(updatedCode, audioUrlRegex);
  updatedCode = replaceUrlWithStaticFile(updatedCode, imageUrlRegex);

  return updatedCode;
}

async function sanitizeLucideImports(code) {
  const lucideImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]\s*;?/g;
  if (!lucideImportRegex.test(code)) return code;

  try {
    const lucide = await import('lucide-react');
    const availableExports = new Set(Object.keys(lucide));
    const fallbackIcon = availableExports.has('Sparkles')
      ? 'Sparkles'
      : availableExports.has('Circle')
      ? 'Circle'
      : [...availableExports][0];

    return code.replace(lucideImportRegex, (fullMatch, importsBlock) => {
      const specs = importsBlock
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const safeSpecs = specs.map((spec) => {
        const parts = spec.split(/\s+as\s+/);
        const importedName = parts[0].trim();
        const localAlias = (parts[1] || parts[0]).trim();

        if (availableExports.has(importedName)) {
          return spec;
        }
        console.warn(
          `🛡️ Lucide Import Guard: "${importedName}" not found in lucide-react, aliasing "${fallbackIcon} as ${localAlias}"`
        );
        return `${fallbackIcon} as ${localAlias}`;
      });

      return `import { ${safeSpecs.join(', ')} } from 'lucide-react';`;
    });
  } catch (err) {
    console.warn('Could not inspect lucide-react exports:', err);
    return code;
  }
}

async function main() {
  let code = tsxB64
    ? Buffer.from(tsxB64, 'base64').toString('utf-8')
    : fs.readFileSync('src/remotion/DynamicVideo.tsx', 'utf-8');

  // Guard only against missing icon names in lucide-react and prefetch media assets
  code = await sanitizeLucideImports(code);
  code = await prefetchExternalMedia(code);

  fs.writeFileSync('src/remotion/DynamicVideo.tsx', code, 'utf-8');

  const prevMeta = fs.existsSync('src/remotion/meta.json')
    ? JSON.parse(fs.readFileSync('src/remotion/meta.json', 'utf-8'))
    : {};

  // 1. Read actual telemetry from audio synthesis if present
  let finalDuration = durationEnv > 0 ? durationEnv : 300;
  if (fs.existsSync('src/remotion/audio-telemetry.json')) {
    try {
      const telem = JSON.parse(fs.readFileSync('src/remotion/audio-telemetry.json', 'utf-8'));
      if (telem && typeof telem.totalFrames === 'number' && telem.totalFrames > 60) {
        // Auto-lock video duration to real synthesized audio telemetry!
        finalDuration = telem.totalFrames;
        console.log(`🎯 Locked composition duration directly to audio telemetry: ${finalDuration} frames (${(finalDuration / fpsEnv).toFixed(2)}s)`);
      }
    } catch {}
  }

  fs.writeFileSync(
    'src/remotion/meta.json',
    JSON.stringify(
      {
        ...prevMeta,
        durationInFrames: finalDuration,
        fps: fpsEnv,
        width: widthEnv,
        height: heightEnv,
      },
      null,
      2
    ),
    'utf-8'
  );

  // Restore or ensure standard clean RemotionRoot
  const cleanRoot = `import React from 'react';
import { Composition } from 'remotion';
import { DynamicVideo } from './DynamicVideo';
import meta from './meta.json';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DynamicVideo"
      component={DynamicVideo}
      durationInFrames={meta.durationInFrames || 300}
      fps={meta.fps || 30}
      width={meta.width || 1920}
      height={meta.height || 1080}
    />
  );
};
`;
  fs.writeFileSync('src/remotion/Root.tsx', cleanRoot, 'utf-8');

  console.log(
    `✅ Prepared DynamicVideo.tsx and meta.json (${widthEnv}x${heightEnv} @ ${fpsEnv}fps, ${finalDuration} frames) - Pure AI Director Mode`
  );
}

main().catch((err) => {
  console.error('Error in prepare-render.mjs:', err);
  process.exit(1);
});

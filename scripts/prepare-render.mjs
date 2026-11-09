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

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timer);
  }
}

async function prefetchExternalImages(code) {
  // Match direct http/https image URLs inside string literals (e.g. Pollinations, Unsplash, Picsum, Wikimedia, etc.)
  const urlRegex = /(['"`])(https?:\/\/(?:image\.pollinations\.ai\/[^\s'"`]+|images\.unsplash\.com\/[^\s'"`]+|picsum\.photos\/[^\s'"`]+|upload\.wikimedia\.org\/[^\s'"`]+|[^\s'"`]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s'"`]*)?))\1/gi;

  const matches = [...code.matchAll(urlRegex)];
  if (matches.length === 0) return code;

  // Ensure staticFile is imported from 'remotion' if we rewrite URLs to staticFile(...)
  let updatedCode = code;
  const uniqueUrls = [...new Set(matches.map((m) => m[2]))];
  const urlToLocalFile = new Map();

  await Promise.all(
    uniqueUrls.map(async (url, idx) => {
      let fileName = `cached-img-${idx}.jpg`;
      let outPath = `public/${fileName}`;
      try {
        let buf;
        try {
          buf = await fetchWithTimeout(url, 14000);
        } catch {
          // Retry once
          buf = await fetchWithTimeout(url, 14000);
        }
        if (buf && buf.length > 256) {
          fs.writeFileSync(outPath, buf);
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

  // Replace literal URLs with staticFile('cached-img-X.ext') if staticFile is imported, or keep if inside template
  const hasStaticFileImport = /import\s+\{[^}]*\bstaticFile\b[^}]*\}\s+from\s+['"]remotion['"]/.test(
    updatedCode
  );
  if (!hasStaticFileImport) {
    updatedCode = `import { staticFile as __remotionStaticFile } from 'remotion';\n` + updatedCode;
  }
  const fnName = hasStaticFileImport ? 'staticFile' : '__remotionStaticFile';

  updatedCode = updatedCode.replace(urlRegex, (fullMatch, quote, url) => {
    const localFile = urlToLocalFile.get(url);
    if (!localFile) return fullMatch;
    return `${fnName}('${localFile}')`;
  });

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

  code = await sanitizeLucideImports(code);
  code = await prefetchExternalImages(code);

  fs.writeFileSync('src/remotion/DynamicVideo.tsx', code, 'utf-8');

  const prevMeta = fs.existsSync('src/remotion/meta.json')
    ? JSON.parse(fs.readFileSync('src/remotion/meta.json', 'utf-8'))
    : {};

  // Always prefer the exact measured voiceover total frames from generate-studio-audio.mjs
  const finalDuration =
    Number(prevMeta.computedDurationInFrames) > 0
      ? Number(prevMeta.computedDurationInFrames)
      : durationEnv;

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

  console.log(
    `✅ Prepared DynamicVideo.tsx and meta.json (${widthEnv}x${heightEnv} @ ${fpsEnv}fps, ${finalDuration} frames)`
  );
}

main().catch((err) => {
  console.error('Error in prepare-render.mjs:', err);
  process.exit(1);
});

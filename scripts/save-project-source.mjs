import fs from 'fs';

const jobId = process.env.JOB_ID || '';
const title = process.env.VIDEO_TITLE || 'Remotion Video';
const tsxB64 = process.env.TSX_B64 || '';
const audioB64 = process.env.AUDIO_B64 || '';
const width = Number(process.env.WIDTH || 1920);
const height = Number(process.env.HEIGHT || 1080);
const fps = Number(process.env.FPS || 30);
const durationInFrames = Number(process.env.DURATION || 300);

function main() {
  if (!jobId) return;
  fs.mkdirSync('outputs', { recursive: true });

  const tsxCode = tsxB64
    ? Buffer.from(tsxB64, 'base64').toString('utf-8')
    : fs.existsSync('src/remotion/DynamicVideo.tsx')
    ? fs.readFileSync('src/remotion/DynamicVideo.tsx', 'utf-8')
    : '';

  let audioConfig = {};
  if (audioB64.trim()) {
    try {
      audioConfig = JSON.parse(Buffer.from(audioB64, 'base64').toString('utf-8'));
    } catch {}
  }

  let resolvedDuration = durationInFrames;
  if (fs.existsSync('src/remotion/meta.json')) {
    try {
      const meta = JSON.parse(fs.readFileSync('src/remotion/meta.json', 'utf-8'));
      if (typeof meta.durationInFrames === 'number' && meta.durationInFrames > 0) {
        resolvedDuration = meta.durationInFrames;
      }
    } catch {}
  }

  const snapshot = {
    jobId,
    title,
    savedAt: new Date().toISOString(),
    specs: {
      width,
      height,
      fps,
      durationInFrames: resolvedDuration,
    },
    audioConfig,
    tsxCode,
  };

  const outPath = `outputs/project-${jobId}.json`;
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`💾 Saved iterative project source snapshot -> ${outPath}`);
}

try {
  main();
} catch (err) {
  console.warn('⚠️ Project source snapshot skipped:', err?.message || err);
}

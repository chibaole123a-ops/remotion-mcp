import fs from 'fs';
import { execFileSync } from 'child_process';

const jobId = process.env.JOB_ID || '';
const singleFrame = Number(process.env.STILL_FRAME || 0);
const framesCsv = process.env.STILL_FRAMES || '';

function parseFrames() {
  if (framesCsv.trim()) {
    const parsed = framesCsv
      .split(',')
      .map((s) => Math.max(0, Math.floor(Number(s.trim()))))
      .filter((n) => Number.isFinite(n));
    const unique = [...new Set(parsed)].slice(0, 6);
    if (unique.length > 0) return unique;
  }
  return [Math.max(0, Math.floor(Number.isFinite(singleFrame) ? singleFrame : 0))];
}

function renderOneFrame(frameNum, outPath, scale) {
  execFileSync(
    'npx',
    [
      'remotion',
      'still',
      'src/remotion/index.ts',
      'DynamicVideo',
      outPath,
      `--frame=${frameNum}`,
      `--scale=${scale}`,
      '--public-dir=public',
      '--gl=swangle',
      '--log=error',
      '--chromium-options=--disable-dev-shm-usage --no-sandbox',
    ],
    { stdio: ['ignore', 'inherit', 'pipe'] }
  );
}

function main() {
  fs.mkdirSync('outputs', { recursive: true });
  const frames = parseFrames();
  const finalOut = `outputs/still-${jobId}.png`;

  if (frames.length === 1) {
    renderOneFrame(frames[0], finalOut, 0.67);
    console.log(`✅ Captured single preview frame #${frames[0]} -> ${finalOut}`);
    return;
  }

  const tilePaths = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const rawTile = `outputs/_tile-raw-${jobId}-${i}.png`;
    const labeledTile = `outputs/_tile-lbl-${jobId}-${i}.png`;
    renderOneFrame(f, rawTile, 0.45);

    try {
      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-i',
          rawTile,
          '-vf',
          `drawbox=x=12:y=12:w=185:h=40:color=black@0.72:t=fill,drawtext=text='FRAME ${f}':x=24:y=22:fontsize=22:fontcolor=white`,
          labeledTile,
        ],
        { stdio: ['ignore', 'ignore', 'ignore'] }
      );
      tilePaths.push(labeledTile);
    } catch {
      tilePaths.push(rawTile);
    }
  }

  const cols = frames.length <= 2 ? frames.length : frames.length <= 4 ? 2 : 3;
  const rows = Math.ceil(frames.length / cols);

  // Use ffmpeg concat/pattern-less explicit inputs + scale + tile
  const inputArgs = tilePaths.flatMap((p) => ['-i', p]);
  const concatInputs = tilePaths.map((_, idx) => `[${idx}:v]`).join('');
  const filterGraph = `${concatInputs}concat=n=${tilePaths.length}:v=1:a=0,tile=${cols}x${rows}:padding=10:color=0x090d16[out]`;

  execFileSync(
    'ffmpeg',
    ['-y', ...inputArgs, '-filter_complex', filterGraph, '-map', '[out]', finalOut],
    { stdio: ['ignore', 'inherit', 'pipe'] }
  );

  for (let i = 0; i < frames.length; i++) {
    for (const p of [`outputs/_tile-raw-${jobId}-${i}.png`, `outputs/_tile-lbl-${jobId}-${i}.png`]) {
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    }
  }

  console.log(`✅ Captured ${frames.length}-frame Contact Sheet [${frames.join(', ')}] -> ${finalOut}`);
}

try {
  main();
} catch (err) {
  const errMsg = err?.stderr ? String(err.stderr) : err?.message || String(err);
  fs.writeFileSync(`outputs/error-${jobId}.txt`, errMsg, 'utf-8');
  console.error('Preview frame capture failed:', errMsg);
  process.exit(1);
}

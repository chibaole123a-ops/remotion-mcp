import fs from 'fs';
import { execFileSync, spawnSync } from 'child_process';

const jobId = process.env.JOB_ID || '';
const masteringB64 = process.env.AUDIO_MASTERING_B64 || '';
const videoPath = `outputs/video-${jobId}.mp4`;
const masteredTmp = `outputs/video-${jobId}.mastered.mp4`;

function parseMasteringConfig() {
  const defaults = { enabled: true, targetLufs: -14, truePeakDbtp: -1.5 };
  if (!masteringB64.trim()) return defaults;
  try {
    const parsed = JSON.parse(Buffer.from(masteringB64, 'base64').toString('utf-8'));
    return {
      enabled: parsed.enabled !== false,
      targetLufs: Number.isFinite(Number(parsed.targetLufs)) ? Number(parsed.targetLufs) : -14,
      truePeakDbtp: Number.isFinite(Number(parsed.truePeakDbtp)) ? Number(parsed.truePeakDbtp) : -1.5,
    };
  } catch {
    return defaults;
  }
}

function hasAudioStream(filePath) {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'quiet', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', filePath],
      { encoding: 'utf8' }
    );
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

function ensureFaststartRemux() {
  execFileSync(
    'ffmpeg',
    ['-y', '-i', videoPath, '-c', 'copy', '-movflags', '+faststart', masteredTmp],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  if (fs.existsSync(masteredTmp) && fs.statSync(masteredTmp).size > 1024) {
    fs.renameSync(masteredTmp, videoPath);
    console.log('⚡ Applied MP4 +faststart web-streaming optimization.');
  }
}

function main() {
  if (!jobId || !fs.existsSync(videoPath)) return;
  const cfg = parseMasteringConfig();
  if (!cfg.enabled) {
    console.log('ℹ️ Audio mastering disabled by caller.');
    ensureFaststartRemux();
    return;
  }
  if (!hasAudioStream(videoPath)) {
    console.log('ℹ️ Video has no audio stream; skipping audio mastering.');
    ensureFaststartRemux();
    return;
  }

  const targetI = Math.max(-30, Math.min(-8, cfg.targetLufs));
  const targetTp = Math.max(-6, Math.min(-0.5, cfg.truePeakDbtp));

  // Pass 1: Measure loudness (ffmpeg prints loudnorm JSON to stderr even on exit 0)
  const pass1 = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-nostats',
      '-i',
      videoPath,
      '-af',
      `loudnorm=I=${targetI}:TP=${targetTp}:LRA=11:print_format=json`,
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8' }
  );
  const pass1Output = `${pass1.stdout || ''}\n${pass1.stderr || ''}`;

  const jsonMatch = pass1Output.match(/\{\s*"input_i"\s*:[\s\S]*?\}/);
  if (!jsonMatch) {
    console.warn('⚠️ Could not parse loudnorm Pass 1 telemetry; skipping mastering.');
    return;
  }

  const stats = JSON.parse(jsonMatch[0]);
  const measuredI = Number(stats.input_i);
  if (!Number.isFinite(measuredI) || measuredI <= -65) {
    console.log('ℹ️ Audio track is near-silent; skipping loudnorm gain shift.');
    return;
  }

  // Pass 2: Linear loudness normalization + video stream copy (zero video re-encode)
  const filterPass2 =
    `loudnorm=I=${targetI}:TP=${targetTp}:LRA=11` +
    `:measured_I=${stats.input_i}` +
    `:measured_TP=${stats.input_tp}` +
    `:measured_LRA=${stats.input_lra}` +
    `:measured_thresh=${stats.input_thresh}` +
    `:offset=${stats.target_offset}` +
    `:linear=true`;

  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      videoPath,
      '-c:v',
      'copy',
      '-af',
      filterPass2,
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '48000',
      '-movflags',
      '+faststart',
      masteredTmp,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  if (fs.existsSync(masteredTmp) && fs.statSync(masteredTmp).size > 1024) {
    fs.renameSync(masteredTmp, videoPath);
    console.log(
      `🎛️ Studio Two-Pass Audio Mastering complete: ${measuredI} LUFS -> target ${targetI} LUFS (${targetTp} dBTP), video stream copied losslessly.`
    );
  }
}

try {
  main();
} catch (err) {
  if (fs.existsSync(masteredTmp)) {
    try {
      fs.unlinkSync(masteredTmp);
    } catch {}
  }
  console.warn('⚠️ Audio mastering skipped safely:', err?.message || err);
}

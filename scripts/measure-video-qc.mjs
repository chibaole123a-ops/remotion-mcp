import fs from 'fs';
import { execFileSync } from 'child_process';

const jobId = process.env.JOB_ID || '';
const videoPath = `outputs/video-${jobId}.mp4`;
const qcOutPath = `outputs/qc-${jobId}.json`;

function safeRun(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    return (err?.stdout || '') + '\n' + (err?.stderr || '');
  }
}

function main() {
  if (!jobId || !fs.existsSync(videoPath)) {
    return;
  }

  const probeRaw = safeRun('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    videoPath,
  ]);

  let probe = {};
  try {
    probe = JSON.parse(probeRaw);
  } catch {
    probe = {};
  }

  const streams = Array.isArray(probe.streams) ? probe.streams : [];
  const videoStream = streams.find((s) => s.codec_type === 'video');
  const audioStream = streams.find((s) => s.codec_type === 'audio');
  const format = probe.format || {};

  let fps = null;
  if (videoStream?.r_frame_rate && String(videoStream.r_frame_rate).includes('/')) {
    const [num, den] = String(videoStream.r_frame_rate).split('/').map(Number);
    if (den > 0 && Number.isFinite(num)) {
      fps = Number((num / den).toFixed(2));
    }
  }

  let integratedLoudnessLUFS = null;
  let truePeakDBTP = null;

  if (audioStream) {
    const ebuLog = safeRun('ffmpeg', [
      '-nostats',
      '-i', videoPath,
      '-af', 'ebur128=peak=true',
      '-f', 'null',
      '-',
    ]);
    const lufsMatches = [...ebuLog.matchAll(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/g)];
    if (lufsMatches.length > 0) {
      integratedLoudnessLUFS = Number(lufsMatches[lufsMatches.length - 1][1]);
    }
    const peakMatches = [...ebuLog.matchAll(/Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS/g)];
    if (peakMatches.length > 0) {
      truePeakDBTP = Number(peakMatches[peakMatches.length - 1][1]);
    }
  }

  const qcReport = {
    jobId,
    measuredAt: new Date().toISOString(),
    durationSec: format.duration ? Number(Number(format.duration).toFixed(2)) : null,
    fileSizeMB: format.size ? Number((Number(format.size) / (1024 * 1024)).toFixed(2)) : null,
    video: videoStream
      ? {
          codec: videoStream.codec_name || null,
          width: videoStream.width || null,
          height: videoStream.height || null,
          fps,
          bitrateKbps: videoStream.bit_rate ? Math.round(Number(videoStream.bit_rate) / 1000) : null,
          pixFmt: videoStream.pix_fmt || null,
        }
      : null,
    audio: audioStream
      ? {
          present: true,
          codec: audioStream.codec_name || null,
          sampleRateHz: audioStream.sample_rate ? Number(audioStream.sample_rate) : null,
          channels: audioStream.channels || null,
          integratedLoudnessLUFS,
          truePeakDBTP,
        }
      : { present: false },
  };

  fs.writeFileSync(qcOutPath, JSON.stringify(qcReport, null, 2));
  console.log(`✅ Measured QC telemetry written to ${qcOutPath}`);
}

try {
  main();
} catch (err) {
  console.warn('QC measurement skipped safely:', err?.message || err);
}

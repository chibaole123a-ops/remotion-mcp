import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const jobId = process.env.JOB_ID || '';
const repo = process.env.GITHUB_REPOSITORY || 'chibaole123a-ops/remotion-mcp';
const ghToken = process.env.GH_TOKEN || '';

function loadStitchConfig() {
  if (fs.existsSync('outputs/hydrated-stitch.json')) {
    return JSON.parse(fs.readFileSync('outputs/hydrated-stitch.json', 'utf-8'));
  }
  const b64 = process.env.STITCH_B64 || '';
  if (b64.trim()) {
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
  }
  throw new Error('Missing stitchConfig payload.');
}

async function downloadFile(url, outPath) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Remotion-Cloud-Stitcher' },
        redirect: 'follow',
      });
      if (res.ok) {
        const arr = Buffer.from(await res.arrayBuffer());
        if (arr.length > 4096) {
          fs.writeFileSync(outPath, arr);
          return true;
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  return false;
}

async function resolveChapterFile(ch, idx, outPath) {
  if (ch.jobId) {
    const assetName = `video-${ch.jobId}.mp4`;
    const cdnUrl = `https://github.com/${repo}/releases/download/videos-store/${assetName}`;
    if (await downloadFile(cdnUrl, outPath)) return;

    if (ghToken) {
      const tagRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/videos-store`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${ghToken}`,
          'User-Agent': 'Remotion-Cloud-Stitcher',
        },
      });
      if (tagRes.ok) {
        const data = await tagRes.json();
        const found = (data.assets || []).find((a) => a.name === assetName);
        if (found?.url) {
          const binRes = await fetch(found.url, {
            headers: {
              Accept: 'application/octet-stream',
              Authorization: `Bearer ${ghToken}`,
              'User-Agent': 'Remotion-Cloud-Stitcher',
            },
            redirect: 'follow',
          });
          if (binRes.ok) {
            const arr = Buffer.from(await binRes.arrayBuffer());
            fs.writeFileSync(outPath, arr);
            return;
          }
        }
      }
    }
    throw new Error(`Chapter #${idx + 1} (jobId: ${ch.jobId}) could not be fetched from videos-store release.`);
  }

  if (ch.videoUrl) {
    const ok = await downloadFile(ch.videoUrl, outPath);
    if (!ok) {
      throw new Error(`Chapter #${idx + 1} (videoUrl: ${ch.videoUrl}) failed to download or is invalid.`);
    }
    return;
  }

  throw new Error(`Chapter #${idx + 1} missing both jobId and videoUrl.`);
}

function probeClip(filePath) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
    { encoding: 'utf-8' }
  );
  const data = JSON.parse(out);
  const v = (data.streams || []).find((s) => s.codec_type === 'video');
  const a = (data.streams || []).find((s) => s.codec_type === 'audio');
  let fps = 30;
  if (v?.r_frame_rate?.includes('/')) {
    const [n, d] = v.r_frame_rate.split('/').map(Number);
    if (d > 0 && Number.isFinite(n / d)) fps = Math.round(n / d);
  }
  const duration = Number(data.format?.duration || v?.duration || 0);
  return {
    width: Number(v?.width || 1920),
    height: Number(v?.height || 1080),
    fps,
    duration,
    hasAudio: Boolean(a),
  };
}

function normalizeChapter(rawPath, normPath, width, height, fps, info) {
  const args = ['-y', '-i', rawPath];
  if (!info.hasAudio) {
    args.push('-f', 'lavfi', '-t', String(Math.max(0.5, info.duration)), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
  }
  const vf = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps},format=yuv420p`;
  args.push(
    '-map', '0:v:0',
    '-map', info.hasAudio ? '0:a:0' : '1:a:0',
    '-vf', vf,
    '-af', 'aresample=44100:async=1,aformat=sample_fmts=fltp:channel_layouts=stereo',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    normPath
  );
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
}

function crossfadePair(fileA, fileB, outFile, fadeSec) {
  const infoA = probeClip(fileA);
  const effectiveFade = Math.min(fadeSec, Math.max(0.1, infoA.duration * 0.35));
  const offset = Math.max(0.05, Number((infoA.duration - effectiveFade).toFixed(3)));

  const filterComplex =
    `[0:v][1:v]xfade=transition=fade:duration=${effectiveFade}:offset=${offset},format=yuv420p[v];` +
    `[0:a][1:a]acrossfade=d=${effectiveFade}:c1=tri:c2=tri[a]`;

  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i', fileA,
      '-i', fileB,
      '-filter_complex', filterComplex,
      '-map', '[v]',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '19',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outFile,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
}

async function applyMasterSidechainBgm(videoPath, bgmUrl, bgmVolume, duckingStrength, workDir) {
  const bgmPath = path.join(workDir, 'master-bgm.audio');
  console.log(`🎵 Downloading continuous master BGM: ${bgmUrl}`);
  const ok = await downloadFile(bgmUrl, bgmPath);
  if (!ok) {
    console.warn(`⚠️ Master BGM failed to download (${bgmUrl}); keeping stitched chapter audio.`);
    return;
  }

  const vInfo = probeClip(videoPath);
  const totalDur = Math.max(2, vInfo.duration || 10);
  const fadeOutStart = Math.max(0.5, Number((totalDur - 2.2).toFixed(2)));
  const vol = Math.max(0.05, Math.min(0.6, Number(bgmVolume ?? 0.24)));

  const duckPresets = {
    gentle: 'threshold=0.04:ratio=3:attack=160:release=550',
    balanced: 'threshold=0.025:ratio=4.5:attack=120:release=450',
    strong: 'threshold=0.015:ratio=7:attack=80:release=350',
  };
  const scParams = duckPresets[duckingStrength] || duckPresets.balanced;

  const filterComplex =
    `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,` +
    `volume=${vol},afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeOutStart}:d=2.2[bgm_base];` +
    `[0:a]asplit=2[vo_mix][vo_sc];` +
    `[bgm_base][vo_sc]sidechaincompress=${scParams}:makeup=1[bgm_ducked];` +
    `[vo_mix][bgm_ducked]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[a_out]`;

  const scoredTmp = path.join(workDir, 'scored-master.mp4');
  console.log(`🎚️ Applying continuous sidechain-ducked Master BGM (vol=${vol}, preset=${duckingStrength})...`);
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i', videoPath,
      '-stream_loop', '-1',
      '-i', bgmPath,
      '-filter_complex', filterComplex,
      '-map', '0:v:0',
      '-map', '[a_out]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-movflags', '+faststart',
      scoredTmp,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  if (fs.existsSync(scoredTmp) && fs.statSync(scoredTmp).size > 4096) {
    fs.renameSync(scoredTmp, videoPath);
    console.log('✅ Applied continuous master BGM with automatic speech sidechain ducking.');
  }
}

async function main() {
  if (!jobId) throw new Error('Missing JOB_ID');
  const cfg = loadStitchConfig();
  const chapters = Array.isArray(cfg.chapters) ? cfg.chapters : [];
  if (chapters.length < 2) {
    throw new Error('stitch_video_chapters requires at least 2 chapters.');
  }

  const transition = cfg.transition === 'cut' ? 'cut' : 'crossfade';
  const fadeSec = Math.max(0.15, Math.min(1.5, Number(cfg.fadeDurationSec ?? 0.5)));

  const workDir = `outputs/chapters-${jobId}`;
  fs.mkdirSync(workDir, { recursive: true });

  console.log(`🎬 Downloading ${chapters.length} chapter MP4s...`);
  const rawPaths = [];
  for (let i = 0; i < chapters.length; i++) {
    const outPath = path.join(workDir, `raw-${String(i).padStart(2, '0')}.mp4`);
    await resolveChapterFile(chapters[i], i, outPath);
    rawPaths.push(outPath);
    console.log(`  ✅ Chapter ${i + 1}/${chapters.length} ready (${chapters[i].title || chapters[i].jobId || 'url'})`);
  }

  const firstProbe = probeClip(rawPaths[0]);
  const targetW = Number(cfg.targetWidth || firstProbe.width || 1920);
  const targetH = Number(cfg.targetHeight || firstProbe.height || 1080);
  const targetFps = Number(cfg.targetFps || firstProbe.fps || 30);

  console.log(`🔧 Normalizing ${chapters.length} chapters to ${targetW}x${targetH} @ ${targetFps}fps...`);
  const normPaths = [];
  for (let i = 0; i < rawPaths.length; i++) {
    const info = probeClip(rawPaths[i]);
    const normPath = path.join(workDir, `norm-${String(i).padStart(2, '0')}.mp4`);
    normalizeChapter(rawPaths[i], normPath, targetW, targetH, targetFps, info);
    normPaths.push(normPath);
  }

  const finalOut = `outputs/video-${jobId}.mp4`;

  if (transition === 'cut') {
    const listPath = path.join(workDir, 'concat.txt');
    fs.writeFileSync(
      listPath,
      normPaths.map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`).join('\n'),
      'utf-8'
    );
    execFileSync(
      'ffmpeg',
      ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-movflags', '+faststart', finalOut],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
  } else {
    // Iterative tree/pair reduction keeps FFmpeg memory flat regardless of chapter count
    let current = normPaths;
    let round = 0;
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        if (i + 1 >= current.length) {
          next.push(current[i]);
        } else {
          const isFinalOutput = current.length === 2;
          const outFile = isFinalOutput
            ? finalOut
            : path.join(workDir, `merge-r${round}-${i / 2}.mp4`);
          console.log(`✨ Crossfading pair (${fadeSec}s) -> ${path.basename(outFile)}`);
          crossfadePair(current[i], current[i + 1], outFile, fadeSec);
          next.push(outFile);
        }
      }
      current = next;
      round++;
    }
  }

  if (!fs.existsSync(finalOut)) {
    throw new Error('Stitched output video was not produced.');
  }

  if (typeof cfg.masterBgmUrl === 'string' && cfg.masterBgmUrl.trim().startsWith('http')) {
    await applyMasterSidechainBgm(
      finalOut,
      cfg.masterBgmUrl.trim(),
      cfg.masterBgmVolume,
      cfg.duckingStrength || 'balanced',
      workDir
    );
  }

  console.log(`🎉 Stitched long video ready -> ${finalOut}`);
}

main().catch((err) => {
  console.error('❌ Chapter stitching failed:', err?.message || err);
  process.exit(1);
});

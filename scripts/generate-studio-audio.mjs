import fs from 'fs';
import { execSync } from 'child_process';

const audioB64 = process.env.AUDIO_B64 || '';
const fps = Number(process.env.FPS || 30);
const defaultDurationFrames = Number(process.env.DURATION || 600);

fs.mkdirSync('public', { recursive: true });
fs.mkdirSync('src/remotion/public', { recursive: true });

// Generate a pure 100% SILENT WAV file (0 amplitude) so if any component references bgm.mp3 or an unused voice-X.mp3,
// it never throws a 404 error and produces ZERO synthetic sound or noise!
function generateSilentAudioFile(filePath, durationSec = 1) {
  const sampleRate = 8000;
  const numChannels = 1;
  const numSamples = Math.max(800, Math.floor(sampleRate * durationSec));
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize); // Buffer.alloc is zero-filled (100% digital silence)

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  fs.writeFileSync(filePath, buffer);
}

// Generate a warm stereo ambient Cmaj9 pad (30s) via FFmpeg for resilient BGM fallback when external streams fail.
function generateAmbientFallbackBgm(filePath, durationSec = 30) {
  try {
    execSync(
      `ffmpeg -y -f lavfi -i "aevalsrc='0.14*sin(2*PI*130.81*t)+0.10*sin(2*PI*196.00*t)+0.08*sin(2*PI*246.94*t)+0.06*sin(2*PI*293.66*t)':s=44100:d=${durationSec}" -af "lowpass=f=680,tremolo=f=0.25:d=0.35,afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(1, durationSec - 1.5)}:d=1.5" -ac 2 -c:a libmp3lame -q:a 4 "${filePath}"`,
      { stdio: ['ignore', 'ignore', 'ignore'], timeout: 15000 }
    );
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 2048) {
      console.log(`🎼 Synthesized warm ambient BGM pad fallback (${durationSec}s) -> ${filePath}`);
      return;
    }
  } catch {}
  generateSilentAudioFile(filePath, 1);
}

// Fallback proportional syllable/word splitter when raw text needs word-level timestamps
function buildProportionalWords(text, totalDurationMs, fpsVal) {
  const rawTokens = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (rawTokens.length === 0) return [];

  const startPadMs = 50;
  const usableMs = Math.max(300, totalDurationMs - startPadMs - 80);
  const weights = rawTokens.map((w) => {
    const cleanLen = w.replace(/[^\p{L}\p{N}]/gu, '').length || 1;
    const pauseBonus = /[,.;:!?]$/.test(w) ? 2.0 : 0;
    return Math.max(1.4, cleanLen * 0.85 + pauseBonus);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  let cursorMs = startPadMs;
  return rawTokens.map((w, idx) => {
    const durMs = (weights[idx] / totalWeight) * usableMs;
    const startMs = Math.round(cursorMs);
    const endMs = Math.round(cursorMs + durMs);
    cursorMs += durMs;
    return {
      word: w,
      text: idx === 0 ? w : ` ${w}`,
      startMs,
      endMs,
      timestampMs: Math.round((startMs + endMs) / 2),
      confidence: 1,
      startFrame: Math.floor((startMs / 1000) * fpsVal),
      endFrame: Math.ceil((endMs / 1000) * fpsVal),
    };
  });
}

// Python helper script that calls edge_tts.Communicate AND measures exact MP3 duration via mutagen / WordBoundary
const pyScriptPath = 'scripts/_edge_word_tts.py';
fs.writeFileSync(
  pyScriptPath,
  `import sys, json, asyncio, time
import edge_tts

async def synthesize_with_retry(text, voice, rate, out_mp3, max_attempts=4):
    last_err = None
    for attempt in range(1, max_attempts + 1):
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate)
            words = []
            max_end_ms = 0
            has_audio = False
            with open(out_mp3, "wb") as audio_f:
                async for chunk in comm.stream():
                    ctype = chunk.get("type")
                    if ctype == "audio":
                        audio_f.write(chunk["data"])
                        has_audio = True
                    elif ctype in ("WordBoundary", "SentenceBoundary"):
                        offset_ms = round(chunk.get("offset", 0) / 10000)
                        dur_ms = round(chunk.get("duration", 0) / 10000)
                        end_ms = offset_ms + max(60, dur_ms)
                        if end_ms > max_end_ms:
                            max_end_ms = end_ms
                        wtext = (chunk.get("text") or "").strip()
                        if wtext:
                            words.append({
                                "type": ctype,
                                "word": wtext,
                                "startMs": offset_ms,
                                "endMs": end_ms
                            })
            if has_audio:
                return words, max_end_ms
        except Exception as err:
            last_err = err
            await asyncio.sleep(0.8 * attempt)
    raise last_err or Exception("Failed to synthesize after retries")

async def main():
    txt_file, voice, rate, out_mp3, out_json = sys.argv[1:6]
    with open(txt_file, "r", encoding="utf-8") as f:
        text = f.read().strip()

    words, max_end_ms = await synthesize_with_retry(text, voice, rate, out_mp3)

    exact_dur_ms = max_end_ms
    try:
        from mutagen.mp3 import MP3
        audio_info = MP3(out_mp3)
        if audio_info and audio_info.info and audio_info.info.length > 0:
            exact_dur_ms = max(exact_dur_ms, round(audio_info.info.length * 1000))
    except Exception:
        pass

    with open(out_json, "w", encoding="utf-8") as jf:
        json.dump({
            "durationMs": exact_dur_ms,
            "words": words
        }, jf, ensure_ascii=False)

asyncio.run(main())
`,
  'utf-8'
);

function resolveExactAudioDurationSec(filePath, pyReportedDurationMs) {
  if (typeof pyReportedDurationMs === 'number' && pyReportedDurationMs > 300) {
    return pyReportedDurationMs / 1000;
  }
  try {
    const out = execSync(
      `npx remotion ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    const val = parseFloat(out);
    if (Number.isFinite(val) && val > 0.2) return val;
  } catch {}

  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 1000) {
      return stat.size / 6000;
    }
  } catch {}

  return 4.5;
}

function normalizeWordBoundaries(originalText, rawBoundaries, actualDurationMs, fpsVal) {
  const originalTokens = originalText
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (originalTokens.length === 0) return [];

  const wordEvents = (rawBoundaries || []).filter((b) => b.type === 'WordBoundary');

  if (wordEvents.length >= Math.max(1, Math.floor(originalTokens.length * 0.5))) {
    const expanded = [];
    for (const ev of wordEvents) {
      const parts = String(ev.word || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (parts.length <= 1) {
        expanded.push(ev);
      } else {
        const span = Math.max(80, ev.endMs - ev.startMs);
        const step = span / parts.length;
        parts.forEach((p, idx) => {
          expanded.push({
            word: p,
            startMs: Math.round(ev.startMs + idx * step),
            endMs: Math.round(ev.startMs + (idx + 1) * step),
          });
        });
      }
    }

    const count = originalTokens.length;
    return originalTokens.map((origWord, i) => {
      const mappedIdx = Math.min(
        expanded.length - 1,
        Math.floor((i / count) * expanded.length)
      );
      const ev = expanded[mappedIdx];
      const nextEv = expanded[mappedIdx + 1];
      const startMs = ev.startMs;
      const endMs = nextEv
        ? Math.max(startMs + 80, nextEv.startMs)
        : Math.max(startMs + 140, ev.endMs);
      return {
        word: origWord,
        text: i === 0 ? origWord : ` ${origWord}`,
        startMs,
        endMs,
        timestampMs: Math.round((startMs + endMs) / 2),
        confidence: 1,
        startFrame: Math.floor((startMs / 1000) * fpsVal),
        endFrame: Math.ceil((endMs / 1000) * fpsVal),
      };
    });
  }

  return buildProportionalWords(originalText, actualDurationMs, fpsVal);
}

let config = {
  voice: 'vi-VN-NamMinhNeural',
  rate: '+5%',
  narrationSegments: [],
};

if (audioB64) {
  try {
    const parsed = JSON.parse(Buffer.from(audioB64, 'base64').toString('utf-8'));
    config = { ...config, ...parsed };
  } catch (e) {
    console.warn('Could not parse AUDIO_B64, using defaults:', e);
  }
}

// 1. Support Master Audio Mode: if config.masterAudio is true, or config.fullScript is provided,
// or config.scenes is provided as a cohesive script, synthesize ONE single continuous voiceover.mp3
// and extract fine-grained sentence/scene markers and word timestamps without any dead air!

const rawList =
  config.scenes ||
  config.narrationSegments ||
  config.segments ||
  config.script ||
  config.dialogue ||
  (Array.isArray(config) ? config : []);

let segments = Array.isArray(rawList)
  ? rawList
  : typeof rawList === 'string' && rawList.trim()
  ? [{ text: rawList.trim() }]
  : [];

if (segments.length === 0 && typeof config.text === 'string' && config.text.trim()) {
  segments = [{ text: config.text.trim(), voice: config.voice }];
}

if (segments.length === 0 && typeof config.fullScript === 'string' && config.fullScript.trim()) {
  segments = [{ text: config.fullScript.trim(), voice: config.voice }];
}

console.log(`🎙️ Parsed ${segments.length} narration segment(s) for Studio Voiceover.`);
const voice = config.voice || 'vi-VN-NamMinhNeural';
const rate = config.rate || '+5%';
const scenesTelemetry = [];

// 1. Always create an audible ambient pad placeholder for bgm.mp3 if not already fetched
const isPreviewMode = process.env.PREVIEW_MODE === 'true';
if (!fs.existsSync('public/bgm.mp3') || fs.statSync('public/bgm.mp3').size < 100) {
  if (isPreviewMode) {
    generateSilentAudioFile('public/bgm.mp3', 1);
  } else {
    generateAmbientFallbackBgm('public/bgm.mp3', 30);
  }
  fs.copyFileSync('public/bgm.mp3', 'src/remotion/public/bgm.mp3');
}

// Check if we should run in Master Audio Spine mode (Recommended default for seamless editing)
// In Master Audio Spine mode: we combine the narration into one continuous voiceover.mp3 stream
// and capture real SentenceBoundary & WordBoundary timestamps for precision cuts!
const isMasterSpineMode = config.masterSpine !== false && segments.length > 0;

if (isPreviewMode && segments.length > 0) {
  console.log(`⚡ PREVIEW_MODE active: Building fast synthetic telemetry for Contact Sheet captions & spine...`);
  generateSilentAudioFile('public/voiceover.mp3', 1);
  fs.copyFileSync('public/voiceover.mp3', 'src/remotion/public/voiceover.mp3');
  let rateMultiplier = 1.0;
  const rm = String(rate || '').match(/([+-]?\d+)%/);
  if (rm) rateMultiplier = Math.max(0.5, Math.min(2.0, 1.0 + Number(rm[1]) / 100));

  let cursorFrame = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segText = (typeof seg === 'string' ? seg : seg?.text || '').trim();
    const wc = segText.split(/\s+/).filter(Boolean).length;
    const estSec = Math.max(1.2, (wc / (3.65 * rateMultiplier)) + 0.35);
    const segFrames = Math.ceil(estSec * fps);
    const localWords = buildProportionalWords(segText, Math.round(estSec * 1000), fps);
    const globalWords = localWords.map((w) => ({
      ...w,
      startMs: Math.round((cursorFrame / fps) * 1000) + w.startMs,
      endMs: Math.round((cursorFrame / fps) * 1000) + w.endMs,
      timestampMs: Math.round((cursorFrame / fps) * 1000) + w.timestampMs,
      globalStartFrame: cursorFrame + w.startFrame,
      globalEndFrame: cursorFrame + w.endFrame,
    }));
    scenesTelemetry.push({
      sceneIndex: i,
      text: segText,
      audioDurationSec: Number(estSec.toFixed(3)),
      durationInFrames: segFrames,
      startFrame: cursorFrame,
      endFrame: cursorFrame + segFrames,
      words: globalWords,
    });
    generateSilentAudioFile(`public/voice-${i}.mp3`, 0.5);
    fs.copyFileSync(`public/voice-${i}.mp3`, `src/remotion/public/voice-${i}.mp3`);
    fs.writeFileSync(`public/captions-${i}.json`, JSON.stringify(globalWords, null, 2), 'utf-8');
    fs.copyFileSync(`public/captions-${i}.json`, `src/remotion/public/captions-${i}.json`);
    cursorFrame += segFrames;
  }
} else if (isMasterSpineMode) {
  console.log(`✨ Master Audio Spine Mode active: Synthesizing continuous master voiceover track...`);

  // Combine full text while preserving boundary markers per segment
  const segmentTexts = segments.map((s) => (typeof s === 'string' ? s : s?.text || '').trim()).filter(Boolean);
  const combinedText = segmentTexts.join('\n\n');

  const masterOutFile = `public/voiceover.mp3`;
  const masterRawJson = `public/raw-master-words.json`;
  const masterTxt = `public/voiceover.txt`;
  fs.writeFileSync(masterTxt, combinedText, 'utf-8');

  let rawBoundaries = [];
  let pyDurationMs = 0;
  try {
    execSync(
      `python3 "${pyScriptPath}" "${masterTxt}" "${voice}" "${rate}" "${masterOutFile}" "${masterRawJson}"`,
      { stdio: 'inherit' }
    );
    if (fs.existsSync(masterRawJson)) {
      const parsedPy = JSON.parse(fs.readFileSync(masterRawJson, 'utf-8'));
      rawBoundaries = Array.isArray(parsedPy) ? parsedPy : parsedPy.words || [];
      pyDurationMs = Number(parsedPy?.durationMs || 0);
      fs.unlinkSync(masterRawJson);
    }
  } catch {
    execSync(
      `edge-tts --file "${masterTxt}" --voice "${voice}" --rate="${rate}" --write-media "${masterOutFile}"`,
      { stdio: 'inherit' }
    );
  }

  if (fs.existsSync(masterTxt)) fs.unlinkSync(masterTxt);
  fs.copyFileSync(masterOutFile, `src/remotion/public/voiceover.mp3`);

  const masterAudioDurSec = resolveExactAudioDurationSec(masterOutFile, pyDurationMs);
  const masterAudioDurMs = Math.round(masterAudioDurSec * 1000);
  const totalVideoFrames = Math.ceil((masterAudioDurSec + 0.5) * fps);

  // Now, map individual segment texts to their time ranges in the master audio stream
  const allWords = normalizeWordBoundaries(combinedText, rawBoundaries, masterAudioDurMs, fps);

  let wordCursor = 0;
  let runningStartFrame = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segText = typeof seg === 'string' ? seg : seg?.text || '';
    const segTokens = segText.trim().split(/\s+/).filter(Boolean);
    const segWordCount = segTokens.length;

    const segWords = allWords.slice(wordCursor, wordCursor + segWordCount);
    wordCursor += segWordCount;

    let segStartFrame = runningStartFrame;
    let segEndFrame = runningStartFrame;

    if (segWords.length > 0) {
      segStartFrame = segWords[0].startFrame;
      segEndFrame = segWords[segWords.length - 1].endFrame;
      // If this is the last segment, extend it to total video frames
      if (i === segments.length - 1) {
        segEndFrame = totalVideoFrames;
      }
    } else {
      segEndFrame = segStartFrame + Math.ceil(3 * fps);
    }

    const segDurFrames = Math.max(Math.ceil(1.2 * fps), segEndFrame - segStartFrame);

    scenesTelemetry.push({
      sceneIndex: i,
      text: segText.trim(),
      audioDurationSec: Number((segDurFrames / fps).toFixed(3)),
      durationInFrames: segDurFrames,
      startFrame: segStartFrame,
      endFrame: segStartFrame + segDurFrames,
      words: segWords.map((w) => ({
        ...w,
        globalStartFrame: w.startFrame,
        globalEndFrame: w.endFrame,
      })),
    });

    runningStartFrame = segStartFrame + segDurFrames;

    // Create accurate sliced audio for voice-i.mp3 using ffmpeg so if code mounts <Audio src={staticFile("voice-i.mp3")}>
    // inside a <Sequence from={startFrame}>, it plays ONLY that segment's speech and NEVER repeats the whole track!
    const sliceStartSec = (segStartFrame / fps).toFixed(3);
    const sliceDurSec = (segDurFrames / fps).toFixed(3);
    const segOutFile = `public/voice-${i}.mp3`;

    try {
      execSync(
        `npx remotion ffmpeg -y -ss ${sliceStartSec} -t ${sliceDurSec} -i "${masterOutFile}" -c copy "${segOutFile}"`,
        { stdio: ['ignore', 'ignore', 'ignore'] }
      );
    } catch {
      try {
        execSync(
          `ffmpeg -y -ss ${sliceStartSec} -t ${sliceDurSec} -i "${masterOutFile}" -c copy "${segOutFile}"`,
          { stdio: ['ignore', 'ignore', 'ignore'] }
        );
      } catch {
        fs.copyFileSync(masterOutFile, segOutFile);
      }
    }

    fs.copyFileSync(segOutFile, `src/remotion/public/voice-${i}.mp3`);
    fs.writeFileSync(`public/captions-${i}.json`, JSON.stringify(segWords, null, 2), 'utf-8');
    fs.copyFileSync(`public/captions-${i}.json`, `src/remotion/public/captions-${i}.json`);
  }

  console.log(
    `🎙️ Master Audio Spine generated: ${masterAudioDurSec.toFixed(2)}s (${totalVideoFrames} frames) for ${scenesTelemetry.length} scenes. 100% continuous speech!`
  );
} else {
  // Legacy multi-chunk fallback
  for (let i = 0; i < Math.max(segments.length, 15); i++) {
    if (i > 0 && i < segments.length) {
      await new Promise((r) => setTimeout(r, 600));
    }
    const seg = segments[i];
    const text = typeof seg === 'string' ? seg : seg?.text || '';
    const segVoice = (typeof seg === 'object' && seg?.voice) || voice;
    const outFile = `public/voice-${i}.mp3`;
    const rawJsonFile = `public/raw-words-${i}.json`;

    if (!text.trim()) {
      generateSilentAudioFile(outFile, 0.5);
      fs.copyFileSync(outFile, `src/remotion/public/voice-${i}.mp3`);
      continue;
    }

    try {
      const tmpTxt = `public/voice-${i}.txt`;
      fs.writeFileSync(tmpTxt, text.trim(), 'utf-8');

      let rawBoundaries = [];
      let pyDurationMs = 0;
      try {
        execSync(
          `python3 "${pyScriptPath}" "${tmpTxt}" "${segVoice}" "${rate}" "${outFile}" "${rawJsonFile}"`,
          { stdio: 'inherit' }
        );
        if (fs.existsSync(rawJsonFile)) {
          const parsedPy = JSON.parse(fs.readFileSync(rawJsonFile, 'utf-8'));
          rawBoundaries = Array.isArray(parsedPy) ? parsedPy : parsedPy.words || [];
          pyDurationMs = Number(parsedPy?.durationMs || 0);
          fs.unlinkSync(rawJsonFile);
        }
      } catch {
        execSync(
          `edge-tts --file "${tmpTxt}" --voice "${segVoice}" --rate="${rate}" --write-media "${outFile}"`,
          { stdio: 'inherit' }
        );
      }

      if (fs.existsSync(tmpTxt)) fs.unlinkSync(tmpTxt);
      fs.copyFileSync(outFile, `src/remotion/public/voice-${i}.mp3`);

      const audioDurSec = resolveExactAudioDurationSec(outFile, pyDurationMs);
      const audioDurMs = Math.round(audioDurSec * 1000);
      const sceneDurationFrames = Math.ceil((audioDurSec + 0.25) * fps);
      const words = normalizeWordBoundaries(text.trim(), rawBoundaries, audioDurMs, fps);

      fs.writeFileSync(`public/captions-${i}.json`, JSON.stringify(words, null, 2), 'utf-8');
      fs.copyFileSync(`public/captions-${i}.json`, `src/remotion/public/captions-${i}.json`);

      scenesTelemetry.push({
        sceneIndex: i,
        text: text.trim(),
        audioDurationSec: Number(audioDurSec.toFixed(3)),
        durationInFrames: sceneDurationFrames,
        startFrame: cumulativeFrames,
        endFrame: cumulativeFrames + sceneDurationFrames,
        words: words.map((w) => ({
          ...w,
          globalStartFrame: cumulativeFrames + w.startFrame,
          globalEndFrame: cumulativeFrames + w.endFrame,
        })),
      });
      cumulativeFrames += sceneDurationFrames;

      console.log(
        `🎙️ Segment ${i}: ${outFile} (Exact: ${audioDurSec.toFixed(2)}s -> ${sceneDurationFrames} frames, ${words.length} synced words)`
      );
    } catch (err) {
      console.warn(`Edge-TTS fallback for ${outFile}:`, err);
      generateSilentAudioFile(outFile, 2);
      fs.copyFileSync(outFile, `src/remotion/public/voice-${i}.mp3`);
      const fallbackFrames = Math.ceil(3.0 * fps);
      const words = buildProportionalWords(text.trim(), 2800, fps);
      scenesTelemetry.push({
        sceneIndex: i,
        text: text.trim(),
        audioDurationSec: 2.8,
        durationInFrames: fallbackFrames,
        startFrame: cumulativeFrames,
        endFrame: cumulativeFrames + fallbackFrames,
        words: words.map((w) => ({
          ...w,
          globalStartFrame: cumulativeFrames + w.startFrame,
          globalEndFrame: cumulativeFrames + w.endFrame,
        })),
      });
      cumulativeFrames += fallbackFrames;
    }
  }
}

if (fs.existsSync(pyScriptPath)) {
  try {
    fs.unlinkSync(pyScriptPath);
  } catch {}
}

const computedDurationInFrames =
  scenesTelemetry.length > 0
    ? scenesTelemetry[scenesTelemetry.length - 1].endFrame
    : defaultDurationFrames;

const allGlobalWords = scenesTelemetry.flatMap((s) => s.words);
const telemetryPayload = {
  fps,
  totalFrames: computedDurationInFrames,
  sceneFrames: scenesTelemetry.map((s) => s.durationInFrames),
  sceneStartFrames: scenesTelemetry.map((s) => s.startFrame),
  scenes: scenesTelemetry,
  allWords: allGlobalWords,
};

fs.writeFileSync(
  'src/remotion/audio-telemetry.json',
  JSON.stringify(telemetryPayload, null, 2),
  'utf-8'
);
fs.writeFileSync(
  'public/audio-telemetry.json',
  JSON.stringify(telemetryPayload, null, 2),
  'utf-8'
);
fs.copyFileSync('public/audio-telemetry.json', 'src/remotion/public/audio-telemetry.json');

try {
  const prevMeta = fs.existsSync('src/remotion/meta.json')
    ? JSON.parse(fs.readFileSync('src/remotion/meta.json', 'utf-8'))
    : {};
  fs.writeFileSync(
    'src/remotion/meta.json',
    JSON.stringify(
      {
        ...prevMeta,
        computedDurationInFrames,
        sceneFrames: telemetryPayload.sceneFrames,
        sceneStartFrames: telemetryPayload.sceneStartFrames,
      },
      null,
      2
    ),
    'utf-8'
  );
} catch (err) {
  console.warn('Could not update src/remotion/meta.json:', err);
}

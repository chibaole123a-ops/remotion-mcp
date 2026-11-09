import fs from 'fs';
import { execSync } from 'child_process';

const audioB64 = process.env.AUDIO_B64 || '';
const fps = Number(process.env.FPS || 30);
const defaultDurationFrames = Number(process.env.DURATION || 600);

fs.mkdirSync('public', { recursive: true });
fs.mkdirSync('src/remotion/public', { recursive: true });

// Pure, Warm Low-Frequency Cinematic Ambient Pad (110Hz - 330Hz)
// Engineered to sit gently underneath human speech (1kHz - 4kHz) with ZERO high-frequency buzz or noise!
function generateCleanWarmPadWav(filePath, durationSec, mood) {
  const sampleRate = 22050;
  const numChannels = 2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF WAVE Header
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

  // Warm, low-register chords (strictly below 330Hz so it never clashes with voiceover)
  const progressions = {
    'epic-space': [
      [110.0, 164.81, 220.0, 261.63], // Am
      [87.31, 130.81, 174.61, 220.0], // F
      [130.81, 164.81, 196.0, 261.63], // C
      [98.0, 146.83, 196.0, 246.94], // G
    ],
    'cyber-tech': [
      [110.0, 164.81, 220.0, 246.94], // Am9
      [87.31, 130.81, 174.61, 207.65], // Fm/Ab
      [98.0, 146.83, 196.0, 220.0], // G6
      [82.41, 123.47, 164.81, 196.0], // Em
    ],
    'warm-inspiring': [
      [130.81, 164.81, 196.0, 246.94], // Cmaj7
      [98.0, 146.83, 196.0, 246.94], // G
      [110.0, 164.81, 220.0, 261.63], // Am
      [87.31, 130.81, 174.61, 220.0], // F
    ],
    'mystery-deep': [
      [73.42, 110.0, 146.83, 174.61], // Dm
      [65.41, 98.0, 130.81, 164.81], // C
      [58.27, 87.31, 116.54, 146.83], // Bb
      [55.0, 82.41, 110.0, 138.59], // A
    ],
    'upbeat-energetic': [
      [130.81, 164.81, 196.0, 261.63], // C
      [98.0, 146.83, 196.0, 246.94], // G
      [110.0, 164.81, 220.0, 261.63], // Am
      [87.31, 130.81, 174.61, 220.0], // F
    ],
  };

  const chords = progressions[mood] || progressions['epic-space'];
  const chordDurationSec = 6.0; // Very slow, seamless 6-second chord transitions

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, t / 2.5);
    const fadeOut = Math.min(1, (durationSec - t) / 2.5);
    const masterEnv = Math.max(0, Math.min(1, fadeIn * fadeOut));

    const pos = t / chordDurationSec;
    const idx1 = Math.floor(pos) % chords.length;
    const idx2 = (idx1 + 1) % chords.length;
    const frac = pos - Math.floor(pos);
    // Smooth cosine crossfade over the last 2 seconds of each chord
    const blend = frac > 0.65 ? 0.5 - 0.5 * Math.cos(Math.PI * ((frac - 0.65) / 0.35)) : 0;

    const c1 = chords[idx1];
    const c2 = chords[idx2];

    const wave1 =
      0.34 * Math.sin(2 * Math.PI * c1[0] * t) +
      0.28 * Math.sin(2 * Math.PI * c1[1] * t) +
      0.22 * Math.sin(2 * Math.PI * c1[2] * t) +
      0.16 * Math.sin(2 * Math.PI * c1[3] * t);

    const wave2 =
      0.34 * Math.sin(2 * Math.PI * c2[0] * t) +
      0.28 * Math.sin(2 * Math.PI * c2[1] * t) +
      0.22 * Math.sin(2 * Math.PI * c2[2] * t) +
      0.16 * Math.sin(2 * Math.PI * c2[3] * t);

    const combined = wave1 * (1 - blend) + wave2 * blend;

    // Gentle stereo breathing LFO
    const lfoL = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.12 * t);
    const lfoR = 0.8 + 0.2 * Math.cos(2 * Math.PI * 0.15 * t);

    // Keep amplitude subtle (0.26) so voiceover is 100% crystal clear
    const sampleL = Math.max(-1, Math.min(1, combined * lfoL * masterEnv * 0.26));
    const sampleR = Math.max(-1, Math.min(1, combined * lfoR * masterEnv * 0.26));

    buffer.writeInt16LE(Math.floor(sampleL * 32767), offset);
    buffer.writeInt16LE(Math.floor(sampleR * 32767), offset + 2);
    offset += 4;
  }

  fs.writeFileSync(filePath, buffer);
}

// Convert WAV to MP3 using Remotion's bundled ffmpeg (never fails even if system ffmpeg is missing!)
function writeCleanBgmFile(outMp3Path, durationSec, mood) {
  const tmpWav = `${outMp3Path}.tmp.wav`;
  generateCleanWarmPadWav(tmpWav, durationSec, mood);
  try {
    execSync(
      `npx remotion ffmpeg -y -loglevel error -i "${tmpWav}" -codec:a libmp3lame -qscale:a 3 "${outMp3Path}"`,
      { stdio: 'pipe' }
    );
    fs.unlinkSync(tmpWav);
  } catch {
    fs.renameSync(tmpWav, outMp3Path);
  }
}

// Fallback proportional syllable/word splitter when raw text needs word-level timestamps
function buildProportionalWords(text, totalDurationMs, fpsVal) {
  const rawTokens = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (rawTokens.length === 0) return [];

  const startPadMs = 60;
  const usableMs = Math.max(300, totalDurationMs - startPadMs - 100);
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

// Write Python helper script that calls edge_tts.Communicate AND measures exact MP3 duration via mutagen / WordBoundary!
const pyScriptPath = 'scripts/_edge_word_tts.py';
fs.writeFileSync(
  pyScriptPath,
  `import sys, json, asyncio
import edge_tts

async def main():
    txt_file, voice, rate, out_mp3, out_json = sys.argv[1:6]
    with open(txt_file, "r", encoding="utf-8") as f:
        text = f.read().strip()

    try:
        comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    except TypeError:
        comm = edge_tts.Communicate(text, voice, rate=rate)

    words = []
    max_end_ms = 0
    with open(out_mp3, "wb") as audio_f:
        async for chunk in comm.stream():
            ctype = chunk.get("type")
            if ctype == "audio":
                audio_f.write(chunk["data"])
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

    # Measure exact MP3 duration via mutagen if available
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

// Measure audio duration in seconds via Python/Edge-TTS metadata, Remotion ffprobe, or MP3 file size (24kbps = 3000 bytes/sec)
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

  // Fallback: Edge-TTS outputs 24kHz 48kbps CBR MP3 (exactly 6000 bytes per second!)
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 1000) {
      return stat.size / 6000;
    }
  } catch {}

  return 4.5;
}

// Normalize raw boundary events into guaranteed Word-by-Word tokens matching original punctuation
function normalizeWordBoundaries(originalText, rawBoundaries, actualDurationMs, fpsVal) {
  const originalTokens = originalText
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (originalTokens.length === 0) return [];

  const wordEvents = (rawBoundaries || []).filter((b) => b.type === 'WordBoundary');

  // If Edge-TTS emitted individual WordBoundary events for words
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
  bgmMood: 'epic-space',
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

const segments = Array.isArray(config.narrationSegments) ? config.narrationSegments : [];
const voice = config.voice || 'vi-VN-NamMinhNeural';
const rate = config.rate || '+5%';
const scenesTelemetry = [];
let cumulativeFrames = 0;

for (let i = 0; i < Math.max(segments.length, 15); i++) {
  const seg = segments[i];
  const text = typeof seg === 'string' ? seg : seg?.text || '';
  const segVoice = (typeof seg === 'object' && seg?.voice) || voice;
  const outFile = `public/voice-${i}.mp3`;
  const rawJsonFile = `public/raw-words-${i}.json`;

  if (!text.trim()) {
    writeCleanBgmFile(outFile, 1, 'epic-space');
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
    // Add 0.45s natural breathing pause after speech finishes
    const sceneDurationFrames = Math.ceil((audioDurSec + 0.45) * fps);
    const words = normalizeWordBoundaries(text.trim(), rawBoundaries, audioDurMs, fps);

    // Save per-scene @remotion/captions JSON
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
    writeCleanBgmFile(outFile, 3, 'epic-space');
    fs.copyFileSync(outFile, `src/remotion/public/voice-${i}.mp3`);
    const fallbackFrames = Math.ceil(3.5 * fps);
    const words = buildProportionalWords(text.trim(), 3000, fps);
    scenesTelemetry.push({
      sceneIndex: i,
      text: text.trim(),
      audioDurationSec: 3,
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

if (fs.existsSync(pyScriptPath)) {
  try {
    fs.unlinkSync(pyScriptPath);
  } catch {}
}

const computedDurationInFrames =
  scenesTelemetry.length > 0 ? cumulativeFrames : defaultDurationFrames;
const bgmDurationSeconds = Math.max(10, Math.ceil(computedDurationInFrames / fps) + 4);

// 2. Generate Clean Warm Ambient Pad BGM (Zero high-frequency noise)
try {
  writeCleanBgmFile('public/bgm.mp3', bgmDurationSeconds, config.bgmMood || 'epic-space');
  fs.copyFileSync('public/bgm.mp3', 'src/remotion/public/bgm.mp3');
  console.log(
    `✅ Generated Clean Warm Pad BGM (${config.bgmMood}) at public/bgm.mp3 (${bgmDurationSeconds}s)`
  );
} catch (err) {
  console.error('Failed to generate BGM:', err);
}

// 3. Write complete Ground-Truth Audio & Word Telemetry JSON (including global timeline offsets)
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

// 4. Update src/remotion/meta.json with exact total frames
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

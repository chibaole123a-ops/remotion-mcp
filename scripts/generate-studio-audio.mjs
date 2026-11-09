import fs from 'fs';
import { execSync } from 'child_process';

const audioB64 = process.env.AUDIO_B64 || '';
const fps = Number(process.env.FPS || 30);
const defaultDurationFrames = Number(process.env.DURATION || 600);

fs.mkdirSync('public', { recursive: true });
fs.mkdirSync('src/remotion/public', { recursive: true });

// Multi-Layer Procedural BGM Synthesizer v2 (4-Chord Progression + Sub-Bass Pulse + Arpeggio)
function generateMultiLayerBgmWav(filePath, durationSec, mood) {
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

  // 4-Chord progressions (root bass + 3 pad notes + arpeggio notes) per mood
  const progressions = {
    'epic-space': {
      bpm: 72,
      chords: [
        [110.0, 220.0, 261.63, 329.63], // Am (A2, A3, C4, E4)
        [87.31, 174.61, 220.0, 261.63], // F  (F2, F3, A3, C4)
        [130.81, 196.0, 261.63, 329.63], // C  (C3, G3, C4, E4)
        [98.0, 196.0, 246.94, 293.66], // G  (G2, G3, B3, D4)
      ],
    },
    'cyber-tech': {
      bpm: 108,
      chords: [
        [130.81, 196.0, 261.63, 311.13], // Cm
        [103.83, 155.56, 207.65, 261.63], // Ab
        [116.54, 174.61, 233.08, 293.66], // Bb
        [98.0, 146.83, 196.0, 246.94], // G
      ],
    },
    'warm-inspiring': {
      bpm: 84,
      chords: [
        [146.83, 220.0, 293.66, 369.99], // D
        [110.0, 164.81, 220.0, 277.18], // A
        [123.47, 185.0, 246.94, 293.66], // Bm
        [98.0, 146.83, 196.0, 246.94], // G
      ],
    },
    'mystery-deep': {
      bpm: 66,
      chords: [
        [73.42, 146.83, 174.61, 220.0], // Dm
        [58.27, 116.54, 146.83, 174.61], // Bb
        [87.31, 130.81, 174.61, 220.0], // F
        [65.41, 130.81, 164.81, 196.0], // C
      ],
    },
    'upbeat-energetic': {
      bpm: 120,
      chords: [
        [130.81, 261.63, 329.63, 392.0], // C
        [98.0, 196.0, 246.94, 293.66], // G
        [110.0, 220.0, 261.63, 329.63], // Am
        [87.31, 174.61, 220.0, 261.63], // F
      ],
    },
  };

  const preset = progressions[mood] || progressions['epic-space'];
  const beatSec = 60 / preset.bpm;
  const barSec = beatSec * 4;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, t / 2.0);
    const fadeOut = Math.min(1, (durationSec - t) / 2.5);
    const masterEnv = Math.max(0, Math.min(1, fadeIn * fadeOut));

    // Smooth crossfade between chords every bar
    const barPos = t / barSec;
    const chordIdx = Math.floor(barPos) % preset.chords.length;
    const nextChordIdx = (chordIdx + 1) % preset.chords.length;
    const barFrac = barPos - Math.floor(barPos);
    const crossfade = barFrac > 0.85 ? (barFrac - 0.85) / 0.15 : 0;

    const c1 = preset.chords[chordIdx];
    const c2 = preset.chords[nextChordIdx];

    const f0 = c1[0] * (1 - crossfade) + c2[0] * crossfade;
    const f1 = c1[1] * (1 - crossfade) + c2[1] * crossfade;
    const f2 = c1[2] * (1 - crossfade) + c2[2] * crossfade;
    const f3 = c1[3] * (1 - crossfade) + c2[3] * crossfade;

    // 1. Warm Stereo Pad Layer
    const padLfoL = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.16 * t);
    const padLfoR = 0.7 + 0.3 * Math.cos(2 * Math.PI * 0.21 * t);
    const padWave =
      0.26 * Math.sin(2 * Math.PI * f1 * t) +
      0.22 * Math.sin(2 * Math.PI * f2 * t) +
      0.16 * Math.sin(2 * Math.PI * f3 * t);

    // 2. Rhythmic Sub-Bass Pulse
    const beatPos = (t / beatSec) % 1;
    const bassEnv = Math.exp(-3.2 * beatPos);
    const bassWave = 0.38 * Math.sin(2 * Math.PI * f0 * t) * bassEnv;

    // 3. Atmospheric Arpeggio Pluck (1/8th note gentle sparkle)
    const eighthPos = (t / (beatSec * 0.5)) % 1;
    const arpIdx = Math.floor(t / (beatSec * 0.5)) % 4;
    const arpFreq = c1[arpIdx] * 2;
    const arpEnv = Math.exp(-6.5 * eighthPos) * 0.12;
    const arpWave = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv;
    const arpPan = 0.5 + 0.35 * Math.sin(2 * Math.PI * 0.4 * t);

    const mixL = (padWave * padLfoL + bassWave + arpWave * arpPan) * masterEnv * 0.48;
    const mixR = (padWave * padLfoR + bassWave + arpWave * (1 - arpPan)) * masterEnv * 0.48;

    const sampleL = Math.max(-1, Math.min(1, mixL));
    const sampleR = Math.max(-1, Math.min(1, mixR));

    buffer.writeInt16LE(Math.floor(sampleL * 32767), offset);
    buffer.writeInt16LE(Math.floor(sampleR * 32767), offset + 2);
    offset += 4;
  }

  fs.writeFileSync(filePath, buffer);
}

// Convert WAV to real MP3 if ffmpeg is available
function writeWavOrMp3(outMp3Path, durationSec, mood) {
  const tmpWav = `${outMp3Path}.tmp.wav`;
  generateMultiLayerBgmWav(tmpWav, durationSec, mood);
  try {
    execSync(
      `ffmpeg -y -loglevel error -i "${tmpWav}" -codec:a libmp3lame -qscale:a 3 "${outMp3Path}"`
    );
    fs.unlinkSync(tmpWav);
  } catch {
    fs.renameSync(tmpWav, outMp3Path);
  }
}

// Broadcast-grade voiceover mastering via ffmpeg (warm highpass + compressor + EBU R128 loudness normalization)
function masterVoiceAudio(filePath) {
  const tmpMaster = `${filePath}.master.mp3`;
  try {
    execSync(
      `ffmpeg -y -loglevel error -i "${filePath}" -af "highpass=f=80,acompressor=threshold=-18dB:ratio=2.5:attack=15:release=180,loudnorm=I=-16:TP=-1.5:LRA=11" -codec:a libmp3lame -qscale:a 2 "${tmpMaster}"`
    );
    fs.renameSync(tmpMaster, filePath);
  } catch {
    if (fs.existsSync(tmpMaster)) fs.unlinkSync(tmpMaster);
  }
}

// Measure audio duration in seconds via ffprobe
function getAudioDurationSec(filePath, fallbackSec = 0) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8' }
    ).trim();
    const val = parseFloat(out);
    return Number.isFinite(val) && val > 0 ? val : fallbackSec;
  } catch {
    return fallbackSec;
  }
}

// Fallback proportional syllable/word splitter when raw text needs word-level timestamps
function buildProportionalWords(text, totalDurationMs, fpsVal) {
  const rawTokens = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (rawTokens.length === 0) return [];

  const startPadMs = 80;
  const usableMs = Math.max(300, totalDurationMs - startPadMs - 120);
  const weights = rawTokens.map((w) => {
    const cleanLen = w.replace(/[^\p{L}\p{N}]/gu, '').length || 1;
    const pauseBonus = /[,.;:!?]$/.test(w) ? 2.2 : 0;
    return Math.max(1.5, cleanLen * 0.85 + pauseBonus);
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

// Write Python helper script that calls edge_tts.Communicate(..., boundary="WordBoundary")
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
    with open(out_mp3, "wb") as audio_f:
        async for chunk in comm.stream():
            ctype = chunk.get("type")
            if ctype == "audio":
                audio_f.write(chunk["data"])
            elif ctype in ("WordBoundary", "SentenceBoundary"):
                offset_ms = round(chunk.get("offset", 0) / 10000)
                dur_ms = round(chunk.get("duration", 0) / 10000)
                wtext = (chunk.get("text") or "").strip()
                if wtext:
                    words.append({
                        "type": ctype,
                        "word": wtext,
                        "startMs": offset_ms,
                        "endMs": offset_ms + max(60, dur_ms)
                    })

    with open(out_json, "w", encoding="utf-8") as jf:
        json.dump(words, jf, ensure_ascii=False)

asyncio.run(main())
`,
  'utf-8'
);

// Normalize raw boundary events into guaranteed Word-by-Word tokens matching original punctuation
function normalizeWordBoundaries(originalText, rawBoundaries, actualDurationMs, fpsVal) {
  const originalTokens = originalText
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (originalTokens.length === 0) return [];

  const wordEvents = (rawBoundaries || []).filter((b) => b.type === 'WordBoundary');

  // If Edge-TTS emitted individual WordBoundary events for words
  if (wordEvents.length >= Math.max(1, Math.floor(originalTokens.length * 0.6))) {
    // Expand any multi-word boundary chunks into single words
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

    // Align with original tokens to preserve punctuation and exact casing
    const count = originalTokens.length;
    return originalTokens.map((origWord, i) => {
      const mappedIdx = Math.min(
        expanded.length - 1,
        Math.floor((i / count) * expanded.length)
      );
      const ev = expanded[mappedIdx];
      const nextEv = expanded[mappedIdx + 1];
      const startMs = ev.startMs;
      const endMs = nextEv ? Math.max(startMs + 80, nextEv.startMs) : Math.max(startMs + 120, ev.endMs);
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

  // Fallback: proportional alignment across actual measured audio duration
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
    writeWavOrMp3(outFile, 1, 'epic-space');
    fs.copyFileSync(outFile, `src/remotion/public/voice-${i}.mp3`);
    continue;
  }

  try {
    const tmpTxt = `public/voice-${i}.txt`;
    fs.writeFileSync(tmpTxt, text.trim(), 'utf-8');

    let rawBoundaries = [];
    try {
      execSync(
        `python3 "${pyScriptPath}" "${tmpTxt}" "${segVoice}" "${rate}" "${outFile}" "${rawJsonFile}"`,
        { stdio: 'inherit' }
      );
      if (fs.existsSync(rawJsonFile)) {
        rawBoundaries = JSON.parse(fs.readFileSync(rawJsonFile, 'utf-8'));
        fs.unlinkSync(rawJsonFile);
      }
    } catch {
      execSync(
        `edge-tts --file "${tmpTxt}" --voice "${segVoice}" --rate="${rate}" --write-media "${outFile}"`,
        { stdio: 'inherit' }
      );
    }

    if (fs.existsSync(tmpTxt)) fs.unlinkSync(tmpTxt);

    // Master audio clarity & loudness
    masterVoiceAudio(outFile);
    fs.copyFileSync(outFile, `src/remotion/public/voice-${i}.mp3`);

    const audioDurSec = getAudioDurationSec(outFile, 4);
    const audioDurMs = Math.round(audioDurSec * 1000);
    // Add 0.55s natural breathing pause per scene
    const sceneDurationFrames = Math.ceil((audioDurSec + 0.55) * fps);
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
      words,
    });
    cumulativeFrames += sceneDurationFrames;

    console.log(
      `🎙️ Scene ${i}: ${outFile} (${audioDurSec.toFixed(2)}s -> ${sceneDurationFrames} frames, ${words.length} synced words)`
    );
  } catch (err) {
    console.warn(`Edge-TTS fallback for ${outFile}:`, err);
    writeWavOrMp3(outFile, 3, 'epic-space');
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
      words,
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
  scenesTelemetry.length > 0
    ? Math.max(defaultDurationFrames, cumulativeFrames)
    : defaultDurationFrames;
const bgmDurationSeconds = Math.max(10, Math.ceil(computedDurationInFrames / fps) + 5);

// 2. Generate Multi-Layer Stereo BGM (4-Chord Progression + Bass + Arpeggio)
try {
  writeWavOrMp3('public/bgm.mp3', bgmDurationSeconds, config.bgmMood || 'epic-space');
  fs.copyFileSync('public/bgm.mp3', 'src/remotion/public/bgm.mp3');
  console.log(`✅ Generated Multi-Layer Studio BGM (${config.bgmMood}) at public/bgm.mp3 (${bgmDurationSeconds}s)`);
} catch (err) {
  console.error('Failed to generate BGM:', err);
}

// 3. Write complete Ground-Truth Audio & Word Telemetry JSON
const telemetryPayload = {
  fps,
  totalFrames: computedDurationInFrames,
  sceneFrames: scenesTelemetry.map((s) => s.durationInFrames),
  scenes: scenesTelemetry,
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

// 4. Update src/remotion/meta.json
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
      },
      null,
      2
    ),
    'utf-8'
  );
} catch (err) {
  console.warn('Could not update src/remotion/meta.json:', err);
}

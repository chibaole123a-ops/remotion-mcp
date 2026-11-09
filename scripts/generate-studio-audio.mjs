import fs from 'fs';
import { execSync } from 'child_process';

const audioB64 = process.env.AUDIO_B64 || '';
const fps = Number(process.env.FPS || 30);
const defaultDurationFrames = Number(process.env.DURATION || 600);
const durationSeconds = Math.max(10, Math.ceil(defaultDurationFrames / fps) + 5);

fs.mkdirSync('public', { recursive: true });
fs.mkdirSync('src/remotion/public', { recursive: true });

// Pure Node.js stereo WAV generator — zero external dependencies (never fails if ffmpeg is missing!)
function generateStereoWav(filePath, durationSec, mood) {
  const sampleRate = 22050;
  const numChannels = 2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // WAV Header
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

  // Select harmonic chord frequencies based on mood
  let freqs = [110, 164.81, 220, 277.18]; // epic-space (A2, E3, A3, C#4)
  if (mood === 'cyber-tech' || mood === 'upbeat-energetic') {
    freqs = [130.81, 196.0, 261.63, 329.63]; // C3, G3, C4, E4
  } else if (mood === 'warm-inspiring') {
    freqs = [146.83, 220.0, 293.66, 369.99]; // D3, A3, D4, F#4
  } else if (mood === 'mystery-deep') {
    freqs = [73.42, 110.0, 146.83, 174.61]; // D2, A2, D3, F3
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Smooth fade-in (2s) and fade-out (2s)
    const fadeIn = Math.min(1, t / 2.0);
    const fadeOut = Math.min(1, (durationSec - t) / 2.0);
    const env = Math.max(0, Math.min(1, fadeIn * fadeOut));

    // Slow atmospheric modulation
    const lfoL = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.18 * t);
    const lfoR = 0.65 + 0.35 * Math.cos(2 * Math.PI * 0.22 * t);

    const wave =
      0.38 * Math.sin(2 * Math.PI * freqs[0] * t) +
      0.28 * Math.sin(2 * Math.PI * freqs[1] * t) +
      0.20 * Math.sin(2 * Math.PI * freqs[2] * t) +
      0.14 * Math.sin(2 * Math.PI * freqs[3] * t);

    const sampleL = Math.max(-1, Math.min(1, wave * env * lfoL * 0.45));
    const sampleR = Math.max(-1, Math.min(1, wave * env * lfoR * 0.45));

    buffer.writeInt16LE(Math.floor(sampleL * 32767), offset);
    buffer.writeInt16LE(Math.floor(sampleR * 32767), offset + 2);
    offset += 4;
  }

  fs.writeFileSync(filePath, buffer);
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

// 1. Always generate public/bgm.mp3 (and copy to src/remotion/public/bgm.mp3)
try {
  generateStereoWav('public/bgm.mp3', durationSeconds, config.bgmMood || 'epic-space');
  fs.copyFileSync('public/bgm.mp3', 'src/remotion/public/bgm.mp3');
  console.log('✅ Generated ambient stereo BGM at public/bgm.mp3');
} catch (err) {
  console.error('Failed to generate BGM:', err);
}

// 2. Generate Neural AI Voiceovers via edge-tts for each narration segment (up to 30 segments)
const segments = Array.isArray(config.narrationSegments) ? config.narrationSegments : [];
const voice = config.voice || 'vi-VN-NamMinhNeural';
const rate = config.rate || '+5%';

for (let i = 0; i < Math.max(segments.length, 15); i++) {
  const seg = segments[i];
  const text = typeof seg === 'string' ? seg : seg?.text || '';
  const segVoice = (typeof seg === 'object' && seg?.voice) || voice;
  const outFile = `public/voice-${i}.mp3`;

  if (!text.trim()) {
    // Create a silent fallback audio file so staticFile('voice-X.mp3') never 404s even if Gemini references an extra index
    generateStereoWav(outFile, 1, 'epic-space');
    fs.copyFileSync(outFile, `src/remotion/public/voice-${i}.mp3`);
    continue;
  }

  try {
    const tmpTxt = `public/voice-${i}.txt`;
    fs.writeFileSync(tmpTxt, text.trim(), 'utf-8');
    execSync(
      `edge-tts --file "${tmpTxt}" --voice "${segVoice}" --rate="${rate}" --write-media "${outFile}"`,
      { stdio: 'inherit' }
    );
    fs.unlinkSync(tmpTxt);
    fs.copyFileSync(outFile, `src/remotion/public/voice-${i}.mp3`);
    console.log(`🎙️ Generated Neural AI Voiceover: ${outFile}`);
  } catch (err) {
    console.warn(`Edge-TTS fallback for ${outFile}:`, err);
    generateStereoWav(outFile, 3, 'epic-space');
    fs.copyFileSync(outFile, `src/remotion/public/voice-${i}.mp3`);
  }
}

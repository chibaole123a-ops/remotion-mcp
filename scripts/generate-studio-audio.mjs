import fs from 'fs';
import { execSync } from 'child_process';

const audioB64 = process.env.AUDIO_B64 || '';
const fps = Number(process.env.FPS || 30);
const defaultDurationFrames = Number(process.env.DURATION || 600);
const durationSeconds = Math.max(5, Math.ceil(defaultDurationFrames / fps) + 5);

fs.mkdirSync('public', { recursive: true });

let config = {
  voice: 'vi-VN-HoaiMyNeural',
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

// 1. Generate copyright-free procedural stereo cinematic BGM using FFmpeg lavfi
const mood = config.bgmMood || 'epic-space';
let filter = '';

if (mood === 'cyber-tech' || mood === 'upbeat-energetic') {
  // Futuristic warm synth chord + subtle rhythmic pulse
  filter = `aevalsrc='0.12*sin(2*PI*110*t)+0.09*sin(2*PI*164.81*t)+0.08*sin(2*PI*220*t)+0.06*sin(2*PI*329.63*t)*(0.6+0.4*sin(2*PI*2*t)):s=44100:d=${durationSeconds}',lowpass=f=1200,afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(1, durationSeconds - 2)}:d=2`;
} else if (mood === 'warm-inspiring') {
  // Major harmonic warm pad (C4 - E4 - G4 - B4)
  filter = `aevalsrc='0.11*sin(2*PI*130.81*t)+0.09*sin(2*PI*164.81*t)+0.08*sin(2*PI*196.00*t)+0.06*sin(2*PI*246.94*t)*(0.7+0.3*sin(2*PI*0.25*t)):s=44100:d=${durationSeconds}',lowpass=f=900,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(1, durationSeconds - 2)}:d=2`;
} else if (mood === 'mystery-deep') {
  // Deep documentary atmospheric drone (D2 - A2 - F3)
  filter = `aevalsrc='0.14*sin(2*PI*73.42*t)+0.10*sin(2*PI*110.00*t)+0.07*sin(2*PI*174.61*t)*(0.5+0.5*sin(2*PI*0.18*t)):s=44100:d=${durationSeconds}',lowpass=f=700,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(1, durationSeconds - 2)}:d=2`;
} else {
  // Default: epic-space (Deep cosmic pad A2 - E3 - B3 - C#4)
  filter = `aevalsrc='0.13*sin(2*PI*110*t)+0.10*sin(2*PI*164.81*t)+0.07*sin(2*PI*246.94*t)+0.05*sin(2*PI*277.18*t)*(0.6+0.4*sin(2*PI*0.2*t)):s=44100:d=${durationSeconds}',lowpass=f=850,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(1, durationSeconds - 2)}:d=2`;
}

try {
  execSync(`ffmpeg -y -f lavfi -i "${filter}" -c:a libmp3lame -q:a 4 public/bgm.mp3`, {
    stdio: 'ignore',
  });
  console.log('✅ Generated public/bgm.mp3 for mood:', mood);
} catch (err) {
  console.warn('BGM generation fallback:', err);
}

// 2. Generate Neural AI Voiceovers via edge-tts for each narration segment (if provided)
const segments = Array.isArray(config.narrationSegments) ? config.narrationSegments : [];
const voice = config.voice || 'vi-VN-HoaiMyNeural';
const rate = config.rate || '+5%';

const timingMetadata = [];

for (let i = 0; i < segments.length; i++) {
  const seg = segments[i];
  const text = typeof seg === 'string' ? seg : seg?.text || '';
  const segVoice = (typeof seg === 'object' && seg?.voice) || voice;
  const outFile = `public/voice-${i}.mp3`;

  if (!text.trim()) continue;

  try {
    const tmpTxt = `public/voice-${i}.txt`;
    fs.writeFileSync(tmpTxt, text.trim(), 'utf-8');
    execSync(
      `edge-tts --file "${tmpTxt}" --voice "${segVoice}" --rate="${rate}" --write-media "${outFile}"`,
      { stdio: 'inherit' }
    );
    fs.unlinkSync(tmpTxt);

    // Measure exact audio duration in seconds using ffprobe
    const durStr = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outFile}"`,
      { encoding: 'utf-8' }
    ).trim();
    const sec = parseFloat(durStr) || 4;
    const frames = Math.ceil(sec * fps);

    timingMetadata.push({
      index: i,
      file: `voice-${i}.mp3`,
      text: text.trim(),
      durationInSeconds: sec,
      durationInFrames: frames,
    });
    console.log(`🎙️ Generated voice-${i}.mp3 (${sec.toFixed(2)}s / ${frames} frames)`);
  } catch (err) {
    console.error(`Failed to generate voice-${i}.mp3:`, err);
  }
}

fs.writeFileSync('public/voice-metadata.json', JSON.stringify(timingMetadata, null, 2), 'utf-8');

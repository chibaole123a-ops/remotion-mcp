import { validateTsxComposition, type ValidationContext } from "../shared/quality-rubric.js";

export function toBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function randomJobId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function sanitizeJobId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'unknown';
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function estimateAudioMinFrames(
  audioConfig: ValidationContext['audioConfig'],
  fps = 30
): number | undefined {
  const scenes = audioConfig?.scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) return undefined;
  const telemetry = calculateSpeechTelemetry(
    scenes,
    audioConfig?.voice || 'vi-VN-NamMinhNeural',
    fps,
    audioConfig?.rate || '+0%'
  );
  return telemetry.totalDurationInFrames;
}

export function validateTsxCode(tsxCode: string, ctx: ValidationContext = {}): string[] {
  const expectedMinFrames =
    ctx.expectedMinFrames ?? estimateAudioMinFrames(ctx.audioConfig, ctx.fps || 30);
  return validateTsxComposition(tsxCode, { ...ctx, expectedMinFrames });
}

export function calculateSpeechTelemetry(
  rawScenes: any,
  defaultVoice = 'vi-VN-NamMinhNeural',
  fps = 30,
  rateStr = '+0%'
) {
  let rateMultiplier = 1.0;
  const rateMatch = rateStr.match(/([+-]?\d+)%/);
  if (rateMatch) {
    rateMultiplier = 1.0 + Number(rateMatch[1]) / 100;
  }
  rateMultiplier = Math.max(0.5, Math.min(2.0, rateMultiplier));

  const list = Array.isArray(rawScenes)
    ? rawScenes
    : typeof rawScenes === 'string' && rawScenes.trim()
    ? [{ text: rawScenes.trim() }]
    : [];

  let cumulativeFrames = 0;
  let cumulativeSec = 0;

  const scenes = list.map((item: any, idx: number) => {
    const text = (typeof item === 'string' ? item : item?.text || '').trim();
    const voice = (typeof item === 'object' && item?.voice) || defaultVoice;

    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const baseWps = 3.65;
    const baseDur = wordCount > 0 ? wordCount / (baseWps * rateMultiplier) : 0;

    const commas = (text.match(/[,;](\s|$)/g) || []).length;
    const periods = (text.match(/[.!?](\s|$)/g) || []).length;
    const pauseDur = (commas * 0.12 + periods * 0.22) / rateMultiplier;

    const durationSec = Number(Math.max(1.2, baseDur + pauseDur + 0.15).toFixed(2));
    const durationInFrames = Math.ceil(durationSec * fps);

    const startFrame = cumulativeFrames;
    const endFrame = startFrame + durationInFrames;

    cumulativeFrames += durationInFrames;
    cumulativeSec += durationSec;

    return {
      sceneIndex: idx,
      text,
      voice,
      wordCount,
      durationSec,
      durationInFrames,
      startFrame,
      endFrame,
      audioFileName: `voice-${idx}.mp3`,
      usageCode: `<Sequence from={${startFrame}} durationInFrames={${durationInFrames}}><Audio src={staticFile("voice-${idx}.mp3")} volume={1} /></Sequence>`,
    };
  });

  return {
    fps,
    defaultVoice,
    rate: rateStr,
    totalScenes: scenes.length,
    totalDurationSec: Number(cumulativeSec.toFixed(2)),
    totalDurationInFrames: cumulativeFrames,
    scenes,
    audioConfigPayload: {
      voice: defaultVoice,
      rate: rateStr,
      scenes: scenes.map((s) => ({ text: s.text, voice: s.voice })),
    },
    message: `Synthesized timing for ${scenes.length} scene(s). Total duration: ${cumulativeSec.toFixed(1)}s (${cumulativeFrames} frames @ ${fps}fps). Use these exact frame boundaries in your Remotion <Sequence> components!`,
  };
}

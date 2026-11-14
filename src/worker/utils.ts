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

const STOPWORDS = new Set([
  'và', 'là', 'của', 'có', 'trong', 'một', 'những', 'các', 'cho', 'được', 'với', 'khi',
  'này', 'đó', 'để', 'như', 'từ', 'về', 'trên', 'đến', 'ra', 'vào', 'lại', 'đã', 'đang',
  'từng', 'mỗi', 'nhiều', 'rất', 'không', 'cũng', 'hãy', 'chỉ', 'thành', 'bằng', 'giữa', 'cùng',
  'nên', 'đều', 'sẽ', 'hơn', 'lên', 'xuống', 'nếu', 'nhưng', 'rồi', 'hay', 'hoặc', 'dòng',
  'the', 'and', 'for', 'that', 'with', 'from', 'this', 'into', 'are', 'was', 'were',
]);

export function extractAnchorKeywords(text: string, maxKeywords = 3): string[] {
  const rawTokens = text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t.toLowerCase()));

  const longTokens = rawTokens.filter((t) => t.length >= 4);
  const tokens = longTokens.length >= maxKeywords ? longTokens : rawTokens;
  if (tokens.length === 0) return [];
  const step = Math.max(1, Math.floor(tokens.length / maxKeywords));
  const picks: string[] = [];
  for (let i = 0; i < tokens.length && picks.length < maxKeywords; i += step) {
    if (!picks.includes(tokens[i])) picks.push(tokens[i]);
  }
  return picks;
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

    const pauseAfterSec = Number(typeof item === 'object' ? item?.pauseAfterSec : NaN);
    const interScenePad = Number.isFinite(pauseAfterSec)
      ? Math.max(0.08, Math.min(2.0, pauseAfterSec))
      : idx === list.length - 1
      ? 0.45
      : 0.28;
    const durationSec = Number(Math.max(1.2, baseDur + pauseDur + interScenePad).toFixed(2));
    const durationInFrames = Math.ceil(durationSec * fps);

    const startFrame = cumulativeFrames;
    const endFrame = startFrame + durationInFrames;

    cumulativeFrames += durationInFrames;
    cumulativeSec += durationSec;

    const clampedPause = Number.isFinite(pauseAfterSec)
      ? Math.max(0.08, Math.min(2.0, pauseAfterSec))
      : undefined;

    return {
      sceneIndex: idx,
      text,
      voice,
      ...(clampedPause !== undefined ? { pauseAfterSec: clampedPause } : {}),
      wordCount,
      durationSec,
      durationInFrames,
      startFrame,
      endFrame,
      anchorKeywords: extractAnchorKeywords(text, 3),
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
      scenes: scenes.map((s) => ({
        text: s.text,
        voice: s.voice,
        ...(typeof s.pauseAfterSec === 'number' ? { pauseAfterSec: s.pauseAfterSec } : {}),
      })),
    },
    message: `Synthesized timing for ${scenes.length} scene(s). Total duration: ${cumulativeSec.toFixed(1)}s (${cumulativeFrames} frames @ ${fps}fps). Use these exact frame boundaries in your Remotion <Sequence> components!`,
  };
}

function estimateSceneRenderMultiplier(sceneMeta?: { sceneName?: string; visualConcept?: string }): {
  weight: number;
  label: 'light' | 'medium' | 'heavy';
} {
  const desc = `${sceneMeta?.sceneName || ''} ${sceneMeta?.visualConcept || ''}`.toLowerCase();
  if (/(3d|threecanvas|webgl|shader|motion[-_\s]?blur|offthreadvideo|particle|aurora|fluid)/.test(desc)) {
    return { weight: 2.0, label: 'heavy' };
  }
  if (/(video|clip|footage|chart|map|graph|timeline|lottie|skia)/.test(desc)) {
    return { weight: 1.35, label: 'medium' };
  }
  return { weight: 1.0, label: 'light' };
}

function isSemanticChapterBoundary(sceneMeta?: { sceneName?: string; continuityFromPrevScene?: string }): boolean {
  const combined = `${sceneMeta?.sceneName || ''} ${sceneMeta?.continuityFromPrevScene || ''}`.toLowerCase();
  return /(^|\b)(part|chapter|act|section|climax|outro|conclusion|phần|chương|hồi|kết|chuyển|new scene|reset)(\b|$)/i.test(
    combined
  );
}

export function buildAdaptiveChapterPlan(
  telemetryScenes: Array<{
    sceneIndex: number;
    text: string;
    voice: string;
    durationSec: number;
    durationInFrames: number;
    startFrame: number;
    endFrame: number;
  }>,
  inputScenes: Array<{ sceneName?: string; visualConcept?: string; continuityFromPrevScene?: string }>,
  defaultVoice: string,
  rate: string,
  fps: number,
  forceSplit = false
) {
  const totalSec = telemetryScenes.reduce((acc, s) => acc + s.durationSec, 0);
  const sceneCosts = telemetryScenes.map((s, idx) => {
    const est = estimateSceneRenderMultiplier(inputScenes[idx]);
    return {
      ...s,
      meta: inputScenes[idx] || {},
      multiplier: est.weight,
      complexityLabel: est.label,
      effectiveCost: s.durationSec * est.weight,
      isSemanticBoundary: idx > 0 && isSemanticChapterBoundary(inputScenes[idx]),
    };
  });
  const totalEffectiveCost = sceneCosts.reduce((acc, s) => acc + s.effectiveCost, 0);

  const shouldPartition =
    telemetryScenes.length >= 4 &&
    (forceSplit || totalSec > 180 || telemetryScenes.length >= 12 || totalEffectiveCost > 250);

  const continuityPack = {
    voice: defaultVoice,
    rate,
    fps,
    fontImport: "import { loadFont } from '@remotion/google-fonts/BeVietnamPro';",
    captionPreset: 'minimal',
    bgmStrategy: shouldPartition ? 'master_sidechain' : 'local_ducking',
    continuityInstructions: shouldPartition
      ? 'Keep identical palette, typography, caption style, voice, and rate across every chapter. Omit local <Audio> BGM inside individual chapters (keep voiceover + @remotion/sfx + subtle ambience), then pass a continuous masterBgmUrl to stitch_video_chapters for seamless FFmpeg sidechain ducking from start to finish.'
      : 'Single continuous composition is optimal for this length/complexity.',
  };

  if (!shouldPartition) {
    return {
      recommendedMode: 'single_render' as const,
      totalDurationSec: Number(totalSec.toFixed(2)),
      totalEffectiveCost: Number(totalEffectiveCost.toFixed(1)),
      continuityPack,
      chapters: undefined,
    };
  }

  const MAX_CHAPTER_COST = 160;
  const MAX_CHAPTER_SEC = 180;
  const MIN_CHAPTER_SEC = 28;

  const groups: Array<typeof sceneCosts> = [];
  let currentGroup: typeof sceneCosts = [];
  let curSec = 0;
  let curCost = 0;

  for (let i = 0; i < sceneCosts.length; i++) {
    const sc = sceneCosts[i];
    const wouldExceedHard =
      currentGroup.length > 0 && (curCost + sc.effectiveCost > MAX_CHAPTER_COST || curSec + sc.durationSec > MAX_CHAPTER_SEC);
    const softSemanticCut =
      currentGroup.length >= 2 &&
      sc.isSemanticBoundary &&
      curCost >= MAX_CHAPTER_COST * 0.45 &&
      curSec >= MIN_CHAPTER_SEC;

    if (wouldExceedHard || softSemanticCut) {
      groups.push(currentGroup);
      currentGroup = [sc];
      curSec = sc.durationSec;
      curCost = sc.effectiveCost;
    } else {
      currentGroup.push(sc);
      curSec += sc.durationSec;
      curCost += sc.effectiveCost;
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Merge tiny trailing chapter (< MIN_CHAPTER_SEC) into previous chapter if at least 2 groups
  if (groups.length >= 2) {
    const last = groups[groups.length - 1];
    const lastSec = last.reduce((a, s) => a + s.durationSec, 0);
    if (lastSec < MIN_CHAPTER_SEC) {
      groups[groups.length - 2].push(...last);
      groups.pop();
    }
  }

  const chapters = groups.map((grp, chIdx) => {
    let localCursor = 0;
    const chDurationFrames = grp.reduce((acc, s) => acc + s.durationInFrames, 0);
    const chDurationSec = Number(grp.reduce((acc, s) => acc + s.durationSec, 0).toFixed(2));
    const midScene = grp[Math.floor(grp.length / 2)];
    const lastScene = grp[grp.length - 1];
    const localOffsets = grp.map((s) => {
      const start = localCursor;
      localCursor += s.durationInFrames;
      return { start, dur: s.durationInFrames, ref: s };
    });

    const previewFrames = [
      Math.min(Math.max(12, Math.round(localOffsets[0].dur * 0.45)), chDurationFrames - 10),
      ...(localOffsets.length > 2
        ? [
            Math.round(
              localOffsets[Math.floor(localOffsets.length / 2)].start +
                localOffsets[Math.floor(localOffsets.length / 2)].dur * 0.45
            ),
          ]
        : []),
      Math.max(15, Math.round(localOffsets[localOffsets.length - 1].start + lastScene.durationInFrames * 0.5)),
    ].filter((v, idx, arr) => v >= 0 && v < chDurationFrames && arr.indexOf(v) === idx);

    const hasHeavy = grp.some((s) => s.complexityLabel === 'heavy');
    return {
      chapterIndex: chIdx,
      title: grp[0]?.meta?.sceneName ? `Chapter ${chIdx + 1}: ${grp[0].meta.sceneName}` : `Chapter ${chIdx + 1}`,
      sceneRange: [grp[0].sceneIndex, lastScene.sceneIndex] as [number, number],
      sceneCount: grp.length,
      durationSec: chDurationSec,
      durationInFrames: chDurationFrames,
      estimatedComplexity: hasHeavy ? 'heavy' : 'balanced',
      recommendedPreviewFrames: previewFrames,
      audioConfigPayload: {
        voice: defaultVoice,
        rate,
        scenes: grp.map((s) => ({
          text: s.text,
          voice: s.voice,
          ...(typeof (s as any).pauseAfterSec === 'number' ? { pauseAfterSec: (s as any).pauseAfterSec } : {}),
        })),
      },
      chapterFocusCue: midScene?.meta?.sceneName || undefined,
    };
  });

  return {
    recommendedMode: chapters.length >= 2 ? ('adaptive_chapters' as const) : ('single_render' as const),
    reason:
      chapters.length >= 2
        ? `Adaptive semantic split across ${chapters.length} natural scene-bounded chapters (${totalSec.toFixed(1)}s total, effective render load ${totalEffectiveCost.toFixed(0)}). Never cuts mid-sentence.`
        : 'Single render sufficient.',
    totalDurationSec: Number(totalSec.toFixed(2)),
    totalEffectiveCost: Number(totalEffectiveCost.toFixed(1)),
    continuityPack,
    chapters: chapters.length >= 2 ? chapters : undefined,
  };
}

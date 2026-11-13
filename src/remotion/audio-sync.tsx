import React, { useMemo } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  Sequence,
  AbsoluteFill,
  Audio,
  Img,
  random,
  staticFile,
} from 'remotion';
import { fitTextOnNLines } from '@remotion/layout-utils';
import rawTelemetry from './audio-telemetry.json';

export interface Caption {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
}

export interface TikTokToken {
  text: string;
  fromMs: number;
  toMs: number;
}

export interface TikTokPage {
  text: string;
  startMs: number;
  durationMs: number;
  tokens: TikTokToken[];
}

export interface WordToken {
  word: string;
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number;
  confidence: number;
  startFrame: number;
  endFrame: number;
  globalStartFrame?: number;
  globalEndFrame?: number;
  sentenceIndex?: number;
}

export interface SceneTelemetry {
  sceneIndex: number;
  text: string;
  audioDurationSec: number;
  durationInFrames: number;
  startFrame: number;
  endFrame: number;
  words: WordToken[];
}

export interface AudioTelemetryData {
  fps: number;
  totalFrames: number;
  sceneFrames: number[];
  sceneStartFrames?: number[];
  scenes: SceneTelemetry[];
  allWords?: WordToken[];
}

export const audioTelemetry: AudioTelemetryData = rawTelemetry as AudioTelemetryData;

/**
 * Normalize text with full Vietnamese diacritics preserved (lowercase + strip punctuation).
 */
function normalizeKeepAccents(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip Vietnamese diacritics for resilient fallback matching.
 */
function stripAccents(s: string): string {
  return normalizeKeepAccents(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

/**
 * Group word-level captions into short kinetic pages with individual word tokens (`fromMs`, `toMs`).
 */
export function buildWordHighlightPages(
  captions: Caption[],
  combineTokensWithinMilliseconds = 1400
): TikTokPage[] {
  if (!Array.isArray(captions) || captions.length === 0) return [];
  const pages: TikTokPage[] = [];
  let currentTokens: TikTokToken[] = [];
  let pageStartMs = captions[0].startMs;

  for (let i = 0; i < captions.length; i++) {
    const cap = captions[i];
    const token: TikTokToken = {
      text: cap.text,
      fromMs: cap.startMs,
      toMs: cap.endMs,
    };

    const elapsedInPage = cap.endMs - pageStartMs;
    const isSentenceEnd = /[.!?…]$/.test(cap.text.trim());

    if (
      currentTokens.length > 0 &&
      (elapsedInPage > combineTokensWithinMilliseconds || currentTokens.length >= 6)
    ) {
      const lastToken = currentTokens[currentTokens.length - 1];
      pages.push({
        text: currentTokens.map((t) => t.text).join(''),
        startMs: pageStartMs,
        durationMs: Math.max(200, lastToken.toMs - pageStartMs),
        tokens: currentTokens,
      });
      currentTokens = [token];
      pageStartMs = cap.startMs;
    } else {
      if (currentTokens.length === 0) pageStartMs = cap.startMs;
      currentTokens.push(token);
      if (isSentenceEnd && currentTokens.length >= 3 && i < captions.length - 1) {
        pages.push({
          text: currentTokens.map((t) => t.text).join(''),
          startMs: pageStartMs,
          durationMs: Math.max(200, token.toMs - pageStartMs),
          tokens: currentTokens,
        });
        currentTokens = [];
      }
    }
  }

  if (currentTokens.length > 0) {
    const lastToken = currentTokens[currentTokens.length - 1];
    pages.push({
      text: currentTokens.map((t) => t.text).join(''),
      startMs: pageStartMs,
      durationMs: Math.max(200, lastToken.toMs - pageStartMs),
      tokens: currentTokens,
    });
  }

  return pages;
}

/**
 * Get the exact measured duration in frames for a given segment/scene index (0-based),
 * locked 100% to the real synthesized voiceover length on the Cloud.
 */
export function getSceneFrames(sceneIndex: number, fallbackFrames = 180): number {
  const val = audioTelemetry?.sceneFrames?.[sceneIndex];
  return typeof val === 'number' && val > 0 ? val : fallbackFrames;
}

/**
 * Get the exact global start frame of segment `sceneIndex` on the master timeline.
 */
export function getSegmentStartFrame(sceneIndex: number, fallbackStartFrame = 0): number {
  const scene = audioTelemetry?.scenes?.[sceneIndex];
  if (scene && typeof scene.startFrame === 'number') return scene.startFrame;
  const startFromArr = audioTelemetry?.sceneStartFrames?.[sceneIndex];
  if (typeof startFromArr === 'number') return startFromArr;
  return fallbackStartFrame;
}

/**
 * Get total video duration in frames measured from `audio-telemetry.json`, falling back safely.
 */
export function getTelemetryTotalFrames(fallbackFrames = 300): number {
  const tf = audioTelemetry?.totalFrames;
  return typeof tf === 'number' && tf > 0 ? tf : fallbackFrames;
}

/**
 * Get the exact global end frame of segment `sceneIndex` on the master timeline.
 */
export function getSceneEndFrame(sceneIndex: number, fallbackEndFrame = 180): number {
  const scene = audioTelemetry?.scenes?.[sceneIndex];
  if (scene && typeof scene.endFrame === 'number' && scene.endFrame > 0) return scene.endFrame;
  const start = getSegmentStartFrame(sceneIndex, -1);
  const dur = getSceneFrames(sceneIndex, -1);
  if (start >= 0 && dur > 0) return start + dur;
  return fallbackEndFrame;
}

/**
 * Get exact measured { startFrame, endFrame, durationInFrames } for `sceneIndex` with safe fallbacks.
 */
export function getSceneTiming(
  sceneIndex: number,
  fallbackStart = 0,
  fallbackDur = 180
): { startFrame: number; endFrame: number; durationInFrames: number } {
  const startFrame = getSegmentStartFrame(sceneIndex, fallbackStart);
  const durationInFrames = getSceneFrames(sceneIndex, fallbackDur);
  const endFrame = getSceneEndFrame(sceneIndex, startFrame + durationInFrames);
  return { startFrame, endFrame, durationInFrames };
}

/**
 * Get a proportional beat frame based on actual spoken words in `sceneIndex`.
 * For example, `getBeatFrame(0, 1, 3)` returns the startFrame of the word at 1/3rd through scene 0.
 */
export function getBeatFrame(
  sceneIndex: number,
  beatIndex: number,
  totalBeats = 3
): number {
  const scene = audioTelemetry?.scenes?.[sceneIndex];
  const sceneDur = getSceneFrames(sceneIndex, 180);
  const clampedRatio = Math.max(0, Math.min(0.9, beatIndex / Math.max(1, totalBeats)));

  if (!scene || !Array.isArray(scene.words) || scene.words.length === 0) {
    return Math.round(sceneDur * clampedRatio);
  }

  const wordIdx = Math.min(
    scene.words.length - 1,
    Math.max(0, Math.floor(scene.words.length * clampedRatio))
  );
  return scene.words[wordIdx].startFrame;
}

/**
 * Find the exact local frame within `sceneIndex` when the narrator speaks `keywordOrPhrase`.
 * Supports multi-word phrases, exact diacritic match, and accent-stripped fuzzy fallback.
 */
export function getWordFrame(
  sceneIndex: number,
  keywordOrPhrase: string,
  fallbackFrame?: number
): number {
  const scene = audioTelemetry?.scenes?.[sceneIndex];
  const defaultFallback = typeof fallbackFrame === 'number' ? fallbackFrame : getBeatFrame(sceneIndex, 1, 3);

  if (!scene || !Array.isArray(scene.words) || scene.words.length === 0) {
    return defaultFallback;
  }

  const target = normalizeKeepAccents(keywordOrPhrase);
  if (!target) return defaultFallback;

  const targetParts = target.split(/\s+/).filter(Boolean);
  const words = scene.words;

  // Pass 1: Exact accent multi-word phrase match
  if (targetParts.length > 1 && words.length >= targetParts.length) {
    for (let i = 0; i <= words.length - targetParts.length; i++) {
      let matched = true;
      for (let j = 0; j < targetParts.length; j++) {
        const wNorm = normalizeKeepAccents(words[i + j].word);
        if (wNorm !== targetParts[j] && !wNorm.includes(targetParts[j])) {
          matched = false;
          break;
        }
      }
      if (matched) return words[i].startFrame;
    }
  }

  // Pass 2: Accent-stripped multi-word phrase match
  const strippedParts = stripAccents(keywordOrPhrase).split(/\s+/).filter(Boolean);
  if (strippedParts.length > 1 && words.length >= strippedParts.length) {
    for (let i = 0; i <= words.length - strippedParts.length; i++) {
      let matched = true;
      for (let j = 0; j < strippedParts.length; j++) {
        const wStripped = stripAccents(words[i + j].word);
        if (wStripped !== strippedParts[j] && !wStripped.includes(strippedParts[j])) {
          matched = false;
          break;
        }
      }
      if (matched) return words[i].startFrame;
    }
  }

  // Pass 3: Single significant word match (with accents)
  for (const part of targetParts) {
    if (part.length < 2) continue;
    const exactWord = words.find((w) => normalizeKeepAccents(w.word) === part);
    if (exactWord) return exactWord.startFrame;
  }
  const firstTarget = targetParts[0];
  const partialWord = words.find((w) => normalizeKeepAccents(w.word).includes(firstTarget));
  if (partialWord) return partialWord.startFrame;

  // Pass 4: Single word match (accent-stripped fallback)
  for (const sPart of strippedParts) {
    if (sPart.length < 2) continue;
    const strippedMatch = words.find((w) => stripAccents(w.word) === sPart);
    if (strippedMatch) return strippedMatch.startFrame;
  }

  return defaultFallback;
}

/**
 * Find the exact GLOBAL frame across the entire continuous video when `keywordOrPhrase` is spoken in `sceneIndex`.
 */
export function getGlobalWordFrame(
  sceneIndex: number,
  keywordOrPhrase: string,
  fallbackGlobalFrame = 0
): number {
  const startOffset = getSegmentStartFrame(sceneIndex, 0);
  const localF = getWordFrame(sceneIndex, keywordOrPhrase, -1);
  return localF >= 0 ? startOffset + localF : fallbackGlobalFrame;
}

/**
 * Smoothly triggers a 0 -> 1 animation progress starting at the exact frame `keywordOrPhrase` is spoken!
 * Uses smooth cubic-bezier easing so visual elements glide in without any abrupt pop or lag.
 */
export function getWordTrigger(
  sceneIndex: number,
  keywordOrPhrase: string,
  currentLocalFrame: number,
  transitionDurationFrames = 22,
  fallbackBeatRatio = 0.35
): number {
  const sceneDur = getSceneFrames(sceneIndex, 180);
  const defaultFallback = Math.round(sceneDur * Math.max(0.05, Math.min(0.85, fallbackBeatRatio)));
  const triggerFrame = getWordFrame(sceneIndex, keywordOrPhrase, defaultFallback);
  const dur = Math.max(8, transitionDurationFrames);

  return interpolate(currentLocalFrame, [triggerFrame, triggerFrame + dur], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/**
 * Returns normalized 0 -> 1 progress during the time window between `startKeyword` and `endKeyword` in `sceneIndex`.
 */
export function getWordProgress(
  sceneIndex: number,
  startKeyword: string,
  endKeyword: string,
  currentLocalFrame: number,
  fallbackStartFrame?: number,
  fallbackEndFrame?: number
): number {
  const defStart = typeof fallbackStartFrame === 'number' ? fallbackStartFrame : getBeatFrame(sceneIndex, 0, 3);
  const defEnd = typeof fallbackEndFrame === 'number' ? fallbackEndFrame : getBeatFrame(sceneIndex, 2, 3);
  const startF = getWordFrame(sceneIndex, startKeyword, defStart);
  const rawEndF = getWordFrame(sceneIndex, endKeyword, defEnd);
  const endF = Math.max(startF + 15, rawEndF);

  return interpolate(currentLocalFrame, [startF, endF], [0, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/**
 * Get Caption[] array for `sceneIndex`.
 */
export function getSceneCaptions(sceneIndex: number): Caption[] {
  const scene = audioTelemetry?.scenes?.[sceneIndex];
  if (!scene || !Array.isArray(scene.words)) return [];
  return scene.words.map((w) => ({
    text: w.text,
    startMs: w.startMs,
    endMs: w.endMs,
    timestampMs: w.timestampMs,
    confidence: w.confidence ?? 1,
  }));
}

/**
 * Zero-Drift Synchronized Scene Envelope (`<SyncedScene sceneIndex={i}>`):
 * 1. Locks the scene's start frame (`getSegmentStartFrame(i)`) and duration (`getSceneFrames(i)`)
 *    100% to the real measured voiceover MP3 on the Cloud — zero cumulative drift!
 * 2. Applies a butter-smooth cinema envelope (gentle fade + subtle camera push/glide during the
 *    first `enterFrames` and last `exitFrames` breath padding) so scenes flow seamlessly into one
 *    another without abrupt hard cuts!
 */
export type SceneTransitionStyle = 'zoom-through' | 'whip-pan' | 'wipe' | 'fade' | 'cut';

export interface SyncedSceneProps {
  sceneIndex: number;
  fallbackStartFrame?: number;
  fallbackDurationInFrames?: number;
  enterFrames?: number;
  exitFrames?: number;
  overlapFrames?: number;
  transitionStyle?: SceneTransitionStyle;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const SyncedSceneInner: React.FC<{
  durationInFrames: number;
  enterFrames: number;
  exitFrames: number;
  isFirst: boolean;
  isLast: boolean;
  transitionStyle: SceneTransitionStyle;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({
  durationInFrames,
  enterFrames,
  exitFrames,
  isFirst,
  isLast,
  transitionStyle,
  style,
  children,
}) => {
  const frame = useCurrentFrame();

  if (transitionStyle === 'cut') {
    return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
  }

  const inFrames = isFirst ? Math.min(10, enterFrames) : enterFrames;
  const outFrames = isLast ? Math.min(12, exitFrames) : exitFrames;
  const exitStart = Math.max(inFrames + 4, durationInFrames - outFrames);

  const enterProgress = interpolate(frame, [0, inFrames], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exitProgress = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Never fade first scene to 0 on frame 0 or dip mid-cut to black when overlapped
  const enterOpacity = isFirst ? 1 : enterProgress;
  const exitOpacity = isLast ? 1 : 1 - exitProgress;
  let opacity = enterOpacity * exitOpacity;
  let transform = 'none';
  let clipPath: string | undefined;

  if (transitionStyle === 'whip-pan') {
    const enterX = isFirst ? 0 : interpolate(enterProgress, [0, 1], [320, 0]);
    const exitX = isLast ? 0 : interpolate(exitProgress, [0, 1], [0, -240]);
    const scale = isLast ? 1 : interpolate(exitProgress, [0, 1], [1, 0.96]);
    transform = `translate3d(${(enterX + exitX).toFixed(1)}px, 0, 0) scale(${scale.toFixed(4)})`;
  } else if (transitionStyle === 'zoom-through') {
    const enterScale = isFirst ? 1 : interpolate(enterProgress, [0, 1], [0.92, 1]);
    const exitScale = isLast ? 1 : interpolate(exitProgress, [0, 1], [1, 1.09]);
    transform = `scale(${(enterScale * exitScale).toFixed(4)})`;
  } else if (transitionStyle === 'wipe') {
    if (!isFirst && enterProgress < 1) {
      const rightPct = ((1 - enterProgress) * 100).toFixed(2);
      clipPath = `inset(0 ${rightPct}% 0 0)`;
      opacity = exitOpacity;
    }
  } else {
    const scale =
      (isFirst ? 1 : interpolate(enterProgress, [0, 1], [0.985, 1])) *
      (isLast ? 1 : interpolate(exitProgress, [0, 1], [1, 1.015]));
    transform = `scale(${scale.toFixed(4)})`;
  }

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform,
        clipPath,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const SyncedScene: React.FC<SyncedSceneProps> = ({
  sceneIndex,
  fallbackStartFrame = 0,
  fallbackDurationInFrames = 180,
  enterFrames = 12,
  exitFrames = 12,
  overlapFrames = 10,
  transitionStyle = 'zoom-through',
  children,
  style,
}) => {
  const totalScenes = audioTelemetry?.scenes?.length || 1;
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex >= totalScenes - 1;

  const baseStart = getSegmentStartFrame(sceneIndex, fallbackStartFrame);
  const baseDur = getSceneFrames(sceneIndex, fallbackDurationInFrames);

  const actualOverlap = transitionStyle === 'cut' ? 0 : overlapFrames;
  const actualStart = isFirst ? baseStart : Math.max(0, baseStart - actualOverlap);
  const actualDur = isFirst ? baseDur : baseDur + actualOverlap;

  return (
    <Sequence from={actualStart} durationInFrames={actualDur}>
      <SyncedSceneInner
        durationInFrames={actualDur}
        enterFrames={enterFrames}
        exitFrames={exitFrames}
        isFirst={isFirst}
        isLast={isLast}
        transitionStyle={transitionStyle}
        style={style}
      >
        {children}
      </SyncedSceneInner>
    </Sequence>
  );
};

export interface SceneAnchoredSequenceProps {
  sceneIndex: number;
  offsetFrames?: number;
  durationInFrames: number;
  fromEnd?: boolean;
  fallbackStartFrame?: number;
  fallbackDurationInFrames?: number;
  children: React.ReactNode;
}

/**
 * Mounts an SFX or overlay `<Sequence>` anchored dynamically to a scene's real telemetry boundary
 * so timing never drifts even when TTS speech speed shifts relative to initial estimates.
 */
export const SceneAnchoredSequence: React.FC<SceneAnchoredSequenceProps> = ({
  sceneIndex,
  offsetFrames = 0,
  durationInFrames,
  fromEnd = false,
  fallbackStartFrame = 0,
  fallbackDurationInFrames = 180,
  children,
}) => {
  const timing = getSceneTiming(sceneIndex, fallbackStartFrame, fallbackDurationInFrames);
  const anchor = fromEnd ? timing.endFrame : timing.startFrame;
  const from = Math.max(0, Math.round(anchor + offsetFrames));
  return (
    <Sequence from={from} durationInFrames={durationInFrames}>
      {children}
    </Sequence>
  );
};

/**
 * Interactive Cinematic Camera Canvas (<StoryboardCanvas>):
 * Creates a shared spatial world across the entire video so scene changes feel like
 * a continuous documentary camera move across a single large universe (Vox/Johnny Harris style),
 * rather than hard-cut slide presentations.
 */
export interface StoryboardCanvasProps {
  children: React.ReactNode;
  ambientColor?: string;
  gridOpacity?: number;
  enableCameraGlide?: boolean;
  style?: React.CSSProperties;
}

export const StoryboardCanvas: React.FC<StoryboardCanvasProps> = ({
  children,
  ambientColor = '#38bdf8',
  gridOpacity = 0.08,
  enableCameraGlide = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Slow, cinematic 1-take world drift across the entire timeline
  const progress = durationInFrames > 0 ? frame / durationInFrames : 0;
  const cameraDriftX = enableCameraGlide ? Math.sin(progress * Math.PI * 1.5) * 28 : 0;
  const cameraDriftY = enableCameraGlide ? Math.cos(progress * Math.PI) * 16 : 0;
  const cameraZoom = enableCameraGlide ? 1.0 + progress * 0.035 : 1.0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#070a11',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Dynamic ambient backdrop light that subtly travels through scenes */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-20%',
          width: '140%',
          height: '140%',
          background: `radial-gradient(circle at ${50 + cameraDriftX * 0.4}% ${
            40 + cameraDriftY * 0.4
          }%, ${ambientColor}22 0%, rgba(15, 23, 42, 0) 65%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Subtle perspective spatial grid that creates continuous depth */}
      {gridOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: gridOpacity,
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
            transform: `translate3d(${cameraDriftX.toFixed(2)}px, ${cameraDriftY.toFixed(
              2
            )}px, 0)`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Main cinematic camera viewport */}
      <AbsoluteFill
        style={{
          transform: `scale(${cameraZoom.toFixed(4)}) translate3d(${(
            cameraDriftX * 0.5
          ).toFixed(2)}px, ${(cameraDriftY * 0.5).toFixed(2)}px, 0)`,
          transformOrigin: '50% 50%',
          zIndex: 2,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Chapter Progress Spine (<ChapterProgressSpine>):
 * A sleek, high-retention documentary progress indicator across chapters (like Vox/Kurzgesagt).
 */
export const ChapterProgressSpine: React.FC<{
  totalChapters?: number;
  activeChapter?: number;
  activeColor?: string;
  style?: React.CSSProperties;
}> = ({
  totalChapters,
  activeChapter,
  activeColor = '#38bdf8',
  style,
}) => {
  const frame = useCurrentFrame();
  const scenes = audioTelemetry?.scenes || [];
  const numChapters = totalChapters || scenes.length || 1;

  const currentIdx =
    typeof activeChapter === 'number'
      ? activeChapter
      : scenes.findIndex((s) => frame >= s.startFrame && frame < s.endFrame);

  if (numChapters <= 1) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 36,
        left: '6%',
        right: '6%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        zIndex: 90,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {Array.from({ length: numChapters }).map((_, idx) => {
        const isPast = currentIdx > idx;
        const isCurr = currentIdx === idx;
        return (
          <div
            key={idx}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 3,
              backgroundColor: isCurr
                ? activeColor
                : isPast
                ? 'rgba(255, 255, 255, 0.5)'
                : 'rgba(255, 255, 255, 0.15)',
              boxShadow: isCurr ? `0 0 12px ${activeColor}bb` : 'none',
              transition: 'background-color 0.3s ease',
            }}
          />
        );
      })}
    </div>
  );
};

export interface SmoothDuckingOptions {
  highVolume?: number;
  lowVolume?: number;
  attackFrames?: number;
  releaseFrames?: number;
  minGapToReleaseFrames?: number;
}

/**
 * Studio-grade smooth BGM ducking envelope using attack/release ramps around active speech scenes
 * (eliminates abrupt 1-frame volume steps).
 */
export function getSmoothDuckingVolume(
  frame: number,
  options: SmoothDuckingOptions = {}
): number {
  const highVolume = options.highVolume ?? 0.24;
  const lowVolume = options.lowVolume ?? 0.11;
  const attackFrames = Math.max(2, options.attackFrames ?? 14);
  const releaseFrames = Math.max(2, options.releaseFrames ?? 22);
  const minGap = Math.max(4, options.minGapToReleaseFrames ?? attackFrames + releaseFrames + 4);

  const scenes = audioTelemetry?.scenes || [];
  if (scenes.length === 0) return highVolume;

  // Merge speech windows whose gap is too small for BGM to meaningfully swell up and duck back down
  const windows: Array<{ start: number; end: number }> = [];
  for (const s of scenes) {
    const start = Math.max(0, s.startFrame);
    const end = Math.max(start + 1, s.endFrame);
    const prev = windows[windows.length - 1];
    if (prev && start - prev.end < minGap) {
      prev.end = Math.max(prev.end, end);
    } else {
      windows.push({ start, end });
    }
  }

  let duckAmount = 0; // 0 = full highVolume, 1 = full ducked lowVolume
  for (const w of windows) {
    const rampDownStart = w.start - attackFrames;
    const rampUpEnd = w.end + releaseFrames;
    if (frame < rampDownStart || frame > rampUpEnd) continue;

    let amt = 1;
    if (frame < w.start) {
      amt = interpolate(frame, [rampDownStart, w.start], [0, 1], {
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    } else if (frame > w.end) {
      amt = interpolate(frame, [w.end, rampUpEnd], [1, 0], {
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
    if (amt > duckAmount) duckAmount = amt;
  }

  return interpolate(duckAmount, [0, 1], [highVolume, lowVolume]);
}

/**
 * Master Voiceover Track (<MasterAudioTrack>):
 * Plays the continuous master voiceover track (`voiceover.mp3`) seamlessly across the entire video.
 * Supports automated smooth attack/release audio ducking for background music!
 */
export const MasterAudioTrack: React.FC<{
  voiceVolume?: number;
  bgmSrc?: string;
  bgmVolume?: number;
  enableDucking?: boolean;
}> = ({
  voiceVolume = 1.0,
  bgmSrc,
  bgmVolume = 0.2,
  enableDucking = true,
}) => {
  const frame = useCurrentFrame();

  // Smooth studio ducking envelope: lower during speech, swell gently on true pauses
  const dynamicBgmVol = enableDucking
    ? getSmoothDuckingVolume(frame, {
        lowVolume: bgmVolume * 0.45,
        highVolume: Math.min(0.4, bgmVolume * 1.15),
        attackFrames: 14,
        releaseFrames: 22,
      })
    : bgmVolume;

  return (
    <>
      {/* 1. Continuous Master Voiceover */}
      <Audio src={staticFile('voiceover.mp3')} volume={voiceVolume} />

      {/* 2. Optional Background Music with smooth automated ducking */}
      {bgmSrc && (
        <Audio src={bgmSrc} volume={dynamicBgmVol} loop />
      )}
    </>
  );
};

/**
 * Automatically plays all synthesized voiceover segments (`voiceover.mp3` or fallback `voice-0.mp3`, `voice-1.mp3`, ...)
 * at their exact global start frames (100% pure crystal-clear voiceover, no synthetic BGM).
 */
export const ContinuousAudioTrack: React.FC<{ bgmVolume?: number; voiceVolume?: number }> = ({
  voiceVolume = 1.0,
}) => {
  const scenes = audioTelemetry?.scenes || [];
  return (
    <>
      <Audio src={staticFile('voiceover.mp3')} volume={voiceVolume} />
    </>
  );
};

export interface SafeZoneInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
  captionBottomOffset: number;
  isPortrait: boolean;
  isSquare: boolean;
}

/**
 * Aspect-aware UI safe-zone insets (full-bleed media stays edge-to-edge while foreground text/HUDs stay unobstructed).
 * For 9:16 portrait (TikTok/Shorts/Reels), automatically protects top nav (~13%), right action rail (~14%), and bottom caption/bar (~22%).
 */
export function getSafeZoneInsets(width: number, height: number): SafeZoneInsets {
  const safeW = Math.max(320, width || 1920);
  const safeH = Math.max(320, height || 1080);
  const isPortrait = safeH > safeW * 1.1;
  const isSquare = !isPortrait && Math.abs(safeW - safeH) <= safeW * 0.12;

  if (isPortrait) {
    return {
      top: Math.round(safeH * 0.13),
      right: Math.round(safeW * 0.14),
      bottom: Math.round(safeH * 0.22),
      left: Math.round(safeW * 0.06),
      captionBottomOffset: Math.round(safeH * 0.215),
      isPortrait: true,
      isSquare: false,
    };
  }
  if (isSquare) {
    return {
      top: Math.round(safeH * 0.08),
      right: Math.round(safeW * 0.08),
      bottom: Math.round(safeH * 0.11),
      left: Math.round(safeW * 0.08),
      captionBottomOffset: Math.round(safeH * 0.1),
      isPortrait: false,
      isSquare: true,
    };
  }
  return {
    top: Math.round(safeH * 0.06),
    right: Math.round(safeW * 0.05),
    bottom: 64,
    left: Math.round(safeW * 0.05),
    captionBottomOffset: 64,
    isPortrait: false,
    isSquare: false,
  };
}

export interface ProKaraokeCaptionsProps {
  stylePreset?: 'hormozi' | 'glow' | 'minimal' | 'cyber';
  highlightColor?: string;
  activeBgColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  bottomOffset?: number;
  wordsPerPage?: number;
  style?: React.CSSProperties;
}

/**
 * 👑 PRO KARAOKE HIGHLIGHT CAPTIONS (Alex Hormozi / TikTok / MrBeast Studio Quality):
 * Reads 100% real Sentence/Word telemetry timestamps across the master audio stream.
 * Splits caption cards strictly at sentence/pause boundaries so text never bleeds across pauses!
 */
export const ProKaraokeCaptions: React.FC<ProKaraokeCaptionsProps> = ({
  stylePreset = 'minimal',
  highlightColor = '#facc15',
  activeBgColor = 'rgba(250, 204, 21, 0.2)',
  textColor = '#ffffff',
  fontFamily = 'BeVietnamPro, "Noto Sans", system-ui, sans-serif',
  fontSize = 42,
  bottomOffset,
  wordsPerPage = 5,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const safeZone = getSafeZoneInsets(width, height);
  const resolvedBottom = bottomOffset ?? safeZone.captionBottomOffset;

  const allWords = useMemo(() => {
    return (audioTelemetry?.allWords || []) as WordToken[];
  }, []);

  if (allWords.length === 0) return null;

  // Group words into natural spoken phrases: respect sentence/clause boundaries and avoid 1-word orphans
  const pages = useMemo(() => {
    const rawPages: Array<{
      words: WordToken[];
      endedWithSentence: boolean;
    }> = [];

    let buffer: WordToken[] = [];
    const flushRaw = (endedWithSentence: boolean) => {
      if (buffer.length === 0) return;
      rawPages.push({ words: buffer, endedWithSentence });
      buffer = [];
    };

    const softBreakThreshold = Math.max(2, Math.floor(wordsPerPage * 0.6));

    for (let i = 0; i < allWords.length; i++) {
      const w = allWords[i];
      const prev = buffer[buffer.length - 1];
      if (prev) {
        const prevEnd = prev.globalEndFrame ?? prev.endFrame;
        const currStart = w.globalStartFrame ?? w.startFrame;
        const pauseGap = currStart - prevEnd;
        const crossedSentence =
          typeof w.sentenceIndex === 'number' &&
          typeof prev.sentenceIndex === 'number' &&
          w.sentenceIndex !== prev.sentenceIndex;
        const endedSentence = /[.?!…]$/.test(prev.word);
        const endedClause = /[,;—–:]$/.test(prev.word) && buffer.length >= softBreakThreshold;

        if (buffer.length >= wordsPerPage || crossedSentence || endedSentence || endedClause || pauseGap > 8) {
          flushRaw(crossedSentence || endedSentence || pauseGap > 8);
        }
      }
      buffer.push(w);
    }
    flushRaw(true);

    // Anti-orphan balancing: prevent a 1-word orphan card at the end of a phrase when preceded by >= 3 words
    for (let i = 1; i < rawPages.length; i++) {
      const curr = rawPages[i];
      const prev = rawPages[i - 1];
      if (curr.words.length === 1 && !prev.endedWithSentence && prev.words.length >= 3) {
        const moved = prev.words.pop();
        if (moved) curr.words.unshift(moved);
      }
    }

    return rawPages.map((p, pageIndex) => {
      const startFrame = p.words[0].globalStartFrame ?? p.words[0].startFrame;
      const endFrame = p.words[p.words.length - 1].globalEndFrame ?? p.words[p.words.length - 1].endFrame;
      return {
        pageIndex,
        startFrame,
        endFrame: Math.max(endFrame, startFrame + 10),
        words: p.words,
      };
    });
  }, [allWords, wordsPerPage]);

  const activePage = pages.find((p, idx) => {
    const nextP = pages[idx + 1];
    const pageTail = nextP ? Math.min(nextP.startFrame, p.endFrame + 8) : p.endFrame + 12;
    return frame >= p.startFrame && frame < pageTail;
  });

  if (!activePage) return null;

  // Page entrance spring bounce
  const pageEnterSpring = spring({
    frame: Math.max(0, frame - activePage.startFrame),
    fps,
    config: { damping: 13, stiffness: 220, mass: 0.5 },
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: safeZone.left,
        right: safeZone.right,
        bottom: resolvedBottom,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 150,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px 14px',
          maxWidth: 1200,
          padding: stylePreset === 'minimal' ? '8px 18px' : '16px 32px',
          borderRadius: stylePreset === 'minimal' ? 0 : 24,
          backgroundColor:
            stylePreset === 'minimal'
              ? 'transparent'
              : stylePreset === 'cyber'
              ? 'rgba(6, 11, 25, 0.85)'
              : 'rgba(0, 0, 0, 0.75)',
          backdropFilter: stylePreset === 'minimal' ? 'none' : 'blur(12px)',
          border:
            stylePreset === 'cyber'
              ? '1px solid rgba(0, 242, 254, 0.35)'
              : stylePreset === 'hormozi'
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : 'none',
          boxShadow:
            stylePreset === 'minimal'
              ? 'none'
              : stylePreset === 'cyber'
              ? '0 0 35px rgba(0, 242, 254, 0.25)'
              : '0 16px 45px rgba(0,0,0,0.6)',
          transform: `scale(${interpolate(pageEnterSpring, [0, 1], [0.92, 1])}) translateY(${interpolate(
            pageEnterSpring,
            [0, 1],
            [12, 0]
          )}px)`,
        }}
      >
        {activePage.words.map((w, idx) => {
          const wStart = w.globalStartFrame ?? w.startFrame;
          const wEnd = w.globalEndFrame ?? w.endFrame;
          const isActive = frame >= wStart && frame <= wEnd;
          const isPast = frame > wEnd;

          // Word pop spring animation
          const wordPop = spring({
            frame: Math.max(0, frame - wStart),
            fps,
            config: { damping: 12, stiffness: 280, mass: 0.4 },
          });

          const activeScale = isActive ? interpolate(wordPop, [0, 1], [1.0, 1.15]) : 1.0;
          const activeY = isActive ? -3 : 0;

          const chosenHighlight =
            stylePreset === 'hormozi'
              ? idx % 2 === 0
                ? '#facc15'
                : '#38bdf8'
              : stylePreset === 'cyber'
              ? '#00f2fe'
              : highlightColor;

          return (
            <span
              key={`${wStart}-${idx}`}
              style={{
                display: 'inline-block',
                fontFamily,
                fontSize,
                fontWeight: 800,
                letterSpacing: 0.4,
                textTransform: stylePreset === 'minimal' ? 'none' : 'uppercase',
                color: isActive ? chosenHighlight : isPast ? textColor : 'rgba(255, 255, 255, 0.72)',
                backgroundColor: stylePreset === 'minimal' ? 'transparent' : isActive ? activeBgColor : 'transparent',
                padding: stylePreset === 'minimal' ? '2px 4px' : '4px 10px',
                borderRadius: stylePreset === 'minimal' ? 0 : 12,
                transform: `scale(${activeScale}) translateY(${activeY}px)`,
                textShadow:
                  stylePreset === 'minimal'
                    ? isActive
                      ? `0 0 18px ${chosenHighlight}88, 0 4px 14px rgba(0,0,0,0.98), 0 1px 4px rgba(0,0,0,1)`
                      : '0 4px 14px rgba(0,0,0,0.98), 0 1px 4px rgba(0,0,0,1)'
                    : isActive
                    ? `0 0 25px ${chosenHighlight}aa, 0 3px 12px rgba(0,0,0,0.9)`
                    : '0 3px 8px rgba(0,0,0,0.8)',
                WebkitTextStroke:
                  stylePreset === 'minimal'
                    ? '1.2px rgba(0,0,0,0.78)'
                    : isActive
                    ? '1.5px rgba(0,0,0,0.6)'
                    : 'none',
                transition: 'color 0.1s ease',
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
export interface WordHighlightCaptionsProps {
  sceneIndex?: number;
  highlightColor?: string;
  activeBgColor?: string;
  textColor?: string;
  fontSize?: number;
  bottomOffset?: number;
  combineTokensWithinMilliseconds?: number;
  style?: React.CSSProperties;
}

/**
 * If `sceneIndex` is omitted, it automatically tracks the active narration segment across the global timeline!
 */
export const WordHighlightCaptions: React.FC<WordHighlightCaptionsProps> = ({
  sceneIndex,
  highlightColor = '#facc15',
  activeBgColor = 'rgba(56, 189, 248, 0.22)',
  textColor = '#f8fafc',
  fontSize = 38,
  bottomOffset,
  combineTokensWithinMilliseconds = 1400,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const safeZone = getSafeZoneInsets(width, height);
  const resolvedBottom = bottomOffset ?? safeZone.captionBottomOffset;

  const resolved = useMemo(() => {
    const scenes = audioTelemetry?.scenes || [];
    if (typeof sceneIndex === 'number') {
      return {
        targetSceneIndex: sceneIndex,
        localFrame: frame,
      };
    }
    const activeScene = scenes.find(
      (s) => frame >= s.startFrame && frame < s.endFrame
    );
    if (!activeScene) {
      return { targetSceneIndex: -1, localFrame: 0 };
    }
    return {
      targetSceneIndex: activeScene.sceneIndex,
      localFrame: frame - activeScene.startFrame,
    };
  }, [sceneIndex, frame]);

  const currentTimeMs = (resolved.localFrame / fps) * 1000;
  const captions = useMemo(
    () =>
      resolved.targetSceneIndex >= 0
        ? getSceneCaptions(resolved.targetSceneIndex)
        : [],
    [resolved.targetSceneIndex]
  );

  const pages = useMemo(
    () => buildWordHighlightPages(captions, combineTokensWithinMilliseconds),
    [captions, combineTokensWithinMilliseconds]
  );

  if (pages.length === 0) return null;

  const activePage = pages.find((p: TikTokPage, idx: number) => {
    const nextPage = pages[idx + 1];
    const pageEndMs = nextPage ? nextPage.startMs : p.startMs + p.durationMs + 350;
    return currentTimeMs >= p.startMs && currentTimeMs < pageEndMs;
  });

  if (!activePage) return null;

  const pageEnterFrame = (activePage.startMs / 1000) * fps;
  const pagePop = spring({
    frame: Math.max(0, resolved.localFrame - pageEnterFrame),
    fps,
    config: { damping: 14, stiffness: 180, mass: 0.6 },
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: safeZone.left,
        right: safeZone.right,
        bottom: resolvedBottom,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 100,
        ...style,
      }}
    >
      <div
        style={{
          background: 'rgba(9, 13, 22, 0.78)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 20,
          padding: '14px 28px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
          transform: `translateY(${interpolate(pagePop, [0, 1], [10, 0])}px) scale(${interpolate(
            pagePop,
            [0, 1],
            [0.96, 1]
          )})`,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px 10px',
          maxWidth: 1320,
        }}
      >
        {activePage.tokens.map((token: TikTokToken, idx: number) => {
          const isActive = currentTimeMs >= token.fromMs && currentTimeMs <= token.toMs;
          const isPast = currentTimeMs > token.toMs;

          return (
            <span
              key={`${token.fromMs}-${idx}`}
              style={{
                display: 'inline-block',
                fontSize,
                fontWeight: isActive ? 800 : 600,
                color: isActive
                  ? highlightColor
                  : isPast
                  ? textColor
                  : 'rgba(248, 250, 252, 0.55)',
                background: isActive ? activeBgColor : 'transparent',
                padding: isActive ? '2px 10px' : '2px 4px',
                borderRadius: 10,
                transform: isActive ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
                textShadow: isActive
                  ? `0 0 22px ${highlightColor}88, 0 2px 10px rgba(0,0,0,0.8)`
                  : '0 2px 8px rgba(0,0,0,0.65)',
              }}
            >
              {token.text.trim()}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// OPTIONAL HIGH-CRAFT CINEMA PRIMITIVES (V7.6)
// Style-agnostic, deterministic building blocks available to import from ./audio-sync
// ============================================================================

export interface SceneMilestone {
  sceneIndex: number;
  value: number;
}

/**
 * Interpolate a numeric metric (depth, year, price, score, temperature) across scenes so it
 * ramps smoothly at scene entry and dwells near each scene's milestone while that scene is spoken
 * (never drifting far ahead of the narration).
 */
export function interpolateSceneMilestones(
  globalFrame: number,
  milestones: SceneMilestone[],
  transitionFrames = 18
): number {
  if (!Array.isArray(milestones) || milestones.length === 0) return 0;
  if (milestones.length === 1) return milestones[0].value;

  const sorted = [...milestones].sort((a, b) => a.sceneIndex - b.sceneIndex);
  const inputRange: number[] = [];
  const outputRange: number[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const timing = getSceneTiming(m.sceneIndex);
    const startF = Math.max(0, timing.startFrame);
    const endF = Math.max(startF + 6, timing.endFrame);
    const ramp = Math.min(Math.max(4, transitionFrames), Math.max(4, Math.floor((endF - startF) * 0.35)));
    const settleF = startF + ramp;

    if (i === 0) {
      inputRange.push(startF);
      outputRange.push(m.value);
      if (endF - 2 > startF) {
        inputRange.push(endF - 2);
        outputRange.push(m.value);
      }
      continue;
    }

    const prevEnd = inputRange[inputRange.length - 1];
    const safeSettle = Math.max(prevEnd + 1, settleF);
    inputRange.push(safeSettle);
    outputRange.push(m.value);

    const safeDwellEnd = Math.max(safeSettle + 1, endF - 2);
    if (i < sorted.length - 1 && safeDwellEnd > safeSettle) {
      inputRange.push(safeDwellEnd);
      outputRange.push(m.value);
    }
  }

  return interpolate(globalFrame, inputRange, outputRange, {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export interface KenBurnsMediaProps {
  src: string;
  zoomFrom?: number;
  zoomTo?: number;
  panX?: number;
  panY?: number;
  opacity?: number;
  filter?: string;
  scrimGradient?: string;
  style?: React.CSSProperties;
}

/**
 * Full-bleed photographic layer with smooth deterministic Ken Burns motion and optional readability scrim.
 */
export const KenBurnsMedia: React.FC<KenBurnsMediaProps> = ({
  src,
  zoomFrom = 1.04,
  zoomTo = 1.15,
  panX = -18,
  panY = -10,
  opacity = 1,
  filter = 'contrast(1.06) saturate(1.08)',
  scrimGradient = 'linear-gradient(90deg, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.45) 55%, rgba(2,6,23,0.68) 100%)',
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const dur = Math.max(2, durationInFrames);

  const scale = interpolate(frame, [0, dur], [zoomFrom, zoomTo], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tx = interpolate(frame, [0, dur], [0, panX], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ty = interpolate(frame, [0, dur], [0, panY], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ overflow: 'hidden', opacity, pointerEvents: 'none', ...style }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter,
          transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
        }}
      />
      {scrimGradient ? <AbsoluteFill style={{ background: scrimGradient }} /> : null}
    </AbsoluteFill>
  );
};

export interface AtmosphericParticlesProps {
  count?: number;
  color?: string;
  secondaryColor?: string;
  direction?: 'up' | 'down' | 'drift';
  speed?: number;
  minSize?: number;
  maxSize?: number;
  opacity?: number;
  glow?: boolean;
  seedPrefix?: string;
  style?: React.CSSProperties;
}

/**
 * Deterministic seeded floating particle field (dust motes, underwater plankton, cosmos sparks).
 */
export const AtmosphericParticles: React.FC<AtmosphericParticlesProps> = ({
  count = 36,
  color = '#38bdf8',
  secondaryColor = '#e2e8f0',
  direction = 'up',
  speed = 0.25,
  minSize = 2,
  maxSize = 6,
  opacity = 0.55,
  glow = true,
  seedPrefix = 'atmo',
  style,
}) => {
  const frame = useCurrentFrame();
  const particles = useMemo(
    () =>
      Array.from({ length: Math.max(1, Math.min(120, count)) }, (_, i) => ({
        id: i,
        x: random(`${seedPrefix}-x-${i}`) * 100,
        y: random(`${seedPrefix}-y-${i}`) * 100,
        size: minSize + random(`${seedPrefix}-s-${i}`) * Math.max(0.5, maxSize - minSize),
        speedMul: 0.5 + random(`${seedPrefix}-v-${i}`) * 0.9,
        phase: random(`${seedPrefix}-p-${i}`) * Math.PI * 2,
        hue: random(`${seedPrefix}-c-${i}`) > 0.5 ? color : secondaryColor,
      })),
    [count, color, secondaryColor, minSize, maxSize, seedPrefix]
  );

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none', ...style }}>
      {particles.map((p) => {
        const delta = frame * speed * p.speedMul;
        const rawY =
          direction === 'up'
            ? (p.y - delta) % 100
            : direction === 'down'
            ? (p.y + delta) % 100
            : p.y + Math.sin(frame / 45 + p.phase) * 3;
        const yPct = rawY < 0 ? rawY + 100 : rawY;
        const xWobble = Math.sin(frame / 30 + p.phase) * 1.4;
        const pulse = 0.55 + 0.45 * Math.sin(frame / 22 + p.phase);

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x + xWobble}%`,
              top: `${yPct}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: p.hue,
              opacity: opacity * pulse,
              boxShadow: glow ? `0 0 ${p.size * 3}px ${p.hue}` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export interface CinematicLightSweepProps {
  color?: string;
  opacity?: number;
  angle?: number;
  cycleFrames?: number;
  style?: React.CSSProperties;
}

/**
 * Bounded atmospheric light beam / volumetric sweep that runs seamlessly across any timeline length.
 */
export const CinematicLightSweep: React.FC<CinematicLightSweepProps> = ({
  color = 'rgba(56, 189, 248, 0.22)',
  opacity = 0.75,
  angle = -18,
  cycleFrames = 240,
  style,
}) => {
  const frame = useCurrentFrame();
  const safeCycle = Math.max(30, cycleFrames);
  const t = (frame % safeCycle) / safeCycle;
  const xPct = interpolate(t, [0, 1], [-35, 115]);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none', opacity, ...style }}>
      <div
        style={{
          position: 'absolute',
          top: '-25%',
          bottom: '-25%',
          left: `${xPct}%`,
          width: '28%',
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          transform: `rotate(${angle}deg)`,
          filter: 'blur(28px)',
        }}
      />
    </AbsoluteFill>
  );
};

// ============================================================================
// V8 STUDIO CINEMA KIT (Motion Physics, Parallax, Auto-Fit Type & Film Finish)
// ============================================================================

export interface StaggerRevealProps {
  index?: number;
  staggerFrames?: number;
  baseDelayFrames?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  distance?: number;
  overshoot?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Motion-physics staggered entrance implementing Delay Stagger, Anticipation, and Overshoot spring.
 */
export const StaggerReveal: React.FC<StaggerRevealProps> = ({
  index = 0,
  staggerFrames = 5,
  baseDelayFrames = 0,
  direction = 'up',
  distance = 28,
  overshoot = true,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = Math.max(0, baseDelayFrames + index * staggerFrames);
  const localF = Math.max(0, frame - delay);

  const prog = spring({
    frame: localF,
    fps,
    config: overshoot
      ? { damping: 12, stiffness: 145, mass: 0.7 }
      : { damping: 20, stiffness: 110, mass: 0.9 },
  });

  const opacity = interpolate(localF, [0, 7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  let transform = '';
  if (direction === 'up') {
    transform = `translateY(${(1 - prog) * distance}px)`;
  } else if (direction === 'down') {
    transform = `translateY(${(1 - prog) * -distance}px)`;
  } else if (direction === 'left') {
    transform = `translateX(${(1 - prog) * distance}px)`;
  } else if (direction === 'right') {
    transform = `translateX(${(1 - prog) * -distance}px)`;
  } else {
    transform = `scale(${0.86 + prog * 0.14})`;
  }

  return (
    <div style={{ opacity, transform, ...style }}>
      {children}
    </div>
  );
};

export interface CameraRigProps {
  zoomFrom?: number;
  zoomTo?: number;
  panX?: number;
  panY?: number;
  rotateDeg?: number;
  handheldStrength?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Inertial scene camera rig adding smooth push-in/pull-out + subtle organic micro-handheld breathing.
 */
export const CameraRig: React.FC<CameraRigProps> = ({
  zoomFrom = 1.0,
  zoomTo = 1.06,
  panX = 0,
  panY = 0,
  rotateDeg = 0,
  handheldStrength = 0.35,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const dur = Math.max(2, durationInFrames);

  const easeProg = interpolate(frame, [0, dur], [0, 1], {
    easing: Easing.bezier(0.22, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(easeProg, [0, 1], [zoomFrom, zoomTo]);
  const baseX = interpolate(easeProg, [0, 1], [0, panX]);
  const baseY = interpolate(easeProg, [0, 1], [0, panY]);
  const baseRot = interpolate(easeProg, [0, 1], [0, rotateDeg]);

  const microX = handheldStrength * 6 * Math.sin(frame / 41);
  const microY = handheldStrength * 4 * Math.cos(frame / 33);
  const microRot = handheldStrength * 0.25 * Math.sin(frame / 53);

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${baseX + microX}px, ${baseY + microY}px) scale(${scale}) rotate(${baseRot + microRot}deg)`,
        transformOrigin: 'center center',
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export interface ParallaxDepthLayersProps {
  background?: React.ReactNode;
  midground?: React.ReactNode;
  foreground?: React.ReactNode;
  driftX?: number;
  driftY?: number;
  style?: React.CSSProperties;
}

/**
 * 3-plane Z-depth spatial container (0.25x background, 1.0x midground, 1.65x foreground parallax).
 */
export const ParallaxDepthLayers: React.FC<ParallaxDepthLayersProps> = ({
  background,
  midground,
  foreground,
  driftX = 28,
  driftY = 12,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const dur = Math.max(2, durationInFrames);

  const p = interpolate(frame, [0, dur], [-0.5, 0.5], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
      {background ? (
        <AbsoluteFill style={{ transform: `translate(${p * driftX * 0.25}px, ${p * driftY * 0.25}px) scale(1.04)` }}>
          {background}
        </AbsoluteFill>
      ) : null}
      {midground ? (
        <AbsoluteFill style={{ transform: `translate(${p * driftX}px, ${p * driftY}px)` }}>
          {midground}
        </AbsoluteFill>
      ) : null}
      {foreground ? (
        <AbsoluteFill style={{ pointerEvents: 'none', transform: `translate(${p * driftX * 1.65}px, ${p * driftY * 1.65}px)` }}>
          {foreground}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

export interface AutoFitTitleProps {
  text: string;
  maxWidth?: number;
  maxLines?: number;
  maxFontSize?: number;
  minFontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  lineHeight?: number;
  color?: string;
  letterSpacing?: string;
  style?: React.CSSProperties;
}

/**
 * Automatically sizes and breaks multi-line headlines using @remotion/layout-utils so titles never overflow.
 * When maxWidth is omitted, automatically fits within the current aspect ratio's safe-zone width.
 */
export const AutoFitTitle: React.FC<AutoFitTitleProps> = ({
  text,
  maxWidth,
  maxLines = 2,
  maxFontSize = 84,
  minFontSize = 32,
  fontFamily = 'BeVietnamPro, sans-serif',
  fontWeight = 900,
  lineHeight = 1.16,
  color = '#ffffff',
  letterSpacing = '-0.02em',
  style,
}) => {
  const { width, height } = useVideoConfig();
  const safeInsets = getSafeZoneInsets(width, height);
  const resolvedMaxWidth =
    typeof maxWidth === 'number' && Number.isFinite(maxWidth) && maxWidth > 0
      ? maxWidth
      : Math.max(240, width - safeInsets.left - safeInsets.right);

  const fitted = useMemo(() => {
    try {
      const res = fitTextOnNLines({
        text: String(text || ''),
        maxLines,
        maxBoxWidth: Math.max(200, resolvedMaxWidth),
        fontFamily,
        fontWeight,
        letterSpacing,
        maxFontSize,
        validateFontIsLoaded: false,
      });
      const safeFontSize = Number.isFinite(res.fontSize) ? res.fontSize : maxFontSize;
      const safeLines = Array.isArray(res.lines) && res.lines.length > 0 ? res.lines : [String(text || '')];
      return {
        fontSize: Math.max(minFontSize, Math.min(maxFontSize, safeFontSize)),
        lines: safeLines,
      };
    } catch {
      return { fontSize: maxFontSize, lines: [String(text || '')] };
    }
  }, [text, maxLines, resolvedMaxWidth, fontFamily, fontWeight, letterSpacing, maxFontSize, minFontSize]);

  return (
    <div
      style={{
        fontFamily,
        fontSize: fitted.fontSize,
        fontWeight,
        lineHeight,
        color,
        letterSpacing,
        maxWidth: resolvedMaxWidth,
        ...style,
      }}
    >
      {fitted.lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
};

export interface CinematicFinishProps {
  vignette?: number;
  grainOpacity?: number;
  colorMood?: 'clean' | 'cinema-teal' | 'warm-film' | 'noir';
  style?: React.CSSProperties;
}

/**
 * Subtle studio optical finishing layer: lightweight vignette + bitrate-safe anti-banding grain + optional mood tint.
 */
export const CinematicFinish: React.FC<CinematicFinishProps> = ({
  vignette = 0.34,
  grainOpacity = 0.032,
  colorMood = 'clean',
  style,
}) => {
  const moodGradient =
    colorMood === 'cinema-teal'
      ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(251, 146, 60, 0.05) 100%)'
      : colorMood === 'warm-film'
      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(120, 53, 15, 0.06) 100%)'
      : colorMood === 'noir'
      ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.14) 0%, rgba(2, 6, 23, 0.22) 100%)'
      : null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 120, ...style }}>
      {moodGradient ? <AbsoluteFill style={{ background: moodGradient, mixBlendMode: 'soft-light' }} /> : null}
      {vignette > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 54%, rgba(0,0,0,${Math.min(0.75, vignette)}) 100%)`,
          }}
        />
      ) : null}
      {grainOpacity > 0 ? (
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0, opacity: Math.min(0.12, grainOpacity), mixBlendMode: 'overlay' }}
        >
          <filter id="v8StudioGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#v8StudioGrain)" />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

export interface SafeAreaLayerProps {
  children: React.ReactNode;
  showGuide?: boolean;
  extraPadding?: number;
  style?: React.CSSProperties;
}

/**
 * Foreground Safe-Zone wrapper: automatically adjusts padding from useVideoConfig() for 16:9, 9:16 (TikTok/Shorts/Reels), or 1:1
 * while keeping background <Img>, <OffthreadVideo>, and <ThreeCanvas> full-bleed underneath.
 */
export const SafeAreaLayer: React.FC<SafeAreaLayerProps> = ({
  children,
  showGuide = false,
  extraPadding = 0,
  style,
}) => {
  const { width, height } = useVideoConfig();
  const insets = getSafeZoneInsets(width, height);
  const top = insets.top + extraPadding;
  const right = insets.right + extraPadding;
  const bottom = insets.bottom + extraPadding;
  const left = insets.left + extraPadding;

  return (
    <AbsoluteFill
      style={{
        paddingTop: top,
        paddingRight: right,
        paddingBottom: bottom,
        paddingLeft: left,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
      {showGuide ? (
        <div
          style={{
            position: 'absolute',
            top,
            right,
            bottom,
            left,
            border: '2px dashed rgba(56, 189, 248, 0.55)',
            borderRadius: 12,
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

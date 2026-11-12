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
  staticFile,
} from 'remotion';
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
export interface SyncedSceneProps {
  sceneIndex: number;
  fallbackStartFrame?: number;
  fallbackDurationInFrames?: number;
  enterFrames?: number;
  exitFrames?: number;
   overlapFrames?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const SyncedSceneInner: React.FC<{
  durationInFrames: number;
  enterFrames: number;
  exitFrames: number;
  isFirst: boolean;
  isLast: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ durationInFrames, enterFrames, exitFrames, isFirst, isLast, style, children }) => {
  const frame = useCurrentFrame();

  const inFrames = isFirst ? Math.min(12, enterFrames) : enterFrames;
  const outFrames = isLast ? Math.min(15, exitFrames) : exitFrames;
  const exitStart = Math.max(inFrames + 5, durationInFrames - outFrames);

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

  const opacity = enterProgress * (1 - exitProgress);
  const scale =
    interpolate(enterProgress, [0, 1], [0.975, 1]) *
    interpolate(exitProgress, [0, 1], [1, 1.02]);
  const translateY =
    interpolate(enterProgress, [0, 1], [14, 0]) +
    interpolate(exitProgress, [0, 1], [0, -10]);

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`,
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
  enterFrames = 14,
  exitFrames = 14,
  overlapFrames = 6,
  children,
  style,
}) => {
  const totalScenes = audioTelemetry?.scenes?.length || 1;
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex >= totalScenes - 1;

  const baseStart = getSegmentStartFrame(sceneIndex, fallbackStartFrame);
  const baseDur = getSceneFrames(sceneIndex, fallbackDurationInFrames);

  // Subtle overlap into the natural breath tail of the previous scene without shifting spoken word localFrames
  const actualStart = isFirst ? baseStart : Math.max(0, baseStart - overlapFrames);
  const actualDur = isFirst ? baseDur : baseDur + overlapFrames;

  return (
    <Sequence from={actualStart} durationInFrames={actualDur}>
      <SyncedSceneInner
        durationInFrames={actualDur}
        enterFrames={enterFrames}
        exitFrames={exitFrames}
        isFirst={isFirst}
        isLast={isLast}
        style={style}
      >
        {children}
      </SyncedSceneInner>
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

/**
 * Master Voiceover Track (<MasterAudioTrack>):
 * Plays the continuous master voiceover track (`voiceover.mp3` or legacy segment fallbacks)
 * seamlessly across the entire video.
 * Supports automated audio ducking for background music!
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
  const scenes = audioTelemetry?.scenes || [];

  // Determine if voice is currently speaking at this frame
  const isSpeaking = useMemo(() => {
    return scenes.some((s) => frame >= s.startFrame && frame < s.endFrame);
  }, [scenes, frame]);

  // Dynamic ducking volume: lower when speaking, swell up when paused
  const dynamicBgmVol = enableDucking
    ? isSpeaking
      ? bgmVolume * 0.4
      : bgmVolume * 1.2
    : bgmVolume;

  return (
    <>
      {/* 1. Continuous Master Voiceover */}
      <Audio src={staticFile('voiceover.mp3')} volume={voiceVolume} />

      {/* 2. Optional Background Music with automated ducking */}
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
 * Automatic Word-by-Word Karaoke Highlight Captions powered by Edge-TTS WordBoundary.
 * If `sceneIndex` is omitted, it automatically tracks the active narration segment across the global timeline!
 */
export const WordHighlightCaptions: React.FC<WordHighlightCaptionsProps> = ({
  sceneIndex,
  highlightColor = '#facc15',
  activeBgColor = 'rgba(56, 189, 248, 0.22)',
  textColor = '#f8fafc',
  fontSize = 38,
  bottomOffset = 58,
  combineTokensWithinMilliseconds = 1400,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
        left: '6%',
        right: '6%',
        bottom: bottomOffset,
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

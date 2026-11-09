import React, { useMemo } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
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
export function getSceneFrames(sceneIndex: number, fallbackFrames = 150): number {
  const val = audioTelemetry?.sceneFrames?.[sceneIndex];
  return typeof val === 'number' && val > 0 ? val : fallbackFrames;
}

/**
 * Get the exact global start frame of segment `sceneIndex` on the master timeline.
 * Ideal for building a seamless, continuous 1-take camera flow without hard scene cuts!
 */
export function getSegmentStartFrame(sceneIndex: number, fallbackStartFrame = 0): number {
  const scene = audioTelemetry?.scenes?.[sceneIndex];
  if (scene && typeof scene.startFrame === 'number') return scene.startFrame;
  return fallbackStartFrame;
}

/**
 * Find the exact local frame within `sceneIndex` when the narrator speaks `keywordOrPhrase`.
 */
export function getWordFrame(
  sceneIndex: number,
  keywordOrPhrase: string,
  fallbackFrame = 0
): number {
  const scene = audioTelemetry?.scenes?.[sceneIndex];
  if (!scene || !Array.isArray(scene.words) || scene.words.length === 0) {
    return fallbackFrame;
  }

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim();

  const target = normalize(keywordOrPhrase);
  if (!target) return fallbackFrame;

  const targetParts = target.split(/\s+/).filter(Boolean);
  const words = scene.words;

  if (targetParts.length > 1) {
    for (let i = 0; i <= words.length - targetParts.length; i++) {
      let matched = true;
      for (let j = 0; j < targetParts.length; j++) {
        if (!normalize(words[i + j].word).includes(targetParts[j])) {
          matched = false;
          break;
        }
      }
      if (matched) return words[i].startFrame;
    }
  }

  const firstTarget = targetParts[0];
  const found = words.find((w) => normalize(w.word).includes(firstTarget));
  return found ? found.startFrame : fallbackFrame;
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
 * Returns normalized 0 -> 1 progress during the time window between `startKeyword` and `endKeyword` in `sceneIndex`.
 */
export function getWordProgress(
  sceneIndex: number,
  startKeyword: string,
  endKeyword: string,
  currentLocalFrame: number,
  fallbackStartFrame = 0,
  fallbackEndFrame = 60
): number {
  const startF = getWordFrame(sceneIndex, startKeyword, fallbackStartFrame);
  const endF = Math.max(startF + 10, getWordFrame(sceneIndex, endKeyword, fallbackEndFrame));
  return interpolate(currentLocalFrame, [startF, endF], [0, 1], {
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
 * Automatically plays all synthesized voiceover segments (`voice-0.mp3`, `voice-1.mp3`, ...)
 * at their exact global start frames plus clean background music (`bgm.mp3`),
 * enabling a single continuous visual timeline without needing to split into `<Series>`!
 */
export const ContinuousAudioTrack: React.FC<{ bgmVolume?: number; voiceVolume?: number }> = ({
  voiceVolume = 1.0,
}) => {
  const scenes = audioTelemetry?.scenes || [];
  return (
    <>
      {scenes.map((s) => (
        <Sequence
          key={s.sceneIndex}
          from={s.startFrame}
          durationInFrames={s.durationInFrames}
        >
          <Audio src={staticFile(`voice-${s.sceneIndex}.mp3`)} volume={voiceVolume} />
        </Sequence>
      ))}
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

  // Resolve active scene and local frame (works both inside a local <Sequence> or on the global timeline!)
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

export interface ValidationContext {
  durationInFrames?: number;
  fps?: number;
  width?: number;
  height?: number;
  audioConfig?: {
    voice?: string;
    rate?: string;
    bgm?: string;
    scenes?: Array<{ text?: string; voice?: string } | string>;
  };
  expectedMinFrames?: number;
}

export const VISION_FRAME_CRITERIA = [
  '1. Safe-Zone & Legibility: Verify all titles, captions, HUDs, and focal graphics sit cleanly inside safe margins with strong luminance contrast (scrim/backdrop over busy media) and crisp diacritics.',
  '2. Spoken-vs-Shown Semantic Sync: Compare each frame against the narration spoken at that timestamp — verify live counters, gauges, labels, and visual metaphors match the active scene context rather than running ahead of speech.',
  '3. Cross-Scene Visual Parity & Depth: Compare the weakest frame in the Contact Sheet against the strongest frame — verify every scene maintains balanced depth (media, 3D, lighting, particles, or intentional craft) with no half-rich / half-flat dropoff.',
  '4. Focal Hierarchy & Kinetic Evolution: Verify each beat leads the eye to one unmistakable Focal Point and evolves visually across scenes.',
  '5. Polish Gate: If ANY frame falls below bar on Semantic Sync, Visual Parity, or Legibility, apply 1 targeted refinement pass + preview_frames before dispatching full render_video.',
] as const;

export const DIRECTOR_EVALUATION_FRAMEWORK = `
## 🏆 QUALITY EVALUATION FRAMEWORK (STRICT GUARDRAILS, 100% CREATIVE FREEDOM)

Quality is evaluated across **3 non-restrictive tiers** — technical invariants are strictly enforced, while visual style, genre, color, and pacing remain **100% yours to invent**:

### Tier 1 — Technical Invariants (Must Pass, Style-Agnostic)
1. **Determinism & Contract**: Export \`DynamicVideo\`; never use \`Math.random()\` (use \`random("seed")\`).
2. **Safe-Zone Discipline**: Keep essential text/captions inside safe margins (\`6–8%\` on 16:9; \`12%\` top, \`18–22%\` bottom, \`12%\` right on 9:16 portrait).
3. **Zero Audio Clash**: Never mount both \`MasterAudioTrack\`/\`voiceover.mp3\` AND individual \`voice-X.mp3\` files simultaneously. Ensure \`durationInFrames\` covers the full speech timeline.

### Tier 2 — 5 Outcome-Based Quality Pillars (100 Points — Multiple Valid Ways to Excel)
1. **Technical & Render Integrity (20 pts)**: Clean frame timing, clamped/intentional interpolations, no clipped ends, proper aspect ratio framing.
2. **Storytelling & Retention Pacing (20 pts)**: Clear hook in the first 3–5s, purposeful narrative/emotional arc, and periodic visual variation (pattern interrupts suited to the genre — kinetic cuts, camera drift, 3D motion, or intentional stillness).
3. **Visual Craft & Legibility (25 pts)**: One unmistakable Focal Point per beat, instant text legibility/contrast, spatial depth (layers/lighting/parallax/3D or disciplined minimalism), and cohesive palette.
4. **Motion Physics & Continuity (15 pts)**: Weighted organic motion (\`spring\` / \`Easing.bezier\`) unless mechanical/retro is intentional; smooth visual or rhythmic continuity between scenes; visuals amplify meaning rather than decorating randomly.
5. **Audio Hierarchy & Sync (20 pts)**: Clear vocal/subject priority with BGM ducking (\`~0.12–0.22\` or dynamic \`volume={(f) => ...}\`) when speech is active, expressive SFX/silence contrast, and frame-accurate sync with telemetry.

### Tier 3 — Intent-Relative Self-Critique & Vision Loop
- **Declare Your Creative Intent First**: Silently choose your target mood, visual language (e.g., 2.5D documentary, 3D WebGL, bold kinetic typography, serene minimalism), and pacing before coding — judge your work against *that* intent, never against generic templates.
- **Inspect with \`preview_frame\`**: When checking still frames, verify the 4 Vision Criteria: (1) Safe-Zone & No Overlap, (2) 1-Second Legibility & Contrast, (3) Focal Hierarchy & Depth, (4) Palette & Mood Cohesion.
`;

/**
 * Strip JS/TS single-line and multi-line comments while preserving string/template literals
 * so static quality checks never false-positive on URLs (https://...) or commented examples.
 */
export function stripTsxComments(code: string): string {
  let out = '';
  let i = 0;
  const n = code.length;
  let quote: '"' | "'" | '`' | null = null;

  while (i < n) {
    const ch = code[i];
    const next = i + 1 < n ? code[i + 1] : '';

    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < n) {
        out += next;
        i += 2;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      i++;
      continue;
    }

    if (ch === '/' && next === '/') {
      i += 2;
      while (i < n && code[i] !== '\n') i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

/**
 * Validate TSX composition for hard technical invariants and gentle non-blocking creative advisories.
 * Returns messages prefixed with:
 * - `CRITICAL:` (hard failure that breaks rendering or produces severe audio/export bugs)
 * - `ADVISORY:` / `DIRECTOR_NOTE:` / `NOTE:` (non-blocking guidance leaving full creative freedom to Gemini)
 */
export function validateTsxComposition(tsxCode: string, ctx: ValidationContext = {}): string[] {
  const warnings: string[] = [];
  const activeCode = stripTsxComments(tsxCode || '');

  // --- Tier 1: Hard Technical Invariants ---
  if (!/export\s+(const|function)\s+DynamicVideo\b/.test(activeCode)) {
    warnings.push(
      'CRITICAL: Code must export `export const DynamicVideo: React.FC = () => { ... }` or `export function DynamicVideo()`.'
    );
  }

  const usesMasterTrack =
    /<\s*MasterAudioTrack\b/.test(activeCode) ||
    /staticFile\s*\(\s*['"]voiceover\.mp3['"]\s*\)/.test(activeCode);
  const usesSegmentedVoice = /staticFile\s*\(\s*[`'"]voice-/.test(activeCode);

  if (usesMasterTrack && usesSegmentedVoice) {
    warnings.push(
      'CRITICAL: Double Voiceover Clash detected — your TSX mounts BOTH Master Audio (`<MasterAudioTrack>` / `voiceover.mp3`) AND segmented `voice-*.mp3` files. Use ONLY ONE method to prevent doubled echoing speech.'
    );
  }

  // --- Tier 2: Non-Blocking Quality Advisories ---
  if (/Math\.random\s*\(/.test(activeCode)) {
    warnings.push(
      'NOTE: Detected `Math.random()`. Prefer `random("seed")` from "remotion" so parallel cloud rendering stays 100% deterministic.'
    );
  }

  if (!/useCurrentFrame\s*\(/.test(activeCode) && !/<\s*TransitionSeries\b/.test(activeCode)) {
    warnings.push(
      'DIRECTOR_NOTE: `useCurrentFrame()` was not detected. Ensure your composition uses frame-driven motion (`interpolate`, `spring`, or `TransitionSeries`) rather than static layouts.'
    );
  }

  const hasVoiceoverScenes = Array.isArray(ctx.audioConfig?.scenes) && ctx.audioConfig!.scenes.length > 0;

  if (
    hasVoiceoverScenes &&
    typeof ctx.durationInFrames === 'number' &&
    typeof ctx.expectedMinFrames === 'number' &&
    ctx.durationInFrames < ctx.expectedMinFrames - 10
  ) {
    warnings.push(
      `ADVISORY: \`durationInFrames\` (${ctx.durationInFrames}) is shorter than the estimated voiceover telemetry (${ctx.expectedMinFrames} frames). Consider increasing \`durationInFrames\` so the final sentence is not cut off.`
    );
  }

  if (hasVoiceoverScenes) {
    // Detect static high volume on background music <Audio> tags while exempting voiceovers and short SFX cues
    const sfxPattern = /\b(?:whoosh|whip|pageTurn|uiSwitch|mouseClick|ding|snapchatNotification|shutterModern|shutterOld|vineBoom|dramaticBoomer|recordScratch|windowsXpError|loadingLag|animeWow|yippee|bruh|triggered|sfx)\b/i;
    const audioTags = activeCode.match(/<Audio\b[^>]*>/g) || [];
    const loudStaticBgm = audioTags.some((tag) => {
      if (/voiceover\.mp3|voice-|MasterAudioTrack/.test(tag)) return false;
      if (sfxPattern.test(tag)) return false;
      const volMatch = tag.match(/\bvolume\s*=\s*\{\s*(0?\.\d+|1(?:\.0+)?)\s*\}/);
      if (!volMatch) return false;
      const vol = Number(volMatch[1]);
      return Number.isFinite(vol) && vol >= 0.35;
    });
    if (loudStaticBgm) {
      warnings.push(
        'ADVISORY: Detected background `<Audio>` with static volume >= 0.35 alongside active voiceover scenes. Prefer dynamic ducking `volume={(f) => ...}` or `0.12–0.22` so BGM does not mask narration.'
      );
    }

    const usesCaptionsComp = /ProKaraokeCaptions|WordHighlightCaptions/.test(activeCode);
    if (!usesCaptionsComp) {
      warnings.push(
        'ADVISORY: Voiceover scenes detected without `<ProKaraokeCaptions />` or `<WordHighlightCaptions />`. Mount `<ProKaraokeCaptions stylePreset="minimal" />` (or choose `"hormozi" | "glow" | "cyber"` to match your style) to render MMS-300M CTC word-synced subtitles.'
      );
    }

    if (
      ctx.audioConfig!.scenes!.length >= 2 &&
      !/\bgetWordTrigger\s*\(|\bgetWordProgress\s*\(|transitionStyle\s*=/.test(activeCode)
    ) {
      warnings.push(
        'DIRECTOR_NOTE: Multi-scene composition detected without `transitionStyle` or `getWordTrigger()` word-synced sub-beats. Use `<SyncedScene transitionStyle="zoom-through" | "whip-pan" | "wipe">` and trigger kinetic beats inside each scene to avoid a static slide feel.'
      );
    }
  }

  // Detect Vietnamese diacritics without an explicit Vietnamese-safe font import
  const combinedScriptText = [
    activeCode,
    ...(ctx.audioConfig?.scenes || []).map((s) => (typeof s === 'string' ? s : s?.text || '')),
  ].join('\n');
  const hasVietnameseText =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(combinedScriptText);
  if (hasVietnameseText && !/@remotion\/google-fonts|BeVietnamPro|Noto\s+Sans/i.test(activeCode)) {
    warnings.push(
      'ADVISORY: Vietnamese text detected without `@remotion/google-fonts/BeVietnamPro`. Import `{ loadFont } from "@remotion/google-fonts/BeVietnamPro"` (PascalCase) and pass `fontFamily` to `<ProKaraokeCaptions />` so Vietnamese diacritics render cleanly.'
    );
  }

  // @remotion/google-fonts exports PascalCase subpaths (BeVietnamPro, NotoSans) — kebab-case fails webpack bundling
  const kebabFontMatch = activeCode.match(/@remotion\/google-fonts\/(?!from-info\b)([a-z0-9]+-[a-z0-9-]+)/);
  if (kebabFontMatch) {
    warnings.push(
      `CRITICAL: Invalid \`@remotion/google-fonts/${kebabFontMatch[1]}\` import path. \`@remotion/google-fonts\` uses PascalCase module names (e.g. \`@remotion/google-fonts/BeVietnamPro\`, \`@remotion/google-fonts/NotoSans\`).`
    );
  }

  // Guard against Remotion interpolate() crashing on equal/non-monotonic telemetry boundaries
  const interpDynamicMatch = activeCode.match(
    /\binterpolate\s*\([^,]+,\s*\[[^\]]*(?:getSegmentStartFrame|getSceneTiming|getTelemetryTotalFrames)[^\]]*(?:getSegmentStartFrame|getSceneTiming|getTelemetryTotalFrames)[^\]]*\]/
  );
  if (interpDynamicMatch && !/Math\.max\s*\(/.test(interpDynamicMatch[0])) {
    warnings.push(
      'ADVISORY: Multiple dynamic telemetry calls appear inside a single `interpolate()` inputRange without `Math.max(...)`. Ensure adjacent `inputRange` values are strictly increasing (`curr > prev`) so Remotion never throws a non-monotonic range error.'
    );
  }

  if (
    typeof ctx.width === 'number' &&
    typeof ctx.height === 'number' &&
    ctx.height > ctx.width &&
    (/\b(?:top|bottom)\s*:\s*0\b/.test(activeCode) || /\bpadding\s*:\s*0\b/.test(activeCode))
  ) {
    warnings.push(
      'ADVISORY: Portrait 9:16 layout detected with edge-flush positioning (`top: 0` / `bottom: 0`). Double-check that text and captions stay inside platform Safe Zones (top 12%, bottom 18-22%, right 12%).'
    );
  }

  // --- Universal Compositional Balance & Semantic Sync Analyzers (Style-Agnostic) ---
  const wordsPerPageMatch = activeCode.match(/<ProKaraokeCaptions\b[^>]*\bwordsPerPage\s*=\s*\{\s*(\d+)\s*\}/);
  if (hasVietnameseText && wordsPerPageMatch && Number(wordsPerPageMatch[1]) >= 6) {
    warnings.push(
      `ADVISORY: \`<ProKaraokeCaptions wordsPerPage={${wordsPerPageMatch[1]}} />\` on Vietnamese narration may split phrases awkwardly across lines. Prefer \`wordsPerPage={4}\` or \`5\` for tighter reading rhythm.`
    );
  }

  // Global counter/HUD drift detector: linear interpolation across scene boundaries without milestone dwelling
  const usesGlobalCounter =
    /(?:getSceneTiming|getSegmentStartFrame|getTelemetryTotalFrames)/.test(activeCode) &&
    /(?:toLocaleString|Math\.round|\.toFixed)/.test(activeCode) &&
    /\binterpolate\s*\(/.test(activeCode) &&
    !/\binterpolateSceneMilestones\s*\(/.test(activeCode);
  if (usesGlobalCounter && hasVoiceoverScenes && ctx.audioConfig!.scenes!.length >= 2) {
    warnings.push(
      'DIRECTOR_NOTE: Dynamic numeric counter/HUD detected across multiple scenes without `interpolateSceneMilestones(...)`. Verify in `preview_frames` that live numbers dwell near the active scene milestone instead of drifting ahead of the spoken narration (or use `interpolateSceneMilestones` from `./audio-sync`).'
    );
  }

  // Per-scene visual parity analyzer across <SyncedScene sceneIndex={i}> blocks
  const sceneAnalysis = analyzeSceneVisualParity(activeCode);
  if (sceneAnalysis.richScenes.length > 0 && sceneAnalysis.flatScenes.length > 0) {
    warnings.push(
      `DIRECTOR_NOTE: Visual density parity check — Scene(s) [${sceneAnalysis.richScenes.join(', ')}] use real media/3D/FX layers while Scene(s) [${sceneAnalysis.flatScenes.join(', ')}] rely solely on flat DOM/SVG shapes. Verify on your Contact Sheet that those lighter scenes match the visual richness of the rest of the film (consider adding <KenBurnsMedia>, <Img>, <ThreeCanvas>, <LightLeak>, or <CinematicLightSweep> if unintentional).`
    );
  }

  return warnings;
}

/**
 * Inspect `<SyncedScene sceneIndex={i}>` blocks (including single-component children like `<Scene1 />`)
 * to detect uneven visual-depth richness across scenes without prescribing any specific aesthetic.
 */
export function analyzeSceneVisualParity(activeCode: string): {
  totalSyncedScenes: number;
  richScenes: number[];
  flatScenes: number[];
} {
  const depthLayerRegex =
    /<\s*(?:Img|OffthreadVideo|ThreeCanvas|KenBurnsMedia|LightLeak|CameraMotionBlur|Trail|AtmosphericParticles|CinematicLightSweep)\b|\bevolvePath\s*\(/;
  const syncedRegex = /<SyncedScene\b[^>]*\bsceneIndex\s*=\s*\{\s*(\d+)\s*\}[^>]*>([\s\S]*?)<\/SyncedScene>/g;

  const richScenes: number[] = [];
  const flatScenes: number[] = [];
  let totalSyncedScenes = 0;

  let m: RegExpExecArray | null;
  while ((m = syncedRegex.exec(activeCode)) !== null) {
    totalSyncedScenes++;
    const idx = Number(m[1]);
    const body = m[2] || '';
    let combinedSource = body;

    // Resolve local custom component tags used inside <SyncedScene> (e.g., <Scene1Twilight />)
    const compMatches = body.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g);
    for (const cm of compMatches) {
      const compName = cm[1];
      const defStart = activeCode.search(
        new RegExp(`(?:const|function)\\s+${compName}\\b`)
      );
      if (defStart >= 0) {
        // Grab up to the next top-level component or export (~3500 chars bounded slice)
        const nextComp = activeCode
          .slice(defStart + 20)
          .search(/\n(?:export\s+(?:const|function)|const\s+[A-Z][A-Za-z0-9_]*\s*(?::|=)|function\s+[A-Z][A-Za-z0-9_]*\s*\()/);
        const defSlice =
          nextComp > 0
            ? activeCode.slice(defStart, defStart + 20 + nextComp)
            : activeCode.slice(defStart, defStart + 3500);
        combinedSource += '\n' + defSlice;
      }
    }

    if (depthLayerRegex.test(combinedSource)) {
      richScenes.push(idx);
    } else {
      flatScenes.push(idx);
    }
  }

  return { totalSyncedScenes, richScenes, flatScenes };
}

export interface QualityEvaluationInput {
  tsxCode: string;
  creativeIntent?: string;
  genre?: string;
  durationInFrames?: number;
  fps?: number;
  width?: number;
  height?: number;
  audioConfig?: ValidationContext['audioConfig'];
  expectedMinFrames?: number;
}

export function buildQualityEvaluationReport(input: QualityEvaluationInput) {
  const findings = validateTsxComposition(input.tsxCode, {
    durationInFrames: input.durationInFrames,
    fps: input.fps,
    width: input.width,
    height: input.height,
    audioConfig: input.audioConfig,
    expectedMinFrames: input.expectedMinFrames,
  });

  const criticalIssues = findings.filter((f) => f.startsWith('CRITICAL:'));
  const advisories = findings.filter((f) => !f.startsWith('CRITICAL:'));
  const isPortrait =
    typeof input.width === 'number' &&
    typeof input.height === 'number' &&
    input.height > input.width;

  const activeCode = stripTsxComments(input.tsxCode || '');
  const hasInlineDucking = /\bvolume\s*=\s*\{\s*\(?[a-zA-Z_]\w*\)?\s*=>/.test(activeCode);
  const volumeFnRefMatch = activeCode.match(/\bvolume\s*=\s*\{\s*([a-zA-Z_$][\w$]*)\s*\}/);
  const hasNamedDucking =
    Boolean(volumeFnRefMatch) &&
    new RegExp(`\\b(?:const|let|function)\\s+${volumeFnRefMatch![1]}\\b`).test(activeCode);

  const sceneParity = analyzeSceneVisualParity(activeCode);

  const detectedSignals = {
    usesSpringPhysics: /\bspring\s*\(/.test(activeCode),
    usesInterpolation: /\binterpolate\s*\(/.test(activeCode),
    usesMilestoneSync: /\binterpolateSceneMilestones\s*\(/.test(activeCode),
    uses3DOrCanvas: /ThreeCanvas|@remotion\/three/.test(activeCode),
    usesTransitions: /TransitionSeries|@remotion\/transitions/.test(activeCode),
    usesStoryboardCanvas: /StoryboardCanvas|SyncedScene/.test(activeCode),
    usesCaptions: /ProKaraokeCaptions|WordHighlightCaptions/.test(activeCode),
    usesDynamicAudioDucking: hasInlineDucking || hasNamedDucking,
    usesGoogleFontsOrCustomFont: /loadFont|@remotion\/google-fonts|@remotion\/fonts/.test(activeCode),
    sceneVisualParity: sceneParity,
  };

  return {
    hardGuardrailsPassed: criticalIssues.length === 0,
    criticalIssues,
    advisories,
    creativeFreedomNote:
      'All stylistic choices (colors, 2D/3D medium, typography, pacing, transitions) remain 100% under your creative authority. Signals below are purely observational, never mandatory.',
    targetFormat: {
      resolution: `${input.width || 1920}x${input.height || 1080}`,
      orientation: isPortrait ? 'portrait_9_16' : 'landscape_16_9',
      fps: input.fps || 30,
      durationInFrames: input.durationInFrames || 300,
      creativeIntent: input.creativeIntent || 'unspecified (evaluate relative to your chosen mood & genre)',
      genre: input.genre || 'general',
    },
    observedSignals: detectedSignals,
    rubric5Pillars: [
      {
        pillar: '1. Technical & Render Integrity',
        weight: 20,
        focus: 'Determinism (random seed), safe-zone margins, clamped motion, duration >= full speech.',
      },
      {
        pillar: '2. Storytelling & Retention Pacing',
        weight: 20,
        focus: 'Strong 3-5s opening hook, cohesive narrative arc, genre-appropriate visual rhythm / pattern interrupts.',
      },
      {
        pillar: '3. Visual Craft & Legibility',
        weight: 25,
        focus: 'Single clear Focal Point per beat, 1-second text readability/contrast, spatial depth (layers/3D/lighting or clean minimalism), cohesive color palette.',
      },
      {
        pillar: '4. Motion Physics & Continuity',
        weight: 15,
        focus: 'Weighted organic motion (spring/bezier when appropriate), smooth visual or rhythmic bridges between scenes, visuals reinforce meaning.',
      },
      {
        pillar: '5. Audio Hierarchy & Zero-Drift Sync',
        weight: 20,
        focus: 'Clear vocal priority with BGM ducking during speech, zero voiceover overlap, SFX/silence contrast, frame-accurate sync.',
      },
    ],
    visionFrameChecklist: VISION_FRAME_CRITERIA,
    nextRecommendedAction:
      criticalIssues.length > 0
        ? 'Fix the CRITICAL technical invariant(s) above before rendering.'
        : advisories.length > 0
        ? 'Address the ADVISORIES above (font, captions, interpolate monotonicity, transitions), then run `preview_frames` with 4 keyframes before `render_video`.'
        : 'All technical & craft checks passed! Next: call `preview_frames` with 4 key frame indices (e.g. start, mid-scenes, outro) and inspect the Contact Sheet via `get_task_status` BEFORE calling `render_video`.',
  };
}

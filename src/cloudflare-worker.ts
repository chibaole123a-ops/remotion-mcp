export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  MCP_SECRET: string;
}

const ECOSYSTEM_DOCS = `
# REMOTION v4.0.541 — OPEN CREATIVE AI VIDEO STUDIO (v5.2)
## (Cohesive Documentary Storytelling + Butter-Smooth 60fps Motion + Frame-Exact WordBoundary Sync + Pure Voiceover)

You have **100% creative freedom**. Act as a **World-Class Film Director, Documentary Storyteller, Motion Graphics Artist, and High-Retention Video Editor (Vox / Kurzgesagt / Lemmino / Apple Keynote)**.

---

## I. CRITICAL DIRECTING RULES FOR SEAMLESS STORYTELLING & BUTTER-SMOOTH MOTION

1. **Cohesive, Flowing Narrative Script (NO Choppy, Disconnected 1-Sentence Blurbs!)**:
   - **NEVER** write 3–4 short, abrupt, disconnected sentences! A great video tells a **continuous, deeply engaging story** where each paragraph naturally bridges into the next using smooth narrative transitions (*"Nhưng điều kỳ diệu thực sự nằm ở...", "Để hiểu tại sao điều này xảy ra, hãy nhìn vào...", "Chính cơ chế đó đã dẫn đến..."*).
   - Write rich, well-paced \`narrationSegments\` (typically 5 to 10 cohesive narrative chapters, each 2–3 sentences long) so the voiceover flows like a captivating documentary narrator.
2. **Butter-Smooth Motion & Anti-Lag Rendering (Zero Stutter / Zero Jitter)**:
   - **NEVER** use conditional unmount cuts like \`{progress < 1 && <Component />}\` that make elements abruptly vanish or pop in mid-scene! Instead, always keep elements mounted and smoothly crossfade their \`opacity\` and \`transform\` using \`interpolate(..., { easing: Easing.bezier(0.22, 1, 0.36, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })\` or physics-based \`spring({ frame, fps, config: { damping: 18, stiffness: 90, mass: 1 } })\`.
   - **Avoid Heavy CSS Blur Repaints**: Do NOT animate large \`filter: blur(70px)\` orbs or 3D CSS \`perspective()\` grids every frame, as software rasterizers stutter on heavy CSS blurs. Use clean \`radial-gradient(...)\` backgrounds, crisp SVG vectors, and hardware-friendly \`transform: translate3d(...) scale(...)\`.
   - **Seamless Cross-Scene Transitions**: Instead of abrupt hard cuts between \`<Sequence>\` blocks, overlap or cross-fade visual states smoothly (e.g., fade in the first 15 frames and fade out the last 15 frames of each chapter, or use \`<ContinuousAudioTrack />\` with a continuous camera canvas).
3. **Pure, Crystal-Clear Voiceover (NO Synthetic BGM or Noisy SFX)**:
   - Do **NOT** add synthetic background music (\`bgm.mp3\`) or noisy sound effects (\`@remotion/sfx\`). Let the Neural AI Voiceover (\`voice-0.mp3\`, \`voice-1.mp3\`... or \`<ContinuousAudioTrack />\`) be 100% pure and crystal-clear!
4. **100% Exact Word-to-Visual Synchronization (\`./audio-sync\`)**:
   - Import from \`'./audio-sync'\`:
     \`\`\`tsx
     import {
       getSceneFrames,
       getSegmentStartFrame,
       getWordFrame,
       getGlobalWordFrame,
       getWordProgress,
       ContinuousAudioTrack,
       WordHighlightCaptions,
       audioTelemetry,
     } from './audio-sync';
     \`\`\`
   - Use \`getSceneFrames(i, fallback)\` for exact duration lock, \`getWordFrame(i, 'từ khóa', fallback)\` to trigger visual illustrations right as the narrator speaks that concept, and \`<WordHighlightCaptions sceneIndex={i} />\` (or \`<WordHighlightCaptions />\` at root) for smooth word-by-word highlighted subtitles.

---

## II. COMPLETE INSTALLED ECOSYSTEM & API SIGNATURES (Remotion v4.0.541)

1. **Core (\`remotion\`)**:
   \`useCurrentFrame\`, \`useVideoConfig\`, \`AbsoluteFill\`, \`Sequence\`, \`Series\`, \`Loop\`, \`Freeze\`, \`interpolate\`, \`interpolateColors\`, \`spring\`, \`Easing\`, \`random\`, \`Audio\`, \`OffthreadVideo\`, \`Img\`, \`staticFile\`.
2. **Audio-Visual Word Sync (\`./audio-sync\`)**:
   - \`getSceneFrames(sceneIndex: number, fallbackFrames?: number): number\`
   - \`getSegmentStartFrame(sceneIndex: number, fallbackStartFrame?: number): number\`
   - \`getWordFrame(sceneIndex: number, keywordOrPhrase: string, fallbackFrame?: number): number\`
   - \`getGlobalWordFrame(sceneIndex: number, keywordOrPhrase: string, fallbackGlobalFrame?: number): number\`
   - \`getWordProgress(sceneIndex: number, startKeyword: string, endKeyword: string, localFrame: number): number\`
   - \`<ContinuousAudioTrack voiceVolume?: number />\`
   - \`<WordHighlightCaptions sceneIndex?: number highlightColor?: string activeBgColor?: string fontSize?: number bottomOffset?: number />\`
3. **Captions & Audio Spectrum (\`@remotion/captions\`, \`@remotion/media-utils\`)**:
   \`createTikTokStyleCaptions\`, \`useAudioData\`, \`visualizeAudio\`, \`visualizeAudioWaveform\`.
4. **Transitions & Light Leaks (\`@remotion/transitions\`, \`@remotion/light-leaks\`)**:
   \`TransitionSeries\`, \`linearTiming\`, \`springTiming\`, \`fade\`, \`slide\`, \`wipe\`, \`flip\`, \`clock-wipe\`, \`iris\`, \`LightLeak\`.
5. **2D Vector Shapes, SVG Paths & 3D WebGL (\`@remotion/shapes\`, \`@remotion/paths\`, \`@remotion/three\`, \`three\`, \`@react-three/fiber\`, \`@react-three/drei\`)**:
   \`Circle\`, \`Rect\`, \`Triangle\`, \`Star\`, \`Polygon\`, \`Ellipse\`, \`Heart\`, \`Pie\`, \`evolvePath\`, \`interpolatePath\`, \`getPointAtLength\`, \`ThreeCanvas\`.
6. **Motion Blur, Organic Noise, Google Fonts & Icons (\`@remotion/motion-blur\`, \`@remotion/noise\`, \`@remotion/google-fonts/BeVietnamPro\`, \`@remotion/layout-utils\`, \`lucide-react\`)**:
   \`Trail\`, \`CameraMotionBlur\`, \`noise2D\`, \`noise3D\`, \`loadFont\`, \`fitText\`, and 1,500+ \`lucide-react\` icons.
`;

function toBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function randomJobId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function sanitizeJobId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'unknown';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validateTsxCode(tsxCode: string): string[] {
  const warnings: string[] = [];
  if (!/export\s+(const|function)\s+DynamicVideo/.test(tsxCode)) {
    warnings.push(
      'CRITICAL: Code must export `export const DynamicVideo: React.FC = () => { ... }` or `export function DynamicVideo()`.'
    );
  }
  if (/Math\.random\s*\(/.test(tsxCode)) {
    warnings.push(
      'NOTE: Detected `Math.random()`. Prefer `random("seed")` from "remotion" so parallel multi-core rendering stays 100% deterministic.'
    );
  }
  return warnings;
}

/**
 * Analyze narration segments into a frame-accurate word & scene timeline map
 * so Gemini knows the exact frame of every spoken keyword and scene duration before writing tsxCode.
 */
function buildNarrationTimelineAnalysis(
  narrationSegments: string[],
  fps = 30,
  rate = '+5%'
) {
  const rateMatch = String(rate).match(/([+-]?\d+)%/);
  const rateFactor = rateMatch ? 1 + Number(rateMatch[1]) / 100 : 1.05;
  // Natural Vietnamese/English neural TTS speaking rate is ~3.15 words/sec at +5%
  const baseWordsPerSec = 3.0 * rateFactor;

  let cumulativeFrames = 0;
  const scenes = narrationSegments.map((rawSeg, sceneIndex) => {
    const text = String(rawSeg || '').trim();
    const tokens = text.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      const emptyFrames = Math.ceil(2 * fps);
      const s = {
        sceneIndex,
        text: '',
        estimatedAudioSeconds: 1.5,
        durationInFrames: emptyFrames,
        startFrame: cumulativeFrames,
        endFrame: cumulativeFrames + emptyFrames,
        words: [] as any[],
      };
      cumulativeFrames += emptyFrames;
      return s;
    }

    // Weight each word by syllable character length and punctuation pauses
    const weights = tokens.map((w) => {
      const cleanLen = w.replace(/[^\p{L}\p{N}]/gu, '').length || 1;
      const commaPause = /[,;:]/.test(w) ? 1.4 : 0;
      const periodPause = /[.!?…]$/.test(w) ? 2.4 : 0;
      return Math.max(1.2, cleanLen * 0.78 + commaPause + periodPause);
    });

    const avgWeightPerWord = 3.2;
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const spokenDurationSec = Math.max(
      1.6,
      totalWeight / (avgWeightPerWord * baseWordsPerSec)
    );
    const totalAudioMs = Math.round(spokenDurationSec * 1000);
    const sceneDurationFrames = Math.ceil((spokenDurationSec + 0.55) * fps);

    let cursorMs = 80;
    const usableMs = Math.max(300, totalAudioMs - 160);
    const words = tokens.map((w, idx) => {
      const durMs = (weights[idx] / totalWeight) * usableMs;
      const startMs = Math.round(cursorMs);
      const endMs = Math.round(cursorMs + durMs);
      cursorMs += durMs;
      return {
        word: w,
        startMs,
        endMs,
        startFrame: Math.floor((startMs / 1000) * fps),
        endFrame: Math.ceil((endMs / 1000) * fps),
      };
    });

    const sceneObj = {
      sceneIndex,
      text,
      estimatedAudioSeconds: Number(spokenDurationSec.toFixed(2)),
      durationInFrames: sceneDurationFrames,
      startFrame: cumulativeFrames,
      endFrame: cumulativeFrames + sceneDurationFrames,
      words,
    };
    cumulativeFrames += sceneDurationFrames;
    return sceneObj;
  });

  return {
    fps,
    totalFrames: Math.max(90, cumulativeFrames),
    totalSeconds: Number((Math.max(90, cumulativeFrames) / fps).toFixed(2)),
    sceneFrames: scenes.map((s) => s.durationInFrames),
    scenes,
    usageHint:
      'Use `getSceneFrames(sceneIndex)` for each scene duration, `getWordFrame(sceneIndex, keyword)` to trigger visual animations at the exact spoken word, and `<WordHighlightCaptions sceneIndex={i} />` from `./audio-sync` for real-time word-by-word karaoke captions!',
  };
}

async function dispatchGitHubRender(
  env: Env,
  jobId: string,
  title: string,
  tsxCode: string,
  durationInFrames: number,
  fps: number,
  width: number,
  height: number,
  audioConfig: any
) {
  const repo = env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/render.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Remotion-Cloudflare-MCP-Worker',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          jobId,
          title,
          durationInFrames: String(durationInFrames),
          fps: String(fps),
          width: String(width),
          height: String(height),
          tsxCodeBase64: toBase64Utf8(tsxCode),
          audioConfigBase64: toBase64Utf8(JSON.stringify(audioConfig || {})),
          callbackUrl: '',
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub Actions dispatch error (${res.status}): ${errText}`);
  }
}

async function listReleaseVideosOnGitHub(env: Env, baseUrl: string) {
  const repo = env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';
  const secretSuffix = env.MCP_SECRET ? `?key=${encodeURIComponent(env.MCP_SECRET)}` : '';
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/videos-store`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'User-Agent': 'Remotion-Cloudflare-MCP-Worker',
      },
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const assets: any[] = data?.assets || [];

    return assets
      .filter((a) => typeof a.name === 'string' && a.name.startsWith('video-') && a.name.endsWith('.mp4') && a.state === 'uploaded')
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .map((a) => {
        const jobId = a.name.replace(/^video-/, '').replace(/\.mp4$/, '');
        return {
          jobId,
          fileName: a.name,
          sizeMB: Number(((a.size || 0) / (1024 * 1024)).toFixed(2)),
          createdAt: a.updated_at || a.created_at,
          watchPageUrl: `${baseUrl}/watch/${jobId}${secretSuffix}`,
          streamUrl: `${baseUrl}/video/${jobId}.mp4${secretSuffix}`,
          directDownloadUrl: `https://github.com/${repo}/releases/download/videos-store/${a.name}`,
        };
      });
  } catch {
    return [];
  }
}

async function checkReleaseAssetsOnGitHub(
  env: Env,
  jobId: string
): Promise<{ videoReady: boolean; errorLogText?: string }> {
  const repo = env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/videos-store`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'User-Agent': 'Remotion-Cloudflare-MCP-Worker',
      },
    });
    if (!res.ok) return { videoReady: false };
    const data: any = await res.json();
    const assets: any[] = data?.assets || [];

    const videoReady = assets.some((a) => a.name === `video-${jobId}.mp4` && a.state === 'uploaded');
    const errAsset = assets.find((a) => a.name === `error-${jobId}.txt` && a.state === 'uploaded');

    let errorLogText: string | undefined;
    if (errAsset) {
      const errUrl = `https://github.com/${repo}/releases/download/videos-store/error-${jobId}.txt`;
      const errRes = await fetch(errUrl, {
        headers: { 'User-Agent': 'Remotion-Cloudflare-MCP-Worker' },
        redirect: 'follow',
      });
      if (errRes.ok) {
        errorLogText = await errRes.text();
      }
    }

    return { videoReady, errorLogText };
  } catch {
    return { videoReady: false };
  }
}

async function inspectGitHubWorkflowRun(env: Env, jobId: string) {
  const repo = env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';
  try {
    const runsRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/render.yml/runs?per_page=15`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          'User-Agent': 'Remotion-Cloudflare-MCP-Worker',
        },
      }
    );
    if (!runsRes.ok) return null;
    const runsData: any = await runsRes.json();
    const runs: any[] = runsData?.workflow_runs || [];
    if (runs.length === 0) return null;

    const targetRun =
      runs.find(
        (r) =>
          (typeof r.display_title === 'string' && r.display_title.includes(jobId)) ||
          (typeof r.name === 'string' && r.name.includes(jobId))
      ) || runs[0];

    const jobsRes = await fetch(targetRun.jobs_url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'User-Agent': 'Remotion-Cloudflare-MCP-Worker',
      },
    });
    const jobsData: any = jobsRes.ok ? await jobsRes.json() : null;
    const ghJob = jobsData?.jobs?.[0];

    const steps = (ghJob?.steps || []).map((s: any) => ({
      name: s.name,
      status: s.status,
      conclusion: s.conclusion,
    }));

    return {
      runId: targetRun.id,
      status: targetRun.status,
      conclusion: targetRun.conclusion,
      htmlUrl: targetRun.html_url,
      steps,
    };
  } catch {
    return null;
  }
}

const TOOLS = [
  {
    name: 'get_remotion_ecosystem_guide',
    description:
      'Get the complete Remotion v4.0.541 Open Creative Studio v5.0 guide (6-Step Professional Editor Workflow, Frame-Exact Word-to-Visual Sync `./audio-sync`, Word-by-Word Karaoke Captions, and all 26+ package APIs).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'analyze_narration_timeline',
    description:
      'Step 1 for Frame-Exact Audio-Visual Sync: Analyze spoken `narrationSegments` BEFORE writing `tsxCode` to get the exact frame duration of each scene (`sceneFrames`) and the exact `startFrame`/`endFrame` of every spoken word/keyword so your visual animations illustrate each concept at the exact moment it is spoken.',
    inputSchema: {
      type: 'object',
      properties: {
        narrationSegments: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of spoken narration paragraphs (one per scene/chapter in order).',
        },
        fps: {
          type: 'number',
          description: 'Frames per second (default 30)',
          default: 30,
        },
        voice: {
          type: 'string',
          description: 'Neural voice ID (default vi-VN-NamMinhNeural)',
          default: 'vi-VN-NamMinhNeural',
        },
      },
      required: ['narrationSegments'],
    },
  },
  {
    name: 'render_remotion_video',
    description: `Render a complete broadcast-ready Remotion video on GitHub Actions Cloud (16GB RAM, Remotion v4.0.541, Frame-Exact WordBoundary Sync, Multi-Layer BGM, WebGL2 swangle).
${ECOSYSTEM_DOCS}`,
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the video project',
        },
        tsxCode: {
          type: 'string',
          description:
            'Complete TypeScript/React code for DynamicVideo.tsx exporting `export const DynamicVideo: React.FC = () => { ... }`. Use `getSceneFrames`, `getWordFrame`, and `<WordHighlightCaptions sceneIndex={i} />` from `./audio-sync` along with `<Audio src={staticFile("bgm.mp3")} volume={0.18} />` and `<Audio src={staticFile("voice-0.mp3")} volume={1} />`!',
        },
        durationInFrames: {
          type: 'number',
          description:
            'Total frames of the video (`seconds * fps`). Automatically expanded on Cloud if spoken voiceover is longer.',
        },
        narrationSegments: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Spoken voiceover script for each scene/chapter in order. Segment `i` is synthesized into `staticFile("voice-" + i + ".mp3")` with exact word-level timestamps in `./audio-sync`.',
        },
        voice: {
          type: 'string',
          description:
            'Neural TTS voice ID. Use "vi-VN-NamMinhNeural" (Vietnamese Male) or "vi-VN-HoaiMyNeural" (Vietnamese Female), or "en-US-AndrewMultilingualNeural" (English).',
          default: 'vi-VN-NamMinhNeural',
        },
        bgmMood: {
          type: 'string',
          enum: ['epic-space', 'cyber-tech', 'warm-inspiring', 'mystery-deep', 'upbeat-energetic'],
          description:
            'Mood for automatic multi-layer 4-chord background music synthesized into `staticFile("bgm.mp3")`.',
          default: 'epic-space',
        },
        fps: {
          type: 'number',
          description: 'Frames per second (24 for cinematic film, 30 for standard, 60 for ultra-smooth)',
          default: 30,
        },
        width: {
          type: 'number',
          description: 'Video width in pixels (1920 for 16:9 YouTube, 1080 for 9:16 TikTok/Shorts, 3840 for 4K)',
          default: 1920,
        },
        height: {
          type: 'number',
          description: 'Video height in pixels (1080 for 16:9 YouTube, 1920 for 9:16 TikTok/Shorts, 2160 for 4K)',
          default: 1080,
        },
      },
      required: ['tsxCode', 'durationInFrames'],
    },
  },
  {
    name: 'render_batch_videos',
    description:
      'Dispatch up to 20 complete Remotion videos (with AI Voiceover, Word-Level Captions & Multi-Layer BGM) in parallel to GitHub Actions Cloud.',
    inputSchema: {
      type: 'object',
      properties: {
        videos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              tsxCode: { type: 'string' },
              durationInFrames: { type: 'number' },
              narrationSegments: { type: 'array', items: { type: 'string' } },
              voice: { type: 'string', default: 'vi-VN-NamMinhNeural' },
              bgmMood: { type: 'string', default: 'epic-space' },
              fps: { type: 'number', default: 30 },
              width: { type: 'number', default: 1920 },
              height: { type: 'number', default: 1080 },
            },
            required: ['title', 'tsxCode', 'durationInFrames'],
          },
        },
      },
      required: ['videos'],
    },
  },
  {
    name: 'check_render_status',
    description:
      'Check if a rendered video is ready on the Cloud, and inspect real-time GitHub Actions step progress or exact compiler error logs.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The jobId returned by render_remotion_video' },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'list_rendered_videos',
    description:
      'List all previously rendered MP4 videos stored in the Cloud Gallery along with their watch URLs, stream URLs, and download links.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of videos to return (default 20)',
          default: 20,
        },
      },
    },
  },
];

async function handleJsonRpc(body: any, env: Env, baseUrl: string) {
  const { id, method, params } = body;
  const repo = env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';
  const secretQuery = env.MCP_SECRET ? `?key=${encodeURIComponent(env.MCP_SECRET)}` : '';

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'remotion-cloudflare-github-mcp',
          version: '5.0.0',
        },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return null;
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS },
    };
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    try {
      if (toolName === 'get_remotion_ecosystem_guide') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: ECOSYSTEM_DOCS }],
          },
        };
      }

      if (toolName === 'analyze_narration_timeline') {
        const segments = Array.isArray(args.narrationSegments) ? args.narrationSegments : [];
        const fps = Number(args.fps || 30);
        const analysis = buildNarrationTimelineAnalysis(segments, fps);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(analysis, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === 'list_rendered_videos') {
        const limit = Math.max(1, Math.min(100, Number(args.limit || 20)));
        const videos = await listReleaseVideosOnGitHub(env, baseUrl);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    totalStoredVideos: videos.length,
                    galleryUrl: `${baseUrl}/gallery${secretQuery}`,
                    videos: videos.slice(0, limit),
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'render_remotion_video') {
        const tsxCode = String(args.tsxCode || '');
        const warnings = validateTsxCode(tsxCode);
        if (warnings.some((w) => w.startsWith('CRITICAL:'))) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Pre-flight validation failed:\n${warnings.join('\n')}\nPlease fix and call render_remotion_video again.`,
                },
              ],
            },
          };
        }

        const jobId = randomJobId();
        const title = args.title || 'Remotion Studio Video';
        const fps = Number(args.fps || 30);
        const width = Number(args.width || 1920);
        const height = Number(args.height || 1080);
        const narrationSegments = Array.isArray(args.narrationSegments)
          ? args.narrationSegments
          : [];
        const timelineEst =
          narrationSegments.length > 0
            ? buildNarrationTimelineAnalysis(narrationSegments, fps)
            : null;
        const durationInFrames = Math.max(
          Number(args.durationInFrames || 600),
          timelineEst?.totalFrames || 0
        );

        const audioConfig = {
          voice: args.voice || 'vi-VN-NamMinhNeural',
          bgmMood: args.bgmMood || 'epic-space',
          narrationSegments,
        };

        await dispatchGitHubRender(
          env,
          jobId,
          title,
          tsxCode,
          durationInFrames,
          fps,
          width,
          height,
          audioConfig
        );

        const watchPageUrl = `${baseUrl}/watch/${jobId}${secretQuery}`;
        const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretQuery}`;
        const galleryUrl = `${baseUrl}/gallery${secretQuery}`;
        const videoUrl = `https://github.com/${repo}/releases/download/videos-store/video-${jobId}.mp4`;

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'dispatched_to_github_actions_cloud',
                    jobId,
                    title,
                    specs: `${width}x${height} @ ${fps}fps (${durationInFrames} frames / ${(durationInFrames / fps).toFixed(1)}s)`,
                    audioStudio: {
                      voice: audioConfig.voice,
                      bgmMood: audioConfig.bgmMood,
                      narrationScenesCount: audioConfig.narrationSegments.length,
                      wordBoundarySync: true,
                    },
                    watchPageUrl,
                    streamUrl,
                    galleryUrl,
                    directDownloadUrl: videoUrl,
                    notes: warnings.length > 0 ? warnings : undefined,
                    message:
                      'Render job (with Frame-Exact WordBoundary Sync, Voiceover Mastering & Multi-Layer BGM) dispatched to GitHub Actions Cloud! Share watchPageUrl with the user or call check_render_status with jobId to track progress.',
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'render_batch_videos') {
        const videos = Array.isArray(args.videos) ? args.videos : [];
        const jobs = [];

        for (const v of videos) {
          const jobId = randomJobId();
          const fps = Number(v.fps || 30);
          const segs = Array.isArray(v.narrationSegments) ? v.narrationSegments : [];
          const est = segs.length > 0 ? buildNarrationTimelineAnalysis(segs, fps) : null;
          const dur = Math.max(Number(v.durationInFrames || 600), est?.totalFrames || 0);

          await dispatchGitHubRender(
            env,
            jobId,
            v.title || 'Batch Video',
            v.tsxCode,
            dur,
            fps,
            Number(v.width || 1920),
            Number(v.height || 1080),
            {
              voice: v.voice || 'vi-VN-NamMinhNeural',
              bgmMood: v.bgmMood || 'epic-space',
              narrationSegments: segs,
            }
          );
          jobs.push({
            jobId,
            title: v.title,
            watchPageUrl: `${baseUrl}/watch/${jobId}${secretQuery}`,
            streamUrl: `${baseUrl}/video/${jobId}.mp4${secretQuery}`,
            directDownloadUrl: `https://github.com/${repo}/releases/download/videos-store/video-${jobId}.mp4`,
          });
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'batch_dispatched',
                    count: jobs.length,
                    galleryUrl: `${baseUrl}/gallery${secretQuery}`,
                    jobs,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'check_render_status') {
        const jobId = sanitizeJobId(String(args.jobId || ''));
        const start = Date.now();
        let ready = false;
        let errorLogText: string | undefined;
        let workflowInfo: any = null;

        while (Date.now() - start < 15000) {
          const check = await checkReleaseAssetsOnGitHub(env, jobId);
          ready = check.videoReady;
          errorLogText = check.errorLogText;
          if (ready || errorLogText) break;

          workflowInfo = await inspectGitHubWorkflowRun(env, jobId);
          if (workflowInfo?.conclusion === 'failure' || workflowInfo?.conclusion === 'cancelled') {
            break;
          }
          await new Promise((r) => setTimeout(r, 3000));
        }

        const watchPageUrl = `${baseUrl}/watch/${jobId}${secretQuery}`;
        const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretQuery}`;
        const videoUrl = `https://github.com/${repo}/releases/download/videos-store/video-${jobId}.mp4`;
        if (!ready && !workflowInfo) {
          workflowInfo = await inspectGitHubWorkflowRun(env, jobId);
        }

        const activeStep = workflowInfo?.steps?.find((s: any) => s.status === 'in_progress')?.name;
        const isFailed = Boolean(errorLogText) || workflowInfo?.conclusion === 'failure';

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    jobId,
                    status: ready
                      ? 'completed'
                      : isFailed
                      ? 'failed_on_github_actions'
                      : 'rendering_on_github_actions',
                    currentCloudStep: activeStep || workflowInfo?.status,
                    watchPageUrl,
                    streamUrl,
                    videoUrl,
                    compilerErrorDetails: errorLogText,
                    cloudRunnerDiagnostics: workflowInfo,
                    message: ready
                      ? 'Video is completed and ready to watch inline or download!'
                      : isFailed
                      ? 'CRITICAL: The render job FAILED on GitHub Actions. Read `compilerErrorDetails` above to see the exact error stack trace, fix your tsxCode, and call render_remotion_video with a corrected version immediately!'
                      : `Job is actively running on GitHub Actions Cloud (current step: "${activeStep || 'rendering'}"). IMPORTANT FOR GEMINI: Do NOT loop check_render_status repeatedly if this is a long video — present watchPageUrl and videoUrl to the user now so they don't have to wait in chat; the watchPageUrl automatically tracks live progress and plays the video as soon as it finishes!`,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unknown tool: ${toolName}` },
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          isError: true,
          content: [{ type: 'text', text: `Error: ${err?.message || String(err)}` }],
        },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not supported: ${method}` },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const repo = env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id',
        },
      });
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    const keyFromQuery = url.searchParams.get('key');
    const keyFromPath = pathParts.length >= 2 && pathParts[0] === 'mcp' ? pathParts[1] : null;

    if (env.MCP_SECRET && url.pathname !== '/') {
      if (keyFromQuery !== env.MCP_SECRET && keyFromPath !== env.MCP_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid MCP_SECRET' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Cloud Video Gallery route: /gallery
    if (pathParts[0] === 'gallery') {
      const videos = await listReleaseVideosOnGitHub(env, baseUrl);
      const cardsHtml =
        videos.length === 0
          ? `<p style="color:#94a3b8;">Chưa có video nào được lưu trong kho Cloud.</p>`
          : videos
              .map(
                (v) => `
        <div class="card">
          <video src="${escapeHtml(v.streamUrl)}" controls preload="metadata" playsinline></video>
          <div class="meta">
            <div class="title">🎬 Video #${escapeHtml(v.jobId)}</div>
            <div class="sub">${escapeHtml(String(v.sizeMB))} MB • ${escapeHtml(
                  new Date(v.createdAt).toLocaleString('vi-VN')
                )}</div>
            <div class="btns">
              <a href="${escapeHtml(v.watchPageUrl)}" class="btn-outline">Mở trang xem</a>
              <a href="${escapeHtml(v.directDownloadUrl)}" class="btn-primary" download>⬇ Tải MP4</a>
            </div>
          </div>
        </div>`
              )
              .join('\n');

      return new Response(
        `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Kho Video Remotion Cloud (${videos.length})</title>
  <style>
    body { background: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; margin: 0; padding: 36px 5%; }
    h1 { margin-top: 0; color: #38bdf8; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; margin-top: 24px; }
    .card { background: #111827; border: 1px solid #1e293b; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
    video { width: 100%; aspect-ratio: 16/9; background: #000; object-fit: contain; }
    .meta { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .title { font-weight: 700; font-size: 16px; }
    .sub { color: #94a3b8; font-size: 13px; }
    .btns { display: flex; gap: 10px; margin-top: 8px; }
    a { text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; text-align: center; flex: 1; }
    .btn-primary { background: linear-gradient(135deg, #38bdf8, #6366f1); color: #fff; }
    .btn-outline { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; }
  </style>
</head>
<body>
  <h1>🎞️ Kho Video Đã Render (${videos.length} videos)</h1>
  <div class="grid">${cardsHtml}</div>
</body>
</html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Direct video streaming proxy route: /video/:jobId.mp4
    if (pathParts[0] === 'video' && pathParts[1]) {
      const rawId = sanitizeJobId(pathParts[1].replace(/\.mp4$/, '').replace(/^video-/, ''));
      const fileName = `video-${rawId}.mp4`;
      const ghUrl = `https://github.com/${repo}/releases/download/videos-store/${fileName}`;
      const rangeHeader = request.headers.get('Range');
      const fetchHeaders: Record<string, string> = {
        'User-Agent': 'Remotion-Cloudflare-MCP-Worker',
      };
      if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

      const ghRes = await fetch(ghUrl, {
        headers: fetchHeaders,
        redirect: 'follow',
      });

      if (!ghRes.ok) {
        return new Response('Video not found', { status: 404 });
      }

      const respHeaders = new Headers(ghRes.headers);
      respHeaders.set('Content-Type', 'video/mp4');
      respHeaders.set('Content-Disposition', 'inline');
      respHeaders.set('Access-Control-Allow-Origin', '*');
      respHeaders.set('Accept-Ranges', 'bytes');
      respHeaders.set('Cache-Control', 'public, max-age=604800, immutable');

      return new Response(ghRes.body, {
        status: ghRes.status,
        headers: respHeaders,
      });
    }

    // Watch page route: /watch/:jobId
    if (pathParts[0] === 'watch' && pathParts[1]) {
      const jobId = sanitizeJobId(pathParts[1]);
      const check = await checkReleaseAssetsOnGitHub(env, jobId);
      const ready = check.videoReady;
      const secretSuffix = env.MCP_SECRET ? `?key=${encodeURIComponent(env.MCP_SECRET)}` : '';
      const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretSuffix}`;
      const galleryUrl = `${baseUrl}/gallery${secretSuffix}`;
      const downloadUrl = `https://github.com/${repo}/releases/download/videos-store/video-${jobId}.mp4`;

      if (!ready) {
        const wf = await inspectGitHubWorkflowRun(env, jobId);
        const isFailed =
          Boolean(check.errorLogText) ||
          wf?.conclusion === 'failure' ||
          wf?.conclusion === 'cancelled';
        const activeStep = escapeHtml(
          wf?.steps?.find((s: any) => s.status === 'in_progress')?.name ||
            'Đang xử lý khung hình & âm thanh...'
        );
        const safeHtmlUrl = escapeHtml(wf?.htmlUrl || `https://github.com/${repo}/actions`);

        if (isFailed) {
          return new Response(
            `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Render Thất Bại (#${jobId})</title>
  <style>
    body { background: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; }
    .card { background: #1e1b2e; border: 1px solid #ef4444; padding: 28px; border-radius: 14px; max-width: 680px; text-align: left; }
    h2 { color: #f87171; margin-top: 0; }
    pre { background: #090d16; padding: 14px; border-radius: 8px; overflow-x: auto; font-size: 12px; color: #fca5a5; max-height: 260px; }
    a { color: #38bdf8; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h2>⚠️ Bản render #${jobId} gặp lỗi trên Cloud</h2>
    <p>Tiến trình đã tự động dừng (không lặp vô hạn). Hãy bảo Gemini kiểm tra lỗi và gửi bản render mới.</p>
    ${check.errorLogText ? `<pre>${escapeHtml(check.errorLogText)}</pre>` : ''}
    <p><a href="${safeHtmlUrl}" target="_blank">Xem chi tiết trên GitHub Actions ↗</a></p>
  </div>
</body>
</html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }

        return new Response(
          `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="12" />
  <title>Đang Render trên Cloud 16GB RAM... (#${jobId})</title>
  <style>
    body { background: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; }
    .loader { width: 48px; height: 48px; border: 5px solid #1e293b; border-bottom-color: #38bdf8; border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; margin-bottom: 20px; }
    @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .step-badge { background: #1e293b; border: 1px solid #334155; color: #38bdf8; padding: 8px 16px; border-radius: 999px; font-weight: 600; margin: 10px 0; display: inline-block; }
    a { color: #38bdf8; }
  </style>
</head>
<body>
  <span class="loader"></span>
  <h2>⏳ Đang thu âm giọng đọc AI, đồng bộ từng từ & render trên Cloud (16GB RAM)...</h2>
  <div class="step-badge">⚡ Bước hiện tại: ${activeStep}</div>
  <p>Mã công việc: <strong>#${jobId}</strong> — Trang này tự động kiểm tra mỗi 12 giây và sẽ tự phát video ngay khi hoàn tất!</p>
  <p><a href="${safeHtmlUrl}" target="_blank">Xem tiến độ trực tiếp trên GitHub Actions ↗</a></p>
</body>
</html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      return new Response(
        `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Remotion Cloud Video (#${jobId})</title>
  <style>
    body { background: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    video { max-width: 90vw; max-height: 75vh; border-radius: 14px; box-shadow: 0 25px 60px rgba(0,0,0,0.65); border: 1px solid #1e293b; background: #000; }
    .actions { margin-top: 22px; display: flex; gap: 14px; }
    a { background: linear-gradient(135deg, #38bdf8, #6366f1); color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; }
    a.secondary { background: #1e293b; border: 1px solid #334155; }
  </style>
</head>
<body>
  <h2>🎬 Video Remotion (#${jobId})</h2>
  <video src="${streamUrl}" controls autoplay loop playsinline></video>
  <div class="actions">
    <a href="${downloadUrl}" download="remotion-${jobId}.mp4">⬇ Tải xuống MP4</a>
    <a href="${galleryUrl}" class="secondary">🎞️ Kho Video Cloud</a>
  </div>
</body>
</html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // MCP endpoint: /mcp or /mcp/:secret
    if (pathParts[0] === 'mcp') {
      if (request.method === 'POST') {
        const body = await request.json();
        if (Array.isArray(body)) {
          const responses = [];
          for (const item of body) {
            const r = await handleJsonRpc(item, env, baseUrl);
            if (r) responses.push(r);
          }
          return new Response(JSON.stringify(responses), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } else {
          const response = await handleJsonRpc(body, env, baseUrl);
          if (!response) {
            return new Response(null, { status: 202 });
          }
          return new Response(JSON.stringify(response), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      return new Response(JSON.stringify({ status: 'ok', transport: 'streamable-http', version: '5.0.0' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Home status page
    return new Response(
      JSON.stringify({
        status: 'online_24_7',
        version:
          '5.0.0 (Open Creative AI Studio: Frame-Exact WordBoundary Sync + Word-Highlight Captions + Multi-Layer BGM + Full Remotion 4.0.541)',
        platform: 'Cloudflare Workers + GitHub Actions (16GB RAM Cloud)',
        repository: repo,
        security: env.MCP_SECRET ? 'PROTECTED 🔒' : 'OPEN',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
};

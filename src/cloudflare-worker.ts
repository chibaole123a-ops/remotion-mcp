export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  MCP_SECRET: string;
}

const ECOSYSTEM_DOCS = `
# REMOTION v4.0.542 — PURE CREATIVE STUDIO (Antigravity Architecture)

You have **100% creative freedom** to build any video or visual composition the user asks for using the complete Remotion v4.0.542 ecosystem.

## 📦 INSTALLED REMOTION PACKAGES & CAPABILITIES:

1. **Core Remotion (\`remotion\`)**:
   - Hooks: \`useCurrentFrame()\`, \`useVideoConfig()\` (\`fps\`, \`width\`, \`height\`, \`durationInFrames\`).
   - Animation: \`interpolate(frame, [inStart, inEnd], [outStart, outEnd], options?)\`, \`spring({ frame, fps, config })\`, \`interpolateColors()\`.
   - Layout & Media: \`AbsoluteFill\`, \`Sequence\`, \`Img\`, \`OffthreadVideo\`, \`Audio\`, \`staticFile()\`.
   - Utilities: \`random("seed")\` (for deterministic math), \`Easing\`, \`measureSpring()\`.

2. **3D WebGL & Three.js (\`@remotion/three\`, \`three\`, \`@react-three/fiber\`, \`@react-three/drei\`)**:
   - \`ThreeCanvas\`, \`Canvas\`, full Three.js materials, lights, geometries, camera controls, particle systems, and 3D scenes.

3. **2D Vector Shapes & SVG Paths (\`@remotion/shapes\`, \`@remotion/paths\`)**:
   - Geometric shapes: \`Circle\`, \`Rect\`, \`Triangle\`, \`Star\`, \`Polygon\`, \`Ellipse\`, \`Pie\`, \`Heart\`.
   - SVG morphing & animation: \`evolvePath(progress, pathString)\`, \`interpolatePath()\`, \`getPointAtLength()\`, \`getBoundingBox()\`.

4. **Cinematic Transitions (\`@remotion/transitions\`)**:
   - \`TransitionSeries\`, \`TransitionSeries.Sequence\`, \`TransitionSeries.Transition\`.
   - Built-in transitions: \`slide()\`, \`fade()\`, \`wipe()\`, \`flip()\`, combined with \`linearTiming()\` or \`springTiming()\`.

5. **Motion Blur, Noise & Physics (\`@remotion/motion-blur\`, \`@remotion/noise\`)**:
   - \`Trail\`, \`CameraMotionBlur\`.
   - Procedural organic motion: \`noise2D(x, y)\`, \`noise3D(x, y, z)\`, simplex/perlin noise.

6. **Typography, Fonts & Annotations (\`@remotion/google-fonts/*\`, \`@remotion/fonts\`, \`@remotion/rough-notation\`, \`lucide-react\`)**:
   - Google Fonts: \`import { loadFont } from '@remotion/google-fonts/Inter';\`
   - Custom & Local Fonts: \`import { loadFont } from '@remotion/fonts';\`
   - Sketchy Annotations (Rough Notation): \`import { Highlight, Box, Circle, Underline, StrikeThrough, CrossedOff, Bracket } from '@remotion/rough-notation';\` (Animate \`progress\` from 0 to 1 with \`interpolate(frame, ...)\`).
   - Icons: Over 1,500+ Lucide icons (\`import { Flame, Star, Globe, Shield, Rocket } from 'lucide-react';\`).

7. **Media Utilities (\`@remotion/media-utils\`)**:
   - Audio waveform & spectrum: \`useAudioData()\`, \`visualizeAudio()\`.

---

## 🎯 YOU ARE THE SOLE AI VIDEO DIRECTOR (100% AUTONOMY):

You have 100% creative and technical authority over the entire video.
No background scripts, heuristics, or hidden rules will modify or override your code:
- Your React TSX code is compiled and rendered **EXACTLY as you write it**.
- You decide every detail: scene structure, timing, pacing, visual hierarchy, animations, and typography.

### 🎙️ Full Control of Audio & Voiceover:
When you request voiceover in \`audioConfig.scenes\`:
1. Microsoft Edge-TTS synthesizes high-fidelity audio files into your project: \`staticFile("voice-0.mp3")\`, \`staticFile("voice-1.mp3")\`, etc.
2. **Remotion is React**: To play voiceover or music, **you mount \`<Audio>\` components directly in your JSX tree** wherever and whenever you choose:
\`\`\`tsx
import React from 'react';
import { AbsoluteFill, Sequence, Audio, staticFile, useCurrentFrame } from 'remotion';

export const DynamicVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#090d16' }}>
      {/* Background Music if desired */}
      <Audio src={staticFile('bgm.mp3')} volume={0.15} loop />

      {/* Scene 1: Visuals & Voiceover */}
      <Sequence from={0} durationInFrames={180}>
        <Scene1 />
        <Audio src={staticFile('voice-0.mp3')} volume={1} />
      </Sequence>

      {/* Scene 2: Visuals & Voiceover */}
      <Sequence from={180} durationInFrames={180}>
        <Scene2 />
        <Audio src={staticFile('voice-1.mp3')} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};
\`\`\`
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
      'NOTE: Detected `Math.random()`. Prefer `random("seed")` from "remotion" so parallel rendering stays 100% deterministic.'
    );
  }
  return warnings;
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
  audioConfig: any,
  mode: 'video' | 'still' = 'video',
  stillFrame = 0
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
          mode,
          stillFrame: String(stillFrame),
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
): Promise<{ videoReady: boolean; stillReady: boolean; errorLogText?: string; stillBase64?: string }> {
  const repo = env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/videos-store`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'User-Agent': 'Remotion-Cloudflare-MCP-Worker',
      },
    });
    if (!res.ok) return { videoReady: false, stillReady: false };
    const data: any = await res.json();
    const assets: any[] = data?.assets || [];

    const videoReady = assets.some((a) => a.name === `video-${jobId}.mp4` && a.state === 'uploaded');
    const stillAsset = assets.find((a) => a.name === `still-${jobId}.png` && a.state === 'uploaded');
    const stillReady = Boolean(stillAsset);
    const errAsset = assets.find((a) => a.name === `error-${jobId}.txt` && a.state === 'uploaded');

    let stillBase64: string | undefined;
    if (stillAsset) {
      try {
        const stillUrl = `https://github.com/${repo}/releases/download/videos-store/still-${jobId}.png`;
        const stillRes = await fetch(stillUrl, {
          headers: { 'User-Agent': 'Remotion-Cloudflare-MCP-Worker' },
          redirect: 'follow',
        });
        if (stillRes.ok) {
          const arrBuf = await stillRes.arrayBuffer();
          const bytes = new Uint8Array(arrBuf);
          let binary = '';
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          stillBase64 = btoa(binary);
        }
      } catch {}
    }

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

    return { videoReady, stillReady, errorLogText, stillBase64 };
  } catch {
    return { videoReady: false, stillReady: false };
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

    const targetRun = runs.find(
      (r) =>
        (typeof r.display_title === 'string' && r.display_title.includes(jobId)) ||
        (typeof r.name === 'string' && r.name.includes(jobId))
    );
    if (!targetRun) return null;

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

function calculateSpeechTelemetry(
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

    // Normal Vietnamese speed: ~155 words/min = 2.58 words/sec
    const baseWps = 2.6;
    const baseDur = wordCount > 0 ? wordCount / (baseWps * rateMultiplier) : 0;

    // Only count punctuation at the end of words/sentences as speech pauses
    const commas = (text.match(/[,;](\s|$)/g) || []).length;
    const periods = (text.match(/[.!?](\s|$)/g) || []).length;
    const pauseDur = (commas * 0.25 + periods * 0.4) / rateMultiplier;

    const durationSec = Number(Math.max(1.5, baseDur + pauseDur + 0.25).toFixed(2));
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

const TOOLS = [
  {
    name: 'render_video',
    description:
      `PRODUCTION VIDEO RENDER TOOL: Render a complete Remotion v4.0.542 React video composition into an MP4 file on 16GB Cloud Runners.\n` +
      `You are the sole AI Video Director: you control all layout, transitions, audio tracks, and animations.\n` +
      `Pass your full React code via "tsxCode". If your video has speech, pass "audioConfig". Follow up with "get_task_status(jobId)" to track or deliver the watch link.\n${ECOSYSTEM_DOCS}`,
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the video composition',
        },
        tsxCode: {
          type: 'string',
          description:
            'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`. Pass directly to tool parameter.',
        },
        durationInFrames: {
          type: 'number',
          description: 'Total duration in frames (seconds * fps). You freely decide this based on narrative pacing or speech telemetry.',
          default: 300,
        },
        fps: {
          type: 'number',
          description: 'Frames per second (default 30).',
          default: 30,
        },
        width: {
          type: 'number',
          description: 'Width in pixels (1920 for landscape, 1080 for portrait TikTok/Shorts).',
          default: 1920,
        },
        height: {
          type: 'number',
          description: 'Height in pixels (1080 for landscape, 1920 for portrait TikTok/Shorts).',
          default: 1080,
        },
        audioConfig: {
          type: 'object',
          description:
            'Optional: AI Voiceover & Background Music configuration. Schema: { voice?: "vi-VN-NamMinhNeural" | "vi-VN-HoaiMyNeural", bgm?: "lofi" | "cinematic" | "tech", scenes?: Array<{ text: string, voice?: string }> }',
        },
      },
      required: ['tsxCode'],
    },
  },
  {
    name: 'preview_frame',
    description:
      'VISUAL INSPECTION TOOL: Render and capture a single high-resolution still frame (PNG) from your Remotion TSX code.\n' +
      'Use this to inspect layout, color harmony, typography, and contrast with your Vision capabilities before or instead of rendering a full video.\n' +
      'Follow up with get_task_status(jobId) to receive the image block directly in your context.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title or description of the frame preview',
        },
        tsxCode: {
          type: 'string',
          description:
            'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`.',
        },
        frame: {
          type: 'number',
          description: 'Specific frame number to capture (e.g. 0 for poster/intro, 60 for mid-scene). Defaults to 0.',
          default: 0,
        },
        fps: {
          type: 'number',
          description: 'Frames per second (default 30).',
          default: 30,
        },
        width: {
          type: 'number',
          description: 'Width in pixels (default 1920).',
          default: 1920,
        },
        height: {
          type: 'number',
          description: 'Height in pixels (default 1080).',
          default: 1080,
        },
      },
      required: ['tsxCode'],
    },
  },
  {
    name: 'synthesize_speech',
    description:
      'AI VOICEOVER & TIMING CALCULATOR TOOL: Plan and calculate exact speech duration (seconds, frames, word timings) for Vietnamese or English voiceover scenes.\n' +
      'Returns exact frame boundaries (startFrame, durationInFrames) for each scene so you can code your Remotion <Sequence> blocks with 100% sync!',
    inputSchema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array',
          description: 'Array of scenes with narration text: [{ text: "...", voice?: "vi-VN-NamMinhNeural" }]',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              voice: { type: 'string' },
            },
            required: ['text'],
          },
        },
        text: {
          type: 'string',
          description: 'Alternative: single narration text string if only 1 scene.',
        },
        voice: {
          type: 'string',
          description: 'Default voice (e.g. "vi-VN-NamMinhNeural" or "vi-VN-HoaiMyNeural").',
          default: 'vi-VN-NamMinhNeural',
        },
        rate: {
          type: 'string',
          description: 'Speech rate adjustment (e.g. "+0%", "+10%", "-5%").',
          default: '+0%',
        },
        fps: {
          type: 'number',
          description: 'Frames per second of your video project (default 30).',
          default: 30,
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'get_task_status',
    description:
      'TASK STATUS & MULTIMODAL RETRIEVAL TOOL: Check the real-time execution status of any background Cloud render job.\n' +
      'When checking a still frame preview, this tool returns the Base64 multimodal image block directly into your vision context.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The unique jobId returned by render_video, preview_frame, or remotion' },
      },
      required: ['jobId'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'inspect_task_logs',
    description:
      'DIAGNOSTICS & SELF-HEALING TOOL: Retrieve detailed compiler logs, TypeScript error traces, or runner failures for autonomous debugging and self-healing.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The unique jobId to inspect' },
      },
      required: ['jobId'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'list_system_assets',
    description:
      'STORAGE & ASSET BROWSER: List all rendered MP4 videos, still frames, and CDN links currently available.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 20,
          description: 'Maximum number of items to retrieve',
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'remotion',
    description:
      'LEGACY ALIAS TOOL: Unified entrypoint supporting both video render and still preview. Automatically routes to render_video or preview_frame.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        tsxCode: { type: 'string' },
        durationInFrames: { type: 'number' },
        fps: { type: 'number', default: 30 },
        width: { type: 'number', default: 1920 },
        height: { type: 'number', default: 1080 },
        frame: { type: 'number' },
        audioConfig: { type: 'object' },
      },
      required: ['tsxCode'],
    },
  },
];

async function handleJsonRpc(body: any, env: Env, baseUrl: string) {
  const { id, method, params } = body || {};
  const repo = env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';
  const secretQuery = env.MCP_SECRET ? `?key=${encodeURIComponent(env.MCP_SECRET)}` : '';

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'remotion-cloud-mcp',
          version: '6.1.0',
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
      if (toolName === 'synthesize_speech' || toolName === 'plan_voiceover') {
        const scenesInput = args.scenes || args.text || [];
        const voice = args.voice || 'vi-VN-NamMinhNeural';
        const rate = args.rate || '+0%';
        const fps = Number(args.fps || 30);

        const telemetry = calculateSpeechTelemetry(scenesInput, voice, fps, rate);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(telemetry, null, 2),
              },
            ],
          },
        };
      }

      if (
        toolName === 'render_video' ||
        toolName === 'render_remotion_video' ||
        toolName === 'preview_frame' ||
        toolName === 'preview_remotion_frame' ||
        toolName === 'remotion' ||
        toolName === 'remotion_studio'
      ) {
        const isFramePreview =
          toolName === 'preview_frame' ||
          toolName === 'preview_remotion_frame' ||
          typeof args.frame === 'number' ||
          args.action === 'preview';

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
                  text: `Pre-flight validation failed:\n${warnings.join('\n')}\nPlease fix and call tool again.`,
                },
              ],
            },
          };
        }

        const jobId = randomJobId();
        const fps = Number(args.fps || 30);
        const width = Number(args.width || 1920);
        const height = Number(args.height || 1080);

        if (isFramePreview) {
          const title = args.title || 'Remotion Frame Preview';
          const frame = Number(args.frame || 0);

          await dispatchGitHubRender(
            env,
            jobId,
            title,
            tsxCode,
            Math.max(frame + 1, 30),
            fps,
            width,
            height,
            {},
            'still',
            frame
          );

          const stillUrl = `${baseUrl}/still/${jobId}.png${secretQuery}`;
          const downloadUrl = `https://github.com/${repo}/releases/download/videos-store/still-${jobId}.png`;

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: 'frame_dispatched_to_cloud',
                      jobId,
                      capturedFrame: frame,
                      specs: `${width}x${height} @ ${fps}fps`,
                      previewImageUrl: stillUrl,
                      directDownloadUrl: downloadUrl,
                      instructionsForAgent:
                        `Frame capture job dispatched to Cloud runner! It takes ~20-25s. Call get_task_status with jobId "${jobId}" to retrieve the visual inspection image into your vision context.`,
                      message:
                        `Remotion frame #${frame} successfully dispatched to GitHub Actions Cloud (16GB RAM)! Next step: Call get_task_status with jobId "${jobId}" to inspect the visual frame.`,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          };
        }

        // Full Video Render
        const title = args.title || 'Remotion Video';
        const durationInFrames = Number(args.durationInFrames || 300);
        const audioConfig = args.audioConfig || {};

        await dispatchGitHubRender(
          env,
          jobId,
          title,
          tsxCode,
          durationInFrames,
          fps,
          width,
          height,
          audioConfig,
          'video',
          0
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
                    status: 'video_dispatched_to_cloud',
                    jobId,
                    title,
                    specs: `${width}x${height} @ ${fps}fps (${durationInFrames} frames / ${(durationInFrames / fps).toFixed(1)}s)`,
                    watchPageUrl,
                    streamUrl,
                    galleryUrl,
                    directDownloadUrl: videoUrl,
                    notes: warnings.length > 0 ? warnings : undefined,
                    instructionsForAgent:
                      `Present links cleanly in markdown: 🎬 [Xem Video Trực Tiếp](${watchPageUrl}) | 📥 [Tải Video MP4](${videoUrl}). Do NOT print raw long URLs.`,
                    message:
                      'Render job dispatched to GitHub Actions Cloud (16GB RAM)! Present links to user or call get_task_status with jobId to track progress.',
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'get_task_status' || toolName === 'get_system_task_status' || toolName === 'check_render_status') {
        const jobId = sanitizeJobId(String(args.jobId || ''));
        const start = Date.now();
        let ready = false;
        let isStill = false;
        let errorLogText: string | undefined;
        let workflowInfo: any = null;

        let stillBase64: string | undefined;

        while (Date.now() - start < 8000) {
          const check = await checkReleaseAssetsOnGitHub(env, jobId);
          ready = check.videoReady || check.stillReady;
          isStill = check.stillReady;
          errorLogText = check.errorLogText;
          stillBase64 = check.stillBase64;
          if (ready || errorLogText) break;

          workflowInfo = await inspectGitHubWorkflowRun(env, jobId);
          if (workflowInfo?.conclusion === 'failure' || workflowInfo?.conclusion === 'cancelled') {
            break;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }

        const stillUrl = `${baseUrl}/still/${jobId}.png${secretQuery}`;
        const watchPageUrl = `${baseUrl}/watch/${jobId}${secretQuery}`;
        const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretQuery}`;
        const videoUrl = isStill
          ? `https://github.com/${repo}/releases/download/videos-store/still-${jobId}.png`
          : `https://github.com/${repo}/releases/download/videos-store/video-${jobId}.mp4`;
        if (!ready && !workflowInfo) {
          workflowInfo = await inspectGitHubWorkflowRun(env, jobId);
        }

        const activeStep = workflowInfo?.steps?.find((s: any) => s.status === 'in_progress')?.name;
        const isFailed = Boolean(errorLogText) || workflowInfo?.conclusion === 'failure';

        const contentBlocks: any[] = [
          {
            type: 'text',
            text: JSON.stringify(
              {
                jobId,
                type: isStill ? 'still_frame' : 'video',
                status: ready
                  ? 'completed'
                  : isFailed
                  ? 'failed_on_github_actions'
                  : 'rendering_on_github_actions',
                currentCloudStep: activeStep || workflowInfo?.status,
                previewImageUrl: isStill ? stillUrl : undefined,
                watchPageUrl: isStill ? undefined : watchPageUrl,
                streamUrl: isStill ? undefined : streamUrl,
                assetUrl: videoUrl,
                compilerErrorDetails: errorLogText,
                cloudRunnerDiagnostics: workflowInfo,
                message: ready
                  ? (isStill ? 'Still frame is ready to inspect! Multimodal image block attached below.' : 'Video is completed and ready to watch inline or download!')
                  : isFailed
                  ? 'Render job failed on GitHub Actions. Call inspect_task_logs or read compilerErrorDetails to see error trace, fix tsxCode and re-call remotion.'
                  : `Job is actively rendering on GitHub Actions Cloud. Present URL to user; it tracks live progress and completes when ready!`,
              },
              null,
              2
            ),
          },
        ];

        if (isStill && ready && stillBase64) {
          // Standard MCP Specification: type: "image", mimeType: "image/png", data: "<base64>"
          contentBlocks.push({
            type: 'image',
            data: stillBase64,
            mimeType: 'image/png',
            mime_type: 'image/png',
          });
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: contentBlocks,
          },
        };
      }

      if (toolName === 'inspect_task_logs' || toolName === 'inspect_system_logs') {
        const jobId = sanitizeJobId(String(args.jobId || ''));
        const check = await checkReleaseAssetsOnGitHub(env, jobId);
        const workflowInfo = await inspectGitHubWorkflowRun(env, jobId);

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
                    hasErrorLog: Boolean(check.errorLogText),
                    compilerErrorDetails: check.errorLogText || 'No compile-time error log found. Runner may still be in progress or completed without syntax error.',
                    runnerConclusion: workflowInfo?.conclusion || workflowInfo?.status || 'unknown',
                    failedSteps: workflowInfo?.steps?.filter((s: any) => s.conclusion === 'failure') || [],
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'list_system_assets' || toolName === 'manage_cloud_gallery' || toolName === 'list_rendered_videos') {
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
    const authHeader = request.headers.get('Authorization') || '';
    const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const customHeaderKey = request.headers.get('x-mcp-secret') || request.headers.get('x-api-key');
    const keyFromPath =
      pathParts.length >= 2 && (pathParts[0] === 'mcp' || pathParts[0] === 'sse')
        ? pathParts[1]
        : null;

    // Publicly accessible media routes without secret requirement (safe CDN streaming)
    const isPublicMediaRoute =
      url.pathname === '/' ||
      pathParts[0] === 'still' ||
      pathParts[0] === 'video';

    if (env.MCP_SECRET && !isPublicMediaRoute) {
      const isValid =
        keyFromQuery === env.MCP_SECRET ||
        keyFromPath === env.MCP_SECRET ||
        bearerKey === env.MCP_SECRET ||
        customHeaderKey === env.MCP_SECRET;

      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid MCP_SECRET' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Direct still frame streaming proxy route: /still/:jobId.png
    if (pathParts[0] === 'still' && pathParts[1]) {
      const rawId = sanitizeJobId(pathParts[1].replace(/\.png$/, '').replace(/^still-/, ''));
      const fileName = `still-${rawId}.png`;
      const ghUrl = `https://github.com/${repo}/releases/download/videos-store/${fileName}`;

      const ghRes = await fetch(ghUrl, {
        headers: { 'User-Agent': 'Remotion-Cloudflare-MCP-Worker' },
        redirect: 'follow',
      });

      if (!ghRes.ok) {
        return new Response('Still frame not found', { status: 404 });
      }

      const respHeaders = new Headers(ghRes.headers);
      respHeaders.set('Content-Type', 'image/png');
      respHeaders.set('Content-Disposition', 'inline; filename="still-' + rawId + '.png"');
      respHeaders.set('Access-Control-Allow-Origin', '*');
      respHeaders.set('Cache-Control', 'public, max-age=604800, immutable');

      return new Response(ghRes.body, {
        status: ghRes.status,
        headers: respHeaders,
      });
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
            'Đang xử lý khung hình Remotion...'
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
    <p>Tiến trình đã tự động dừng. Bạn có thể kiểm tra lỗi bên dưới và yêu cầu Gemini sửa lại code.</p>
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
  <meta http-equiv="refresh" content="10" />
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
  <h2>⏳ Đang kết xuất video Remotion trên Cloud (16GB RAM)...</h2>
  <div class="step-badge">⚡ Bước hiện tại: ${activeStep}</div>
  <p>Mã công việc: <strong>#${jobId}</strong> — Trang này tự động làm mới mỗi 10 giây và phát video ngay khi hoàn tất!</p>
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

      return new Response(JSON.stringify({ status: 'ok', transport: 'streamable-http', version: '6.1.0' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Home status page
    return new Response(
      JSON.stringify({
        status: 'online_24_7',
        version: '6.1.0 (Antigravity-Style Agentic Remotion Studio)',
        platform: 'Cloudflare Workers + GitHub Actions (16GB RAM Cloud)',
        repository: repo,
        tools: TOOLS.map((t) => t.name),
        security: env.MCP_SECRET ? 'PROTECTED 🔒' : 'OPEN',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
};

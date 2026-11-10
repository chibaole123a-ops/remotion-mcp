export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  MCP_SECRET: string;
}

const ECOSYSTEM_DOCS = `
# REMOTION v4.0.541 — OPEN CREATIVE AI STUDIO (Antigravity Architecture)

You have **100% creative freedom** to build any video or visual composition the user asks for using the complete Remotion v4.0.541 ecosystem.

## 🚀 ANTIGRAVITY AGENTIC WORKFLOW FOR GEMINI:
1. **Direct Composition**: Write your Remotion React composition directly based on the user's requirements.
2. **Fast Still Preview (\`preview_remotion_frame\`)**: To quickly inspect visual layout, 3D positioning, colors, or typography in seconds, call \`preview_remotion_frame\` with \`frame: 0\` (or key frame) before or alongside full rendering.
3. **Full Video Render (\`render_remotion_video\`)**: Call \`render_remotion_video\` to render the complete MP4 on Cloud (16GB RAM).
4. **Autonomous Self-Healing Loop**: If \`check_render_status\` returns \`failed_on_github_actions\`, inspect \`compilerErrorDetails\`, fix the code error immediately, and re-call \`render_remotion_video\` without asking the user.

---

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

6. **Typography, Fonts & Icons (\`@remotion/google-fonts/*\`, \`lucide-react\`)**:
   - Google Fonts: \`import { loadFont } from '@remotion/google-fonts/Inter';\` (or \`BeVietnamPro\`, \`Roboto\`, \`Montserrat\`, etc.).
   - Icons: Over 1,500+ Lucide icons (\`import { Flame, Star, Globe, Shield, Rocket } from 'lucide-react';\`).

7. **Audio Visualizers & Captions (\`@remotion/media-utils\`, \`@remotion/captions\`, \`./audio-sync\`)**:
   - Audio waveform & spectrum: \`useAudioData()\`, \`visualizeAudio()\`.
   - Optional AI Voiceover: When \`narrationSegments\` is supplied, Edge-TTS creates \`staticFile('voice-0.mp3')\`, etc.
   - Word telemetry & captions: \`ContinuousAudioTrack\`, \`WordHighlightCaptions\`, \`SyncedScene\`, \`getWordTrigger\` from \`./audio-sync\`.

---

## 🎯 CODE CONTRACT:

Your code must export a master component named \`DynamicVideo\`:
\`\`\`tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export const DynamicVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#090d16', justifyContent: 'center', alignItems: 'center' }}>
      {/* Your creative Remotion composition */}
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
): Promise<{ videoReady: boolean; stillReady: boolean; errorLogText?: string }> {
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
    const stillReady = assets.some((a) => a.name === `still-${jobId}.png` && a.state === 'uploaded');
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

    return { videoReady, stillReady, errorLogText };
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
      'Get the complete Remotion v4.0.541 Open Creative Studio guide (Three.js 3D, Shapes, Paths, Transitions, Fonts, Noise, Captions, Animation utils).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'preview_remotion_frame',
    description:
      'Fast Still Preview (Antigravity mode): Capture a single high-res static PNG frame (via `npx remotion still`) on Cloud to quickly inspect visual layout, typography, 3D elements, colors, and styling in seconds before rendering the full video.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title for preview',
        },
        tsxCode: {
          type: 'string',
          description:
            'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`',
        },
        frame: {
          type: 'number',
          description: 'Specific frame number to capture (default: 0).',
          default: 0,
        },
        fps: { type: 'number', default: 30 },
        width: { type: 'number', default: 1920 },
        height: { type: 'number', default: 1080 },
      },
      required: ['tsxCode'],
    },
  },
  {
    name: 'render_remotion_video',
    description: `Render a complete broadcast-ready Remotion video on GitHub Actions Cloud (16GB RAM, Remotion v4.0.541, WebGL2 swangle).\n${ECOSYSTEM_DOCS}`,
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
            'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`. You have 100% creative freedom to use any Remotion features requested by the user.',
        },
        durationInFrames: {
          type: 'number',
          description: 'Total duration in frames (seconds * fps). Default 300 (10s @ 30fps).',
          default: 300,
        },
        fps: {
          type: 'number',
          description: 'Frames per second (default 30).',
          default: 30,
        },
        width: {
          type: 'number',
          description: 'Video width in pixels (1920 for YouTube, 1080 for TikTok/Shorts).',
          default: 1920,
        },
        height: {
          type: 'number',
          description: 'Video height in pixels (1080 for YouTube, 1920 for TikTok/Shorts).',
          default: 1080,
        },
        narrationSegments: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional: Spoken voiceover paragraphs for scenes if the user wants AI voiceover.',
        },
        voice: {
          type: 'string',
          description: 'Optional neural TTS voice ID (default: vi-VN-NamMinhNeural).',
          default: 'vi-VN-NamMinhNeural',
        },
        bgmMood: {
          type: 'string',
          enum: ['epic-space', 'cyber-tech', 'warm-inspiring', 'mystery-deep', 'upbeat-energetic'],
          description: 'Optional mood for background audio.',
          default: 'epic-space',
        },
      },
      required: ['tsxCode'],
    },
  },
  {
    name: 'check_render_status',
    description:
      'Check if a rendered video or still frame is ready on the Cloud, and inspect real-time GitHub Actions step progress or compiler error logs for autonomous self-healing.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The jobId returned by render_remotion_video or preview_remotion_frame' },
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
          default: 20,
        },
      },
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
      if (toolName === 'get_remotion_ecosystem_guide') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: ECOSYSTEM_DOCS }],
          },
        };
      }

      if (toolName === 'preview_remotion_frame') {
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
                  text: `Pre-flight validation failed:\n${warnings.join('\n')}\nPlease fix and call preview_remotion_frame again.`,
                },
              ],
            },
          };
        }

        const jobId = randomJobId();
        const title = args.title || 'Still Preview';
        const frame = Number(args.frame || 0);
        const fps = Number(args.fps || 30);
        const width = Number(args.width || 1920);
        const height = Number(args.height || 1080);

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
                    status: 'still_dispatched_to_github_actions_cloud',
                    jobId,
                    capturedFrame: frame,
                    specs: `${width}x${height} @ ${fps}fps`,
                    previewImageUrl: stillUrl,
                    directDownloadUrl: downloadUrl,
                    message:
                      `Still frame #${frame} capture dispatched to Cloud! Call check_render_status with jobId "${jobId}" to verify when the PNG image is ready to inspect.`,
                  },
                  null,
                  2
                ),
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
        const title = args.title || 'Remotion Video';
        const fps = Number(args.fps || 30);
        const width = Number(args.width || 1920);
        const height = Number(args.height || 1080);
        const narrationSegments = Array.isArray(args.narrationSegments) ? args.narrationSegments : [];
        const durationInFrames = Number(args.durationInFrames || 300);

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
                    status: 'dispatched_to_github_actions_cloud',
                    jobId,
                    title,
                    specs: `${width}x${height} @ ${fps}fps (${durationInFrames} frames / ${(durationInFrames / fps).toFixed(1)}s)`,
                    watchPageUrl,
                    streamUrl,
                    galleryUrl,
                    directDownloadUrl: videoUrl,
                    notes: warnings.length > 0 ? warnings : undefined,
                    message:
                      'Render job dispatched to GitHub Actions Cloud (16GB RAM)! Share watchPageUrl with the user or call check_render_status with jobId to track progress.',
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
        let isStill = false;
        let errorLogText: string | undefined;
        let workflowInfo: any = null;

        while (Date.now() - start < 15000) {
          const check = await checkReleaseAssetsOnGitHub(env, jobId);
          ready = check.videoReady || check.stillReady;
          isStill = check.stillReady;
          errorLogText = check.errorLogText;
          if (ready || errorLogText) break;

          workflowInfo = await inspectGitHubWorkflowRun(env, jobId);
          if (workflowInfo?.conclusion === 'failure' || workflowInfo?.conclusion === 'cancelled') {
            break;
          }
          await new Promise((r) => setTimeout(r, 3000));
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
                      ? (isStill ? 'Still frame is ready to inspect!' : 'Video is completed and ready to watch inline or download!')
                      : isFailed
                      ? 'Render job failed on GitHub Actions. Read compilerErrorDetails above to see error trace, fix tsxCode and re-render.'
                      : `Job is actively rendering on GitHub Actions Cloud. Present URL to user; it tracks live progress and completes when ready!`,
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

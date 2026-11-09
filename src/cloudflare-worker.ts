export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  MCP_SECRET: string;
}

const ECOSYSTEM_DOCS = `
# REMOTION v4.0.541 — MASTER CREATIVE DIRECTOR, VIRAL CONTENT CREATOR & FULL ECOSYSTEM REFERENCE

You have **100% creative autonomy**. When the user gives you a topic (even a single short phrase), do NOT jump straight into writing short, generic code.
First, think deeply as a **World-Class Film Director, High-Retention Video Editor, and Viral Content Strategist (YouTube / TikTok / Reels / Documentary)**.

---

## I. CREATIVE DIRECTOR & CONTENT CREATOR MINDSET (ADAPTIVE & UNRESTRICTED)

### 1. Story-First Duration & Multi-Chapter Depth (No Artificial Short Limits!)
- **Let the Story Dictate the Duration**: Never default to a short 5–12s clip unless the user explicitly asks for a brief bumper/intro. When given a rich topic (e.g., space exploration, history, AI, finance, science, storytelling, brand documentary), design a **complete, deeply satisfying narrative journey** with as many acts, chapters, and scenes as the story truly deserves.
- **Smart Scalable Code Architecture for Long Videos**: To build rich multi-chapter videos (whether 30s, 60s, 2 minutes, or longer with 8–20+ scenes) cleanly within a single file, combine bespoke hero scenes with **data-driven scene arrays and modular visual engines** (where each chapter object defines its own title, narrative beats, metrics, color accent, visual archetype, and duration) rendered through \`<TransitionSeries>\` or \`<Series>\`.

### 2. Audience Retention Psychology & Viral Storytelling
- **The 0–3s Pattern Interrupt (The Hook)**: Immediately capture visual and auditory attention on Frame 0. Open a **Curiosity Gap (Open Loop)** — a compelling question, mind-blowing stat, or dramatic visual reveal that compels the viewer to keep watching.
- **The Heartbeat Pacing Technique**: Alternate naturally between high-energy kinetic sequences (fast visual shifts, bold numbers, snappy spring reveals) and atmospheric cinematic moments (deep space/3D vistas, smooth camera drift, emotional quotes).
- **Visual Micro-Shifts**: Keep the screen alive. Introduce subtle camera motion (slow dolly zoom, parallax pan, \`noise2D\` organic float), secondary callouts, progress indicators, or dynamic visual payoffs every few seconds so the viewer's eye is perpetually engaged.
- **Seamless Loop / Strong Payoff**: End with an unforgettable climax, actionable takeaway, or a seamless visual/narrative loop back to the opening hook to maximize rewatch rate and channel growth.

### 3. Platform & Channel Awareness
- **Vertical Short-Form (\`1080x1920\` TikTok / Reels / Shorts)**: Keep key typography and focal visuals away from platform UI dead-zones (right-side action buttons and bottom caption area). Use bold keyword highlighting (contrasting color/scale on trigger words) and punchy pacing.
- **Widescreen Long-Form / Documentary (\`1920x1080\` or \`3840x2160\` YouTube)**: Use cinematic chapter cards, rich data visualizations (animated timelines, evolving SVG paths, gauges, comparison grids, 3D models), and layered atmospheric depth (inspired by Kurzgesagt, Vox, Lemmino, Apple, MagnatesMedia).

---

## II. INSTALLED PACKAGES & EXACT API SIGNATURES (Remotion v4.0.541)

### 1. Core Frame & Physics Engine (\`remotion\`)
- \`useCurrentFrame()\`, \`useVideoConfig()\` -> \`{ width, height, fps, durationInFrames }\`
- \`AbsoluteFill\`, \`Sequence\`, \`Series\`, \`Loop\`, \`Freeze\`, \`Still\`
- \`interpolate(input, inputRange, outputRange, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing })\`
- \`interpolateColors(input, inputRange, colorOutputRange)\`
- \`spring({ frame, fps, from, to, durationInFrames, delay, config: { damping, stiffness, mass, overshootClamping } })\`
- \`Easing\` (\`Easing.bezier\`, \`Easing.inOut\`, \`Easing.out\`, \`Easing.cubic\`, \`Easing.exp\`, \`Easing.sin\`)
- \`random(seedStringOrNumber)\` -> Deterministic pseudo-random \`[0, 1)\` (ALWAYS use this instead of \`Math.random()\`)
- \`Audio\`, \`OffthreadVideo\`, \`Img\`

### 2. Scene Transitions (\`@remotion/transitions\`)
- \`import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';\`
- Presentations:
  - \`import { fade } from '@remotion/transitions/fade';\`
  - \`import { slide } from '@remotion/transitions/slide';\` // \`slide({ direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom' })\`
  - \`import { wipe } from '@remotion/transitions/wipe';\`
  - \`import { flip } from '@remotion/transitions/flip';\`
  - \`import { clockWipe } from '@remotion/transitions/clock-wipe';\` // \`clockWipe({ width, height })\`
  - \`import { iris } from '@remotion/transitions/iris';\` // \`iris({ width, height })\`
- Note: Total duration of a \`TransitionSeries\` equals the sum of sequence durations minus the sum of transition durations.

### 3. Built-in Sound Effects — Zero External Assets Needed (\`@remotion/sfx\`)
- \`import { whoosh, whip, pageTurn, mouseClick, shutterModern, shutterOld, ding, vineBoom, windowsXpError } from '@remotion/sfx';\`
- Usage: Wrap in \`<Sequence from={triggerFrame}><Audio src={whoosh} volume={0.35} /></Sequence>\` to synchronize audio with scene transitions, chapter reveals, data pops, and dramatic impacts.

### 4. Cinematic Light Leaks (\`@remotion/light-leaks\`)
- \`import { LightLeak } from '@remotion/light-leaks';\`
- Usage: \`<LightLeak seed={1} hueShift={120} durationInFrames={45} />\` (Supported on Cloud via \`--gl=swangle\`).

### 5. 2D Vector Shapes, SVG Path Evolution & Rounded Text (\`@remotion/shapes\`, \`@remotion/paths\`, \`@remotion/rounded-text-box\`)
- \`import { Circle, Rect, Triangle, Star, Polygon, Ellipse, Heart, Pie } from '@remotion/shapes';\`
- \`import { evolvePath, getLength, getPointAtLength, getTangentAtLength, interpolatePath } from '@remotion/paths';\`
  - \`const strokeProps = evolvePath(progress0to1, svgPathString);\` -> spread \`{...strokeProps}\` onto an \`<svg><path /></svg>\` for self-drawing trajectories, constellations, charts, and timelines.
- \`import { createRoundedTextBox } from '@remotion/rounded-text-box';\`

### 6. 3D WebGL & Three.js (\`@remotion/three\`, \`three\`, \`@react-three/fiber\`, \`@react-three/drei\`)
- \`import { ThreeCanvas } from '@remotion/three';\`
- \`import * as THREE from 'three';\`
- Always pass \`width={width} height={height}\` from \`useVideoConfig()\` to \`<ThreeCanvas width={width} height={height}>\`. Drive 3D object rotations/positions deterministically using \`useCurrentFrame()\`.

### 7. Organic Noise, Motion Blur & Transform Helpers (\`@remotion/noise\`, \`@remotion/motion-blur\`, \`@remotion/animation-utils\`)
- \`import { noise2D, noise3D, noise4D } from '@remotion/noise';\` -> Use for organic camera drift, floating space/particles, wave fields, and natural movement.
- \`import { Trail, CameraMotionBlur } from '@remotion/motion-blur';\`
- \`import { makeTransform, scale, translate, rotate, skew } from '@remotion/animation-utils';\`

### 8. Typography, Google Fonts & Layout Measurement (\`@remotion/google-fonts\`, \`@remotion/layout-utils\`)
- Load fonts with clean weight subsets to optimize loading speed:
  - \`import { loadFont } from '@remotion/google-fonts/BeVietnamPro'; const { fontFamily } = loadFont('normal', { weights: ['400', '600', '700', '800'], subsets: ['vietnamese', 'latin'], ignoreTooManyRequestsWarning: true });\`
  - Other fonts: \`@remotion/google-fonts/Inter\`, \`@remotion/google-fonts/Montserrat\`, \`@remotion/google-fonts/PlayfairDisplay\`, \`@remotion/google-fonts/SpaceGrotesk\`, \`@remotion/google-fonts/JetBrainsMono\`, \`@remotion/google-fonts/PlusJakartaSans\`.
- \`import { fitText, measureText, fillTextBox } from '@remotion/layout-utils';\`

### 9. Vector Icons (\`lucide-react\`)
- \`import { Sparkles, Rocket, Zap, Globe, Shield, Cpu, Layers, TrendingUp, CheckCircle2, ArrowRight, Play, Star, Award, Flame, Heart, Code2, BarChart3, Lock, Smartphone, Cloud, Compass, Orbit, Atom, Eye, Brain, Telescope } from 'lucide-react';\`

### 10. Captions, Media Utils, Rive, Lottie & Skia
- \`@remotion/captions\`, \`@remotion/media-utils\`, \`@remotion/lottie\`, \`@remotion/rive\`, \`@remotion/gif\`, \`@remotion/skia\`

---

## III. DETERMINISTIC ENGINE TRUTHS (CRITICAL FOR CLOUD PARALLEL RENDERING)
1. **Export Requirement**: Your code MUST export \`export const DynamicVideo: React.FC = () => { ... };\`.
2. **Frame-Driven Only**: Never use CSS \`transition\`, CSS \`animation\`, \`@keyframes\`, \`setTimeout\`, or \`requestAnimationFrame\`.
3. **Deterministic Randomness**: Never use \`Math.random()\`; always use \`random('unique-seed-' + index)\` from \`remotion\`.
4. **Safe Interpolation**: Always clamp \`interpolate()\` ranges (\`extrapolateLeft: 'clamp', extrapolateRight: 'clamp'\`) with strictly increasing \`inputRange\`.
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

// Lightweight non-restrictive pre-flight check to catch fatal engine mistakes early
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

async function dispatchGitHubRender(
  env: Env,
  jobId: string,
  title: string,
  tsxCode: string,
  durationInFrames: number,
  fps: number,
  width: number,
  height: number
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

async function isVideoReadyOnGitHub(env: Env, jobId: string): Promise<boolean> {
  const repo = env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/videos-store`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'User-Agent': 'Remotion-Cloudflare-MCP-Worker',
      },
    });
    if (!res.ok) return false;
    const data: any = await res.json();
    const assets: any[] = data?.assets || [];
    return assets.some((a) => a.name === `video-${jobId}.mp4` && a.state === 'uploaded');
  } catch {
    return false;
  }
}

// Inspect latest GitHub Actions workflow runs to give Gemini real-time step progress or compiler error feedback
async function inspectGitHubWorkflowRun(env: Env, jobId: string) {
  const repo = env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';
  try {
    const runsRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/render.yml/runs?per_page=5`,
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

    const latestRun = runs[0];
    const jobsRes = await fetch(latestRun.jobs_url, {
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
      runId: latestRun.id,
      status: latestRun.status,
      conclusion: latestRun.conclusion,
      htmlUrl: latestRun.html_url,
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
      'Get the complete Remotion v4.0.541 API reference, Creative Director & Viral Content Creator mindset (storytelling, retention pacing, multi-chapter architecture), and installed package signatures.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'render_remotion_video',
    description: `Render a custom Remotion video on GitHub Actions Cloud (4 vCPU, 16GB RAM, Remotion v4.0.541 full ecosystem, WebGL2 swangle enabled).
Think as a Master Creative Director & Content Creator: decide the narrative arc, chapter count, visual style, and durationInFrames freely based on the depth of the topic so the story feels complete and deeply engaging.
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
            'Complete TypeScript/React code for DynamicVideo.tsx exporting `export const DynamicVideo: React.FC = () => { ... }`',
        },
        durationInFrames: {
          type: 'number',
          description:
            'Total frames of the video (`seconds * fps`). Determined freely by you (the Director) to match the full narrative arc, chapter count, and emotional pacing of the story (supports up to 36000 frames).',
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
      'Dispatch up to 20 creative Remotion videos in parallel to GitHub Actions Cloud (each video runs on its own dedicated 4 vCPU, 16GB RAM Cloud runner simultaneously). Ideal for multi-episode series or channel batch production.',
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
              durationInFrames: {
                type: 'number',
                description: 'Total frames determined by the narrative depth of this episode/video.',
              },
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
      'Check if a rendered video is ready on the Cloud, and inspect real-time GitHub Actions step progress or build diagnostics.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The jobId returned by render_remotion_video' },
      },
      required: ['jobId'],
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
          version: '3.0.0',
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
        const durationInFrames = Number(args.durationInFrames || 600);
        const fps = Number(args.fps || 30);
        const width = Number(args.width || 1920);
        const height = Number(args.height || 1080);

        await dispatchGitHubRender(
          env,
          jobId,
          title,
          tsxCode,
          durationInFrames,
          fps,
          width,
          height
        );

        const watchPageUrl = `${baseUrl}/watch/${jobId}${secretQuery}`;
        const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretQuery}`;
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
                    directDownloadUrl: videoUrl,
                    notes: warnings.length > 0 ? warnings : undefined,
                    message:
                      'Render job dispatched to GitHub Actions Cloud (16GB RAM, Remotion v4.0.541)! Share watchPageUrl with the user or call check_render_status with jobId to track progress.',
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
          await dispatchGitHubRender(
            env,
            jobId,
            v.title || 'Batch Video',
            v.tsxCode,
            Number(v.durationInFrames || 600),
            Number(v.fps || 30),
            Number(v.width || 1920),
            Number(v.height || 1080)
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
        const jobId = String(args.jobId || '');
        const start = Date.now();
        let ready = false;
        let workflowInfo: any = null;

        while (Date.now() - start < 15000) {
          ready = await isVideoReadyOnGitHub(env, jobId);
          if (ready) break;
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
                      : workflowInfo?.conclusion === 'failure'
                      ? 'failed_on_github_actions'
                      : 'rendering_on_github_actions',
                    currentCloudStep: activeStep || workflowInfo?.status,
                    watchPageUrl,
                    streamUrl,
                    videoUrl,
                    cloudRunnerDiagnostics: workflowInfo,
                    message: ready
                      ? 'Video is completed and ready to watch inline or download!'
                      : workflowInfo?.conclusion === 'failure'
                      ? 'CRITICAL: The render job FAILED on GitHub Actions. Do NOT poll check_render_status anymore for this jobId. Inspect cloudRunnerDiagnostics.steps, fix the bug in your tsxCode, and call render_remotion_video with a new fixed version immediately!'
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

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id',
        },
      });
    }

    // Security check
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

    // Direct video streaming proxy route: /video/:jobId.mp4
    if (pathParts[0] === 'video' && pathParts[1]) {
      const rawId = pathParts[1].replace(/\.mp4$/, '').replace(/^video-/, '');
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
      // Cache at Cloudflare Edge for 7 days so re-watching or seeking uses 0 Worker requests!
      respHeaders.set('Cache-Control', 'public, max-age=604800, immutable');

      return new Response(ghRes.body, {
        status: ghRes.status,
        headers: respHeaders,
      });
    }

    // Watch page route: /watch/:jobId
    if (pathParts[0] === 'watch' && pathParts[1]) {
      const jobId = pathParts[1];
      const ready = await isVideoReadyOnGitHub(env, jobId);
      const secretSuffix = env.MCP_SECRET ? `?key=${encodeURIComponent(env.MCP_SECRET)}` : '';
      const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretSuffix}`;
      const downloadUrl = `https://github.com/${repo}/releases/download/videos-store/video-${jobId}.mp4`;

      if (!ready) {
        const wf = await inspectGitHubWorkflowRun(env, jobId);
        const isFailed = wf?.conclusion === 'failure' || wf?.conclusion === 'cancelled';
        const activeStep = wf?.steps?.find((s: any) => s.status === 'in_progress')?.name || 'Đang xử lý khung hình...';

        if (isFailed) {
          return new Response(
            `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Render Thất Bại (#${jobId})</title>
  <style>
    body { background: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; }
    .card { background: #1e1b2e; border: 1px solid #ef4444; padding: 28px; border-radius: 14px; max-width: 560px; }
    h2 { color: #f87171; margin-top: 0; }
    a { color: #38bdf8; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h2>⚠️ Bản render #${jobId} gặp lỗi trên Cloud</h2>
    <p>Tiến trình đã tự động dừng (không lặp vô hạn). Hãy bảo Gemini kiểm tra lỗi và gửi bản render mới.</p>
    <p><a href="${wf?.htmlUrl || `https://github.com/${repo}/actions`}" target="_blank">Xem chi tiết nhật ký lỗi trên GitHub Actions ↗</a></p>
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
  <h2>⏳ Đang render video trên GitHub Actions Cloud (16GB RAM)...</h2>
  <div class="step-badge">⚡ Bước hiện tại: ${activeStep}</div>
  <p>Mã công việc: <strong>#${jobId}</strong> — Trang này tự động kiểm tra mỗi 12 giây (hỗ trợ cả video dài) và sẽ tự phát video ngay khi hoàn tất!</p>
  <p><a href="${wf?.htmlUrl || `https://github.com/${repo}/actions`}" target="_blank">Xem tiến độ trực tiếp trên GitHub Actions ↗</a></p>
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
  </style>
</head>
<body>
  <h2>🎬 Video Remotion (#${jobId})</h2>
  <video src="${streamUrl}" controls autoplay loop playsinline></video>
  <div class="actions">
    <a href="${downloadUrl}" download="remotion-${jobId}.mp4">⬇ Tải xuống MP4</a>
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

      return new Response(JSON.stringify({ status: 'ok', transport: 'streamable-http', version: '3.0.0' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Home status page
    return new Response(
      JSON.stringify({
        status: 'online_24_7',
        version: '3.0.0 (Creative Director & Channel Growth Intelligence + Remotion 4.0.541)',
        platform: 'Cloudflare Workers + GitHub Actions (16GB RAM Cloud)',
        repository: repo,
        security: env.MCP_SECRET ? 'PROTECTED 🔒' : 'OPEN',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
};

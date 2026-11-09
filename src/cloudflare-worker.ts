export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  MCP_SECRET: string;
}

const ECOSYSTEM_DOCS = `
# REMOTION v4.0.541 — FULL-STACK AI VIDEO STUDIO (v4.0)
## (Master Creative Director + Neural AI Voiceover + Cinematic BGM + Real Visual Media + Full Ecosystem)

You have **100% creative autonomy**. When the user gives you a topic (even a single short phrase), think and act as a **World-Class Film Director, High-Retention Editor, Screenwriter, and Viral Content Strategist (YouTube / TikTok / Reels / Documentary)**.

---

## I. FULL-STACK AI AUDIO STUDIO (NEURAL VOICEOVER + BGM + SFX)

Unlike basic motion graphics, your videos should feel like **complete, broadcast-ready productions** with **Voiceover Narration + Background Music + Sound Effects + Synchronized Subtitles**:

### 1. Automatic Neural AI Voiceover (\`narrationSegments\` & \`voice\`)
When calling \`render_remotion_video\`, pass the \`narrationSegments\` array (one spoken script string per scene/chapter) and \`voice\`:
- **Vietnamese Neural Voices**:
  - \`"vi-VN-NamMinhNeural"\`: Deep, authoritative, engaging male voice (Best for Science, Space, Tech, History, Finance, Documentaries).
  - \`"vi-VN-HoaiMyNeural"\`: Clear, expressive, natural female voice (Best for Storytelling, Lifestyle, Education, TikTok/Reels).
- **English Neural Voices**:
  - \`"en-US-AndrewMultilingualNeural"\`, \`"en-US-BrianMultilingualNeural"\`, \`"en-US-AvaMultilingualNeural"\`.
- **How it works in your \`tsxCode\`**:
  - The Cloud studio automatically synthesizes \`narrationSegments[0]\` -> \`staticFile('voice-0.mp3')\`, \`narrationSegments[1]\` -> \`staticFile('voice-1.mp3')\`, \`narrationSegments[2]\` -> \`staticFile('voice-2.mp3')\`, etc.!
  - Inside each Scene \`i\` (0-indexed), simply include:
    \`<Audio src={staticFile('voice-0.mp3')} volume={1} />\` (for Scene 0), \`<Audio src={staticFile('voice-1.mp3')} volume={1} />\` (for Scene 1), etc., using \`import { Audio, staticFile } from 'remotion';\`!
  - **Duration Matching Rule**: In Vietnamese/English, normal speech is ~3 words per second (~15–18 words per 5 seconds / 150 frames). Make sure each scene's frame duration is long enough for its \`narrationSegments[i]\` text to finish speaking naturally (plus a ~0.8s breathing pause)!

### 2. Automatic Copyright-Free Background Music (\`bgmMood\` & \`staticFile('bgm.mp3')\`)
- The Cloud studio automatically generates \`staticFile('bgm.mp3')\` tailored to your chosen \`bgmMood\` (\`"epic-space"\`, \`"cyber-tech"\`, \`"warm-inspiring"\`, \`"mystery-deep"\`, or \`"upbeat-energetic"\`).
- At the root of \`DynamicVideo\`, always include:
  \`<Audio src={staticFile('bgm.mp3')} volume={0.18} />\` so the entire video has a cohesive atmospheric musical bed underneath the voiceover!

### 3. Synchronized Sound Effects (\`@remotion/sfx\`)
- \`import { whoosh, whip, pageTurn, mouseClick, shutterModern, shutterOld, ding, vineBoom } from '@remotion/sfx';\`
- Layer \`<Audio src={whoosh} volume={0.3} />\` on transitions and \`ding\` / \`mouseClick\` on key visual reveals.

---

## II. CREATIVE DIRECTOR & VIRAL CONTENT CREATOR MINDSET

1. **Story-First Duration & Multi-Chapter Depth**:
   - Let the depth of the topic determine the number of chapters/scenes and total \`durationInFrames\`.
   - Use **Data-Driven Scene Arrays + Modular Visual Archetypes** so you can effortlessly craft 6 to 15+ rich chapters in clean, concise code.
2. **Retention Psychology**:
   - **0–3s Hook**: Start with a powerful visual & verbal Curiosity Gap.
   - **Dynamic Captions / Subtitle Bar**: Display the spoken narration (or key highlighted phrases) at the bottom safe-zone of each scene so viewers can both listen and read along!
   - **Rich Visual Variety**: Combine 2D/3D geometry (\`@remotion/shapes\`, \`@remotion/paths\`, \`@remotion/three\`), animated data charts/counters, vector icons (\`lucide-react\`), and real-world/AI visual imagery (\`<Img src="https://image.pollinations.ai/prompt/{encoded_english_visual_prompt}?width=1280&height=720&nologo=true" />\` with Ken Burns slow zoom & dark gradient overlay when real photography/art enhances the scene).

---

## III. INSTALLED PACKAGES & EXACT API SIGNATURES (Remotion v4.0.541)

1. **Core (\`remotion\`)**: \`useCurrentFrame\`, \`useVideoConfig\`, \`AbsoluteFill\`, \`Sequence\`, \`Series\`, \`Loop\`, \`Freeze\`, \`interpolate\`, \`interpolateColors\`, \`spring\`, \`Easing\`, \`random\`, \`Audio\`, \`OffthreadVideo\`, \`Img\`, \`staticFile\`.
2. **Transitions (\`@remotion/transitions\`)**: \`TransitionSeries\`, \`linearTiming\`, \`springTiming\`, plus \`@remotion/transitions/fade\`, \`slide\`, \`wipe\`, \`flip\`, \`clock-wipe\`, \`iris\`.
3. **SFX (\`@remotion/sfx\`)**: \`whoosh\`, \`whip\`, \`pageTurn\`, \`mouseClick\`, \`shutterModern\`, \`shutterOld\`, \`ding\`, \`vineBoom\`, \`windowsXpError\`.
4. **Light Leaks (\`@remotion/light-leaks\`)**: \`LightLeak\`.
5. **Shapes & Paths (\`@remotion/shapes\`, \`@remotion/paths\`, \`@remotion/rounded-text-box\`)**: \`Circle\`, \`Rect\`, \`Triangle\`, \`Star\`, \`Polygon\`, \`Ellipse\`, \`Heart\`, \`Pie\`, \`evolvePath\`, \`getLength\`, \`getPointAtLength\`, \`interpolatePath\`, \`createRoundedTextBox\`.
6. **3D WebGL (\`@remotion/three\`, \`three\`, \`@react-three/fiber\`, \`@react-three/drei\`)**: \`ThreeCanvas\`.
7. **Noise, Motion Blur & Transforms (\`@remotion/noise\`, \`@remotion/motion-blur\`, \`@remotion/animation-utils\`)**: \`noise2D\`, \`noise3D\`, \`Trail\`, \`CameraMotionBlur\`, \`makeTransform\`, \`scale\`, \`translate\`, \`rotate\`.
8. **Google Fonts & Layout (\`@remotion/google-fonts\`, \`@remotion/layout-utils\`)**:
   - \`import { loadFont } from '@remotion/google-fonts/BeVietnamPro'; const { fontFamily } = loadFont('normal', { weights: ['400', '600', '700', '800'], subsets: ['vietnamese', 'latin'], ignoreTooManyRequestsWarning: true });\`
   - \`fitText\`, \`measureText\`, \`fillTextBox\`.
9. **Icons (\`lucide-react\`)**: \`Sparkles\`, \`Rocket\`, \`Zap\`, \`Globe\`, \`Shield\`, \`Cpu\`, \`Layers\`, \`TrendingUp\`, \`CheckCircle2\`, \`ArrowRight\`, \`Play\`, \`Star\`, \`Award\`, \`Flame\`, \`Heart\`, \`Code2\`, \`BarChart3\`, \`Lock\`, \`Smartphone\`, \`Cloud\`, \`Compass\`, \`Orbit\`, \`Atom\`, \`Eye\`, \`Brain\`, \`Telescope\`.

---

## IV. DETERMINISTIC ENGINE TRUTHS
1. Must export \`export const DynamicVideo: React.FC = () => { ... };\`.
2. Never use CSS \`transition\`, \`animation\`, \`@keyframes\`, \`setTimeout\`, or \`Math.random()\` (always use \`random('seed')\` from \`remotion\`).
3. Always clamp \`interpolate()\` ranges (\`extrapolateLeft: 'clamp', extrapolateRight: 'clamp'\`).
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
      'Get the complete Remotion v4.0.541 Full-Stack AI Studio guide (Neural AI Voiceover `voice-0.mp3`, Cinematic BGM `bgm.mp3`, Real Imagery, Creative Director mindset, and all 26 package signatures).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'render_remotion_video',
    description: `Render a complete broadcast-ready Remotion video on GitHub Actions Cloud (16GB RAM, Remotion v4.0.541, Neural AI Voiceover Edge-TTS, Cinematic BGM, WebGL2 swangle).
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
            'Complete TypeScript/React code for DynamicVideo.tsx exporting `export const DynamicVideo: React.FC = () => { ... }`. Remember to include `<Audio src={staticFile("bgm.mp3")} volume={0.18} />` at root and `<Audio src={staticFile("voice-0.mp3")} volume={1} />` (etc.) in each scene when using `narrationSegments`!',
        },
        durationInFrames: {
          type: 'number',
          description:
            'Total frames of the video (`seconds * fps`). Determined freely by you (the Director) to match the full narrative arc and spoken voiceover length.',
        },
        narrationSegments: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Spoken voiceover script for each scene/chapter in order. Segment 0 is automatically synthesized into `staticFile("voice-0.mp3")`, Segment 1 into `staticFile("voice-1.mp3")`, etc.',
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
            'Mood for automatic copyright-free background music synthesized into `staticFile("bgm.mp3")`.',
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
      'Dispatch up to 20 complete Remotion videos (with AI Voiceover & BGM) in parallel to GitHub Actions Cloud.',
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
          version: '4.0.0',
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
        const title = args.title || 'Remotion Studio Video';
        const durationInFrames = Number(args.durationInFrames || 600);
        const fps = Number(args.fps || 30);
        const width = Number(args.width || 1920);
        const height = Number(args.height || 1080);
        const audioConfig = {
          voice: args.voice || 'vi-VN-NamMinhNeural',
          bgmMood: args.bgmMood || 'epic-space',
          narrationSegments: Array.isArray(args.narrationSegments) ? args.narrationSegments : [],
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
                    },
                    watchPageUrl,
                    streamUrl,
                    directDownloadUrl: videoUrl,
                    notes: warnings.length > 0 ? warnings : undefined,
                    message:
                      'Render job (with Neural AI Voiceover & BGM) dispatched to GitHub Actions Cloud! Share watchPageUrl with the user or call check_render_status with jobId to track progress.',
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
            Number(v.height || 1080),
            {
              voice: v.voice || 'vi-VN-NamMinhNeural',
              bgmMood: v.bgmMood || 'epic-space',
              narrationSegments: Array.isArray(v.narrationSegments) ? v.narrationSegments : [],
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
      respHeaders.set('Cache-Control', 'public, max-age=604800, immutable');

      return new Response(ghRes.body, {
        status: ghRes.status,
        headers: respHeaders,
      });
    }

    // Watch page route: /watch/:jobId
    if (pathParts[0] === 'watch' && pathParts[1]) {
      const jobId = pathParts[1];
      const check = await checkReleaseAssetsOnGitHub(env, jobId);
      const ready = check.videoReady;
      const secretSuffix = env.MCP_SECRET ? `?key=${encodeURIComponent(env.MCP_SECRET)}` : '';
      const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretSuffix}`;
      const downloadUrl = `https://github.com/${repo}/releases/download/videos-store/video-${jobId}.mp4`;

      if (!ready) {
        const wf = await inspectGitHubWorkflowRun(env, jobId);
        const isFailed =
          Boolean(check.errorLogText) ||
          wf?.conclusion === 'failure' ||
          wf?.conclusion === 'cancelled';
        const activeStep =
          wf?.steps?.find((s: any) => s.status === 'in_progress')?.name ||
          'Đang xử lý khung hình & âm thanh...';

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
    ${check.errorLogText ? `<pre>${check.errorLogText.replace(/</g, '&lt;')}</pre>` : ''}
    <p><a href="${wf?.htmlUrl || `https://github.com/${repo}/actions`}" target="_blank">Xem chi tiết trên GitHub Actions ↗</a></p>
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
  <h2>⏳ Đang thu âm giọng đọc AI, phối nhạc nền & render trên Cloud (16GB RAM)...</h2>
  <div class="step-badge">⚡ Bước hiện tại: ${activeStep}</div>
  <p>Mã công việc: <strong>#${jobId}</strong> — Trang này tự động kiểm tra mỗi 12 giây và sẽ tự phát video ngay khi hoàn tất!</p>
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

      return new Response(JSON.stringify({ status: 'ok', transport: 'streamable-http', version: '4.0.0' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Home status page
    return new Response(
      JSON.stringify({
        status: 'online_24_7',
        version: '4.0.0 (Full-Stack AI Video Studio: Neural TTS + BGM + Full Remotion 4.0.541)',
        platform: 'Cloudflare Workers + GitHub Actions (16GB RAM Cloud)',
        repository: repo,
        security: env.MCP_SECRET ? 'PROTECTED 🔒' : 'OPEN',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
};

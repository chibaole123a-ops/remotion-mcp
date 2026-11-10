import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const PORT = Number(process.env.PORT || 3456);
const MCP_SECRET = process.env.MCP_SECRET || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'chibaole123a-ops/remotion-mcp';

function getPublicBaseUrl(req?: express.Request): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  if (req) {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
    if (host) return `${proto}://${host}`;
  }
  return `http://localhost:${PORT}`;
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

async function triggerGitHubActionsRender(
  jobId: string,
  title: string,
  tsxCode: string,
  durationInFrames: number,
  fps: number,
  width: number,
  height: number,
  audioConfig: any = {},
  mode: 'video' | 'still' = 'video',
  stillFrame = 0
) {
  if (!GITHUB_TOKEN) {
    throw new Error(
      'Missing GITHUB_TOKEN environment variable on MCP Server. Please set GITHUB_TOKEN so it can dispatch jobs to GitHub Actions.'
    );
  }

  const tsxCodeBase64 = Buffer.from(tsxCode, 'utf-8').toString('base64');
  const audioConfigBase64 = Buffer.from(JSON.stringify(audioConfig || {}), 'utf-8').toString(
    'base64'
  );

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/render.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Remotion-Cloud-MCP-Server',
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
          tsxCodeBase64,
          audioConfigBase64,
          callbackUrl: '',
          mode,
          stillFrame: String(stillFrame),
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errText}`);
  }
}

async function listReleaseVideosOnGitHub(baseUrl: string) {
  const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Remotion-Cloud-MCP-Server',
    };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/videos-store`, {
      headers,
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const assets: any[] = data?.assets || [];

    return assets
      .filter(
        (a) =>
          typeof a.name === 'string' &&
          a.name.startsWith('video-') &&
          a.name.endsWith('.mp4') &&
          a.state === 'uploaded'
      )
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      )
      .map((a) => {
        const jobId = a.name.replace(/^video-/, '').replace(/\.mp4$/, '');
        return {
          jobId,
          fileName: a.name,
          sizeMB: Number(((a.size || 0) / (1024 * 1024)).toFixed(2)),
          createdAt: a.updated_at || a.created_at,
          watchPageUrl: `${baseUrl}/watch/${jobId}${secretSuffix}`,
          streamUrl: `${baseUrl}/video/${jobId}.mp4${secretSuffix}`,
          directDownloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/videos-store/${a.name}`,
        };
      });
  } catch {
    return [];
  }
}

async function checkReleaseAssetsOnGitHub(
  jobId: string
): Promise<{ videoReady: boolean; stillReady: boolean; errorLogText?: string; stillBase64?: string }> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Remotion-Cloud-MCP-Server',
    };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/videos-store`, {
      headers,
    });
    if (!res.ok) return { videoReady: false, stillReady: false };
    const data: any = await res.json();
    const assets: any[] = data?.assets || [];

    const videoReady = assets.some(
      (a) => a.name === `video-${jobId}.mp4` && a.state === 'uploaded'
    );
    const stillAsset = assets.find(
      (a) => a.name === `still-${jobId}.png` && a.state === 'uploaded'
    );
    const stillReady = Boolean(stillAsset);
    const errAsset = assets.find((a) => a.name === `error-${jobId}.txt` && a.state === 'uploaded');

    let stillBase64: string | undefined;
    if (stillAsset) {
      try {
        const stillUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/still-${jobId}.png`;
        const stillRes = await fetch(stillUrl, {
          headers,
          redirect: 'follow',
        });
        if (stillRes.ok) {
          const arrBuf = await stillRes.arrayBuffer();
          stillBase64 = Buffer.from(arrBuf).toString('base64');
        }
      } catch {}
    }

    let errorLogText: string | undefined;
    if (errAsset) {
      const errUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/error-${jobId}.txt`;
      const errRes = await fetch(errUrl, {
        headers,
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

async function inspectGitHubWorkflowRun(jobId: string) {
  if (!GITHUB_TOKEN) return null;
  try {
    const runsRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/render.yml/runs?per_page=15`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'Remotion-Cloud-MCP-Server',
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
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Remotion-Cloud-MCP-Server',
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

function createMcpServerInstance(baseUrl: string) {
  const server = new McpServer({
    name: 'remotion-cloud-mcp',
    version: '6.1.0',
  });

  server.tool(
    'remotion',
    `REMOTION ECOSYSTEM STUDIO: Pure, unconstrained video rendering engine powered by the complete Remotion v4.0.542 ecosystem (Three.js 3D, Rough Notation annotations, Transitions, Shapes, SVG Paths, Noise, Google Fonts, and Physics Springs).\n` +
      `You have 100% creative freedom to write any Remotion React composition based on the user's request.\n` +
      `CRITICAL RULES FOR AGENT:\n` +
      `1. NEVER print or paste raw tsxCode into the chat conversation. Send it directly to this tool.\n` +
      `2. VISUAL PREVIEW & SELF-INSPECTION (AGENT PROTOCOL):\n` +
      `   - Specify the "frame" parameter (e.g. frame: 0, 45, 60, 90) to capture and inspect a single frame.\n` +
      `   - If the returned payload has an image block (type: "image"), inspect the image with your Vision capabilities immediately.\n` +
      `   - If the returned status is "frame_dispatched_rendering" (Cloud runner is taking ~30-40s to boot), YOU MUST NOT tell the user "I cannot view the image". INSTEAD, YOU MUST autonomously call "get_task_status(jobId)" in your very next action to retrieve the image block into your vision context.\n` +
      `3. FULL VIDEO RENDER: When "frame" is omitted, the full video will be rendered on Cloud (16GB RAM). Follow up with "get_task_status" to track until ready.\n` +
      `4. Present output cleanly in markdown:\n` +
      `   - Full video: 🎬 [Xem Video Trực Tiếp](\${watchPageUrl}) | 📥 [Tải Video MP4](\${directDownloadUrl})\n` +
      `   - Single frame: ![Preview Frame #\${frame}](\${previewImageUrl})\n${ECOSYSTEM_DOCS}`,
    {
      title: z.string().default('Remotion Video').describe('Title of the video composition'),
      tsxCode: z
        .string()
        .describe(
          'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`. Pass directly to tool parameter.'
        ),
      durationInFrames: z
        .number()
        .int()
        .min(15)
        .max(36000)
        .default(300)
        .describe('Total duration in frames (seconds * fps). You freely decide this based on user request or pacing.'),
      fps: z.number().int().default(30).describe('Frames per second (default 30).'),
      width: z.number().int().default(1920).describe('Width in pixels (1920 for landscape, 1080 for portrait TikTok/Shorts).'),
      height: z.number().int().default(1080).describe('Height in pixels (1080 for landscape, 1920 for portrait TikTok/Shorts).'),
      frame: z
        .number()
        .int()
        .optional()
        .describe('Optional: Specific frame index if user only wants to capture a fast static preview PNG. If omitted, the entire video will be rendered.'),
    },
    async ({ title, tsxCode, durationInFrames, fps, width, height, frame }) => {
      const warnings = validateTsxCode(tsxCode);
      if (warnings.some((w) => w.startsWith('CRITICAL:'))) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Pre-flight validation failed:\n${warnings.join('\n')}\nPlease fix and call remotion again.`,
            },
          ],
        };
      }

      const jobId = randomUUID().slice(0, 8);
      const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';
      const isFramePreview = typeof frame === 'number';

      if (isFramePreview) {
        const stillUrl = `${baseUrl}/still/${jobId}.png${secretSuffix}`;
        const directDownloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/still-${jobId}.png`;

        try {
          await triggerGitHubActionsRender(
            jobId,
            title || 'Remotion Frame Preview',
            tsxCode,
            Math.max((frame || 0) + 1, 30),
            fps,
            width,
            height,
            {},
            'still',
            frame || 0
          );

          // Smart Auto-Wait: Poll up to 22 seconds so Gemini gets the image directly in 1 turn
          const waitStart = Date.now();
          let stillReady = false;
          let stillBase64: string | undefined;

          while (Date.now() - waitStart < 22000) {
            const check = await checkReleaseAssetsOnGitHub(jobId);
            if (check.stillReady) {
              stillReady = true;
              stillBase64 = check.stillBase64;
              break;
            }
            if (check.errorLogText) break;
            await new Promise((r) => setTimeout(r, 2500));
          }

          const contentBlocks: any[] = [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: stillReady ? 'frame_captured_ready' : 'frame_dispatched_rendering',
                  jobId,
                  capturedFrame: frame,
                  specs: `${width}x${height} @ ${fps}fps`,
                  previewImageUrl: stillUrl,
                  directDownloadUrl,
                  hasVisionImage: Boolean(stillReady && stillBase64),
                  instructionsForAgent: stillReady
                    ? `Examine the image block attached below. Evaluate visual composition, contrast, font readability, 3D elements, and particle balance. If adjustments are needed, refine tsxCode and test another frame; if satisfied, call remotion without "frame" to render the complete video.`
                    : `Frame capture is still processing on Cloud runner. Call get_task_status with jobId "${jobId}" after a few moments to receive the image.`,
                  message: stillReady
                    ? `Remotion frame #${frame} captured successfully! Inspect the visual image below.`
                    : `Remotion frame #${frame} dispatched to Cloud runner. If not completed in this turn, check get_task_status.`,
                },
                null,
                2
              ),
            },
          ];

          if (stillReady && stillBase64) {
            contentBlocks.push({
              type: 'image',
              data: stillBase64,
              mimeType: 'image/png',
            });
          }

          return {
            content: contentBlocks,
          };
        } catch (err: any) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Failed to dispatch still frame capture: ${err?.message || String(err)}`,
              },
            ],
          };
        }
      }

      // Full Video Render
      const directDownloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`;
      const watchPageUrl = `${baseUrl}/watch/${jobId}${secretSuffix}`;
      const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretSuffix}`;
      const galleryUrl = `${baseUrl}/gallery${secretSuffix}`;

      try {
        await triggerGitHubActionsRender(
          jobId,
          title,
          tsxCode,
          durationInFrames,
          fps,
          width,
          height,
          {},
          'video',
          0
        );

        return {
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
                  directDownloadUrl,
                  notes: warnings.length > 0 ? warnings : undefined,
                  instructionsForAgent: `Present links cleanly in markdown: 🎬 [Xem Video Trực Tiếp](${watchPageUrl}) | 📥 [Tải Video MP4](${directDownloadUrl}). Do NOT print raw long URLs.`,
                  message: 'Render job dispatched to GitHub Actions Cloud (16GB RAM)! Present links to user or call get_task_status with jobId to track progress.',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to dispatch render job: ${err?.message || String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'get_task_status',
    'SYSTEM INFRASTRUCTURE TOOL: Track real-time background Cloud execution (GitHub Actions runner, build steps, completion status, or watch links) for any dispatched job.',
    {
      jobId: z.string().describe('The unique jobId returned by the remotion tool'),
    },
    async ({ jobId: rawJobId }) => {
      const jobId = sanitizeJobId(rawJobId);
      const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';
      const start = Date.now();
      let ready = false;
      let isStill = false;
      let errorLogText: string | undefined;
      let workflowInfo: any = null;

      let stillBase64: string | undefined;

      while (Date.now() - start < 15000) {
        const check = await checkReleaseAssetsOnGitHub(jobId);
        ready = check.videoReady || check.stillReady;
        isStill = check.stillReady;
        errorLogText = check.errorLogText;
        stillBase64 = check.stillBase64;
        if (ready || errorLogText) break;

        workflowInfo = await inspectGitHubWorkflowRun(jobId);
        if (workflowInfo?.conclusion === 'failure' || workflowInfo?.conclusion === 'cancelled') {
          break;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      if (!ready && !workflowInfo) {
        workflowInfo = await inspectGitHubWorkflowRun(jobId);
      }

      const stillUrl = `${baseUrl}/still/${jobId}.png${secretSuffix}`;
      const watchPageUrl = `${baseUrl}/watch/${jobId}${secretSuffix}`;
      const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretSuffix}`;
      const videoUrl = isStill
        ? `https://github.com/${GITHUB_REPO}/releases/download/videos-store/still-${jobId}.png`
        : `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`;

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
                ? 'Render job failed on GitHub Actions. Read compilerErrorDetails above to see error trace, fix tsxCode and re-render.'
                : `Job is actively rendering on GitHub Actions Cloud. Present URL to user; it tracks live progress and completes when ready!`,
            },
            null,
            2
          ),
        },
      ];

      if (isStill && ready && stillBase64) {
        contentBlocks.push({
          type: 'image',
          data: stillBase64,
          mimeType: 'image/png',
        });
      }

      return {
        content: contentBlocks,
      };
    }
  );

  server.tool(
    'inspect_task_logs',
    'SYSTEM DIAGNOSTICS & SELF-HEALING TOOL: Retrieve detailed compiler logs, TypeScript error traces, or runner failures for autonomous debugging and self-healing.',
    {
      jobId: z.string().describe('The unique jobId to inspect'),
    },
    async ({ jobId: rawJobId }) => {
      const jobId = sanitizeJobId(rawJobId);
      const check = await checkReleaseAssetsOnGitHub(jobId);
      const workflowInfo = await inspectGitHubWorkflowRun(jobId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                jobId,
                hasErrorLog: Boolean(check.errorLogText),
                compilerErrorDetails:
                  check.errorLogText ||
                  'No compile-time error log found. Runner may still be in progress or completed without syntax error.',
                runnerConclusion: workflowInfo?.conclusion || workflowInfo?.status || 'unknown',
                failedSteps: workflowInfo?.steps?.filter((s: any) => s.conclusion === 'failure') || [],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'list_system_assets',
    'SYSTEM ASSET & STORAGE TOOL: List all rendered MP4 videos and assets currently stored in the Cloud Release CDN repository.',
    {
      limit: z.number().int().min(1).max(100).default(20).describe('Maximum number of items to retrieve'),
    },
    async ({ limit }) => {
      const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';
      const videos = await listReleaseVideosOnGitHub(baseUrl);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalStoredVideos: videos.length,
                galleryUrl: `${baseUrl}/gallery${secretSuffix}`,
                videos: videos.slice(0, limit),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}

function checkAuth(req: express.Request, res: express.Response): boolean {
  if (!MCP_SECRET) return true;
  const keyFromQuery = req.query.key as string | undefined;
  const keyFromParam = req.params.secret as string | undefined;
  if (keyFromQuery === MCP_SECRET || keyFromParam === MCP_SECRET) return true;
  res.status(401).json({ error: 'Unauthorized: Invalid or missing MCP_SECRET' });
  return false;
}

export function startApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));

  // Direct still frame streaming proxy route: /still/:jobId.png
  app.get('/still/:file', async (req, res) => {
    if (!checkAuth(req, res)) return;
    const rawId = sanitizeJobId(req.params.file.replace(/\.png$/, '').replace(/^still-/, ''));
    const fileName = `still-${rawId}.png`;
    const ghUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/${fileName}`;

    try {
      const ghRes = await fetch(ghUrl, {
        headers: { 'User-Agent': 'Remotion-Cloud-MCP-Server' },
        redirect: 'follow',
      });

      if (!ghRes.ok || !ghRes.body) {
        res.status(404).send('Still frame not found');
        return;
      }

      res.status(ghRes.status);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');

      Readable.fromWeb(ghRes.body as any).pipe(res);
    } catch {
      res.status(502).send('Failed to stream still frame');
    }
  });

  // Cloud Video Gallery route: /gallery
  app.get('/gallery', async (req, res) => {
    if (!checkAuth(req, res)) return;
    const baseUrl = getPublicBaseUrl(req);
    const videos = await listReleaseVideosOnGitHub(baseUrl);
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

    res.send(`<!DOCTYPE html>
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
</html>`);
  });

  // Direct video streaming proxy route: /video/:jobId.mp4
  app.get('/video/:file', async (req, res) => {
    if (!checkAuth(req, res)) return;
    const rawId = sanitizeJobId(req.params.file.replace(/\.mp4$/, '').replace(/^video-/, ''));
    const fileName = `video-${rawId}.mp4`;
    const ghUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/${fileName}`;
    const rangeHeader = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Remotion-Cloud-MCP-Server',
    };
    if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

    try {
      const ghRes = await fetch(ghUrl, {
        headers: fetchHeaders,
        redirect: 'follow',
      });

      if (!ghRes.ok || !ghRes.body) {
        res.status(404).send('Video not found');
        return;
      }

      res.status(ghRes.status);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      const contentRange = ghRes.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      const contentLength = ghRes.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      Readable.fromWeb(ghRes.body as any).pipe(res);
    } catch {
      res.status(502).send('Failed to stream video');
    }
  });

  // Smart Watch Page
  app.get('/watch/:jobId', async (req, res) => {
    if (!checkAuth(req, res)) return;
    const jobId = sanitizeJobId(req.params.jobId);
    const baseUrl = getPublicBaseUrl(req);
    const check = await checkReleaseAssetsOnGitHub(jobId);
    const ready = check.videoReady;
    const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';
    const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretSuffix}`;
    const galleryUrl = `${baseUrl}/gallery${secretSuffix}`;
    const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`;

    if (!ready) {
      const wf = await inspectGitHubWorkflowRun(jobId);
      const isFailed =
        Boolean(check.errorLogText) ||
        wf?.conclusion === 'failure' ||
        wf?.conclusion === 'cancelled';
      const activeStep = escapeHtml(
        wf?.steps?.find((s: any) => s.status === 'in_progress')?.name ||
          'Đang xử lý khung hình Remotion...'
      );
      const safeHtmlUrl = escapeHtml(wf?.htmlUrl || `https://github.com/${GITHUB_REPO}/actions`);

      if (isFailed) {
        res.send(`<!DOCTYPE html>
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
</html>`);
        return;
      }

      res.send(`<!DOCTYPE html>
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
</html>`);
      return;
    }

    res.send(`<!DOCTYPE html>
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
</html>`);
  });

  const transports = new Map<string, StreamableHTTPServerTransport>();

  const handleMcp = async (req: express.Request, res: express.Response) => {
    if (!checkAuth(req, res)) return;
    try {
      const baseUrl = getPublicBaseUrl(req);
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.set(sid, transport);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) transports.delete(transport.sessionId);
      };

      const mcpServer = createMcpServerInstance(baseUrl);
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Internal MCP error' });
      }
    }
  };

  app.all('/mcp', handleMcp);
  app.all('/mcp/:secret', handleMcp);

  app.get('/', (req, res) => {
    const baseUrl = getPublicBaseUrl(req);
    res.json({
      status: 'online',
      version: '6.1.0 (Antigravity-Style Agentic Remotion Studio)',
      mode: 'GitHub Actions Cloud Renderer (16GB RAM)',
      repository: GITHUB_REPO,
      mcpEndpoint: `${baseUrl}/mcp${MCP_SECRET ? '/<YOUR_SECRET>' : ''}`,
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Pure Remotion Cloud MCP v6.1.0 listening on port ${PORT}`);
  });
}

if (process.argv[1]?.endsWith('server.ts')) {
  startApp();
}

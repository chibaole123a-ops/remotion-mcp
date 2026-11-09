import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
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

interface CloudRenderJob {
  id: string;
  title: string;
  status: 'dispatched' | 'rendering' | 'completed' | 'failed';
  videoUrl?: string;
  watchPageUrl?: string;
  error?: string;
  createdAt: number;
}

const jobs = new Map<string, CloudRenderJob>();

async function triggerGitHubActionsRender(
  jobId: string,
  title: string,
  tsxCode: string,
  durationInFrames: number,
  fps: number,
  width: number,
  height: number,
  baseUrl: string
) {
  if (!GITHUB_TOKEN) {
    throw new Error(
      'Missing GITHUB_TOKEN environment variable on MCP Server. Please set GITHUB_TOKEN so it can dispatch jobs to GitHub Actions.'
    );
  }

  const tsxCodeBase64 = Buffer.from(tsxCode, 'utf-8').toString('base64');
  const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';
  const callbackUrl = `${baseUrl}/webhook/github${secretSuffix}`;

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/render.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
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
          callbackUrl,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errText}`);
  }
}

// Check if release asset is already uploaded on GitHub (fallback in case webhook was missed)
async function checkGitHubReleaseAsset(jobId: string, baseUrl: string): Promise<boolean> {
  const expectedUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`;
  try {
    const res = await fetch(expectedUrl, { method: 'HEAD', redirect: 'manual' });
    if (res.status === 200 || res.status === 302) {
      const job = jobs.get(jobId);
      if (job) {
        const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';
        job.status = 'completed';
        job.videoUrl = expectedUrl;
        job.watchPageUrl = `${baseUrl}/watch/${jobId}${secretSuffix}`;
      }
      return true;
    }
  } catch {}
  return false;
}

const ECOSYSTEM_DOCS = `
INSTALLED REMOTION ECOSYSTEM PACKAGES ON GITHUB ACTIONS CLOUD (4 vCPU, 16GB RAM):
1. Core: 'remotion' (AbsoluteFill, Sequence, Series, Loop, Freeze, Audio, OffthreadVideo, Img, useCurrentFrame, useVideoConfig, interpolate, interpolateColors, spring, Easing, random)
2. Transitions: '@remotion/transitions' (TransitionSeries, linearTiming, springTiming) + '@remotion/transitions/fade', '@remotion/transitions/slide', '@remotion/transitions/wipe', '@remotion/transitions/flip'
3. 2D Shapes & SVG: '@remotion/shapes' (Circle, Rect, Triangle, Star, Polygon, Ellipse, Heart, Pie), '@remotion/paths' (evolvePath, getLength, interpolatePath), '@remotion/rounded-text-box'
4. 3D Graphics: '@remotion/three' (ThreeCanvas) + 'three' + '@react-three/fiber' + '@react-three/drei'
5. Effects: '@remotion/motion-blur' (Trail, CameraMotionBlur), '@remotion/noise' (noise2D, noise3D, noise4D)
6. Typography & Fonts: '@remotion/google-fonts/BeVietnamPro', '@remotion/google-fonts/Inter', '@remotion/google-fonts/Montserrat', '@remotion/google-fonts/Roboto', '@remotion/layout-utils'
7. Media & Captions: '@remotion/captions', '@remotion/media-utils', '@remotion/gif' (Gif), '@remotion/lottie' (Lottie), '@remotion/animation-utils'
`;

function createMcpServerInstance(baseUrl: string) {
  const server = new McpServer({
    name: 'remotion-cloud-github-actions',
    version: '2.0.0',
  });

  server.tool(
    'get_remotion_ecosystem_guide',
    'Get documentation for all installed @remotion/* packages available on the Cloud renderer.',
    {},
    async () => ({
      content: [{ type: 'text', text: ECOSYSTEM_DOCS }],
    })
  );

  server.tool(
    'render_remotion_video',
    `Dispatch a Remotion video render job to GitHub Actions Cloud (4 vCPU, 16GB RAM, supports long videos & full @remotion/* ecosystem).
${ECOSYSTEM_DOCS}
Rules for tsxCode:
- Must export: \`export const DynamicVideo: React.FC = () => { ... }\`
- After calling this tool, call check_render_status with the returned jobId to get the completed MP4 link.`,
    {
      title: z.string().default('Remotion Video').describe('Title of the video'),
      tsxCode: z
        .string()
        .describe('Complete TypeScript/React code exporting `export const DynamicVideo: React.FC`'),
      durationInFrames: z
        .number()
        .int()
        .min(15)
        .max(36000)
        .default(150)
        .describe('Total frames (e.g. 150 = 5s at 30fps, 1800 = 60s at 30fps)'),
      fps: z.number().int().default(30),
      width: z.number().int().default(1920),
      height: z.number().int().default(1080),
    },
    async ({ title, tsxCode, durationInFrames, fps, width, height }) => {
      const jobId = randomUUID().slice(0, 8);
      const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';
      const directDownloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`;
      const watchPageUrl = `${baseUrl}/watch/${jobId}${secretSuffix}`;

      jobs.set(jobId, {
        id: jobId,
        title,
        status: 'dispatched',
        videoUrl: directDownloadUrl,
        watchPageUrl,
        createdAt: Date.now(),
      });

      try {
        await triggerGitHubActionsRender(
          jobId,
          title,
          tsxCode,
          durationInFrames,
          fps,
          width,
          height,
          baseUrl
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'dispatched_to_github_actions',
                  jobId,
                  title,
                  watchPageUrl,
                  expectedVideoUrl: directDownloadUrl,
                  githubActionsUrl: `https://github.com/${GITHUB_REPO}/actions`,
                  message:
                    'Render job has been sent to GitHub Actions (16GB RAM Cloud)! Call check_render_status in ~30-45 seconds, or open watchPageUrl which automatically refreshes when the video is ready.',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        jobs.get(jobId)!.status = 'failed';
        jobs.get(jobId)!.error = err?.message || String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to dispatch render job: ${err?.message}` }],
        };
      }
    }
  );

  server.tool(
    'render_batch_videos',
    'Dispatch up to 20 Remotion videos simultaneously to GitHub Actions (runs on 20 parallel 16GB RAM Cloud machines at once!).',
    {
      videos: z
        .array(
          z.object({
            title: z.string(),
            tsxCode: z.string(),
            durationInFrames: z.number().int().default(150),
            fps: z.number().int().default(30),
            width: z.number().int().default(1920),
            height: z.number().int().default(1080),
          })
        )
        .min(1)
        .max(20),
    },
    async ({ videos }) => {
      const results = [];
      const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';

      for (const v of videos) {
        const jobId = randomUUID().slice(0, 8);
        const watchPageUrl = `${baseUrl}/watch/${jobId}${secretSuffix}`;
        const directDownloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`;

        jobs.set(jobId, {
          id: jobId,
          title: v.title,
          status: 'dispatched',
          videoUrl: directDownloadUrl,
          watchPageUrl,
          createdAt: Date.now(),
        });

        await triggerGitHubActionsRender(
          jobId,
          v.title,
          v.tsxCode,
          v.durationInFrames,
          v.fps,
          v.width,
          v.height,
          baseUrl
        );

        results.push({ jobId, title: v.title, watchPageUrl, videoUrl: directDownloadUrl });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: `Dispatched ${results.length} parallel render jobs to GitHub Actions Cloud!`,
                jobs: results,
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
    'check_render_status',
    'Check if a GitHub Actions render job has finished and get the final MP4 link.',
    {
      jobId: z.string().describe('The jobId returned by render_remotion_video'),
    },
    async ({ jobId }) => {
      let job = jobs.get(jobId);
      const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';

      if (!job) {
        job = {
          id: jobId,
          title: `Video #${jobId}`,
          status: 'dispatched',
          videoUrl: `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`,
          watchPageUrl: `${baseUrl}/watch/${jobId}${secretSuffix}`,
          createdAt: Date.now(),
        };
        jobs.set(jobId, job);
      }

      // Poll up to 20 seconds
      const start = Date.now();
      while (job.status !== 'completed' && job.status !== 'failed' && Date.now() - start < 20000) {
        const ready = await checkGitHubReleaseAsset(jobId, baseUrl);
        if (ready) break;
        await new Promise((r) => setTimeout(r, 3000));
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                jobId: job.id,
                title: job.title,
                status: job.status,
                watchPageUrl: job.watchPageUrl,
                videoUrl: job.videoUrl,
                error: job.error,
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

  // Webhook called by GitHub Actions when a video finishes rendering
  app.post('/webhook/github', (req, res) => {
    if (!checkAuth(req, res)) return;
    const { jobId, status, videoUrl, error } = req.body || {};
    const job = jobs.get(jobId);
    if (job) {
      job.status = status;
      if (videoUrl) job.videoUrl = videoUrl;
      if (error) job.error = error;
    }
    res.json({ ok: true });
  });

  // Smart Watch Page (auto-checks if video is still rendering on GitHub Actions and plays automatically when done!)
  app.get('/watch/:jobId', async (req, res) => {
    if (!checkAuth(req, res)) return;
    const jobId = req.params.jobId;
    const baseUrl = getPublicBaseUrl(req);
    const isReady = await checkGitHubReleaseAsset(jobId, baseUrl);
    const job = jobs.get(jobId);
    const videoUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`;

    if (!isReady && job?.status !== 'completed') {
      res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="5" />
  <title>Đang Render trên Cloud... (#${jobId})</title>
  <style>
    body { background: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; }
    .loader { width: 48px; height: 48px; border: 5px solid #1e293b; border-bottom-color: #38bdf8; border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; margin-bottom: 20px; }
    @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    a { color: #38bdf8; }
  </style>
</head>
<body>
  <span class="loader"></span>
  <h2>⏳ Đang render video trên GitHub Actions Cloud (16GB RAM)...</h2>
  <p>Mã công việc: <strong>#${jobId}</strong> — Trang này sẽ tự động cập nhật mỗi 5 giây và phát video ngay khi hoàn tất!</p>
  <p><a href="https://github.com/${GITHUB_REPO}/actions" target="_blank">Xem tiến độ trực tiếp trên GitHub Actions ↗</a></p>
</body>
</html>`);
      return;
    }

    res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${job?.title || 'Remotion Video'} (#${jobId})</title>
  <style>
    body { background: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    video { max-width: 90vw; max-height: 75vh; border-radius: 14px; box-shadow: 0 25px 60px rgba(0,0,0,0.65); border: 1px solid #1e293b; background: #000; }
    .actions { margin-top: 22px; display: flex; gap: 14px; }
    a { background: linear-gradient(135deg, #38bdf8, #6366f1); color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <h2>🎬 ${job?.title || 'Video Remotion'} (#${jobId})</h2>
  <video src="${videoUrl}" controls autoplay loop></video>
  <div class="actions">
    <a href="${videoUrl}" download="remotion-${jobId}.mp4">⬇ Tải xuống MP4</a>
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
      mode: 'GitHub Actions Cloud Renderer (4 vCPU, 16GB RAM x 20 parallel jobs)',
      repository: GITHUB_REPO,
      mcpEndpoint: `${baseUrl}/mcp${MCP_SECRET ? '/<YOUR_SECRET>' : ''}`,
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Remotion Cloud Coordinator MCP listening on port ${PORT}`);
  });
}

// Run directly if invoked as main entry
if (process.argv[1]?.endsWith('server.ts')) {
  startApp();
}

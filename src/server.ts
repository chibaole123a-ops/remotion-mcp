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
      'NOTE: Detected `Math.random()`. Prefer `random("seed")` from "remotion" so parallel multi-core rendering stays 100% deterministic.'
    );
  }
  return warnings;
}

function buildNarrationTimelineAnalysis(narrationSegments: string[], fps = 30, rate = '+5%') {
  const rateMatch = String(rate).match(/([+-]?\d+)%/);
  const rateFactor = rateMatch ? 1 + Number(rateMatch[1]) / 100 : 1.05;
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

    const weights = tokens.map((w) => {
      const cleanLen = w.replace(/[^\p{L}\p{N}]/gu, '').length || 1;
      const commaPause = /[,;:]/.test(w) ? 1.4 : 0;
      const periodPause = /[.!?…]$/.test(w) ? 2.4 : 0;
      return Math.max(1.2, cleanLen * 0.78 + commaPause + periodPause);
    });

    const avgWeightPerWord = 3.2;
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const spokenDurationSec = Math.max(1.6, totalWeight / (avgWeightPerWord * baseWordsPerSec));
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

interface CloudRenderJob {
  id: string;
  title: string;
  status: 'dispatched' | 'rendering' | 'completed' | 'failed';
  videoUrl?: string;
  watchPageUrl?: string;
  streamUrl?: string;
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
  audioConfig: { voice: string; bgmMood: string; narrationSegments: string[] }
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
): Promise<{ videoReady: boolean; errorLogText?: string }> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Remotion-Cloud-MCP-Server',
    };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/videos-store`, {
      headers,
    });
    if (!res.ok) return { videoReady: false };
    const data: any = await res.json();
    const assets: any[] = data?.assets || [];

    const videoReady = assets.some((a) => a.name === `video-${jobId}.mp4` && a.state === 'uploaded');
    const errAsset = assets.find((a) => a.name === `error-${jobId}.txt` && a.state === 'uploaded');

    let errorLogText: string | undefined;
    if (errAsset) {
      const errUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/error-${jobId}.txt`;
      const errRes = await fetch(errUrl, {
        headers: { 'User-Agent': 'Remotion-Cloud-MCP-Server' },
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

async function inspectGitHubWorkflowRun(jobId: string) {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Remotion-Cloud-MCP-Server',
    };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const runsRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/render.yml/runs?per_page=15`,
      { headers }
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

    const jobsRes = await fetch(targetRun.jobs_url, { headers });
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

const ECOSYSTEM_DOCS = `
# REMOTION v4.0.541 — OPEN CREATIVE AI VIDEO STUDIO (v5.1)
## (Continuous Camera Flow + Frame-Exact WordBoundary Sync + Crystal-Clear Audio + Full Ecosystem)

1. Anti-Slide-Deck Rule & Continuous Visual Flow:
   - NEVER repeat the same "TopHeader + Circle Icon + Bottom Box" template across scenes!
   - Design bespoke visual metaphors for every segment (3D ThreeCanvas, SVG path drawing \`evolvePath\`, real photography \`<Img>\` with parallax zoom, data charts, multi-beat choreography).
   - Break each spoken sentence into 2–4 visual beats triggered at exact spoken keywords via \`getWordFrame(i, 'keyword')\` and \`getWordProgress(i, 'startWord', 'endWord', frame)\`.
2. Frame-Exact Audio-Visual Sync (\`./audio-sync\`):
   - \`import { getSceneFrames, getSegmentStartFrame, getWordFrame, getGlobalWordFrame, getWordProgress, ContinuousAudioTrack, WordHighlightCaptions, audioTelemetry } from './audio-sync';\`
   - Keep BGM subtle (\`volume={0.10}\`) and SFX soft (\`volume={0.15}\`) for crystal-clear voiceover.
`;

function createMcpServerInstance(baseUrl: string) {
  const server = new McpServer({
    name: 'remotion-cloud-github-actions',
    version: '5.0.0',
  });

  server.tool(
    'get_remotion_ecosystem_guide',
    'Get the complete Remotion v4.0.541 Open Creative Studio v5.0 guide (6-Step Professional Editor Workflow, Frame-Exact Word-to-Visual Sync `./audio-sync`, Word-by-Word Karaoke Captions, and all 26+ package APIs).',
    {},
    async () => ({
      content: [{ type: 'text', text: ECOSYSTEM_DOCS }],
    })
  );

  server.tool(
    'analyze_narration_timeline',
    'Analyze spoken `narrationSegments` BEFORE writing `tsxCode` to get the exact frame duration of each scene (`sceneFrames`) and the exact `startFrame`/`endFrame` of every spoken word/keyword.',
    {
      narrationSegments: z
        .array(z.string())
        .describe('Array of spoken narration paragraphs (one per scene/chapter in order)'),
      fps: z.number().int().default(30),
      voice: z.string().default('vi-VN-NamMinhNeural'),
    },
    async ({ narrationSegments, fps }) => {
      const analysis = buildNarrationTimelineAnalysis(narrationSegments, fps);
      return {
        content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  server.tool(
    'list_rendered_videos',
    'List all previously rendered MP4 videos stored in the Cloud Gallery along with their watch URLs, stream URLs, and download links.',
    {
      limit: z.number().int().min(1).max(100).default(20),
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

  server.tool(
    'render_remotion_video',
    `Render a complete broadcast-ready Remotion video on GitHub Actions Cloud (16GB RAM, Remotion v4.0.541, Frame-Exact WordBoundary Sync, Multi-Layer BGM, WebGL2 swangle).\n${ECOSYSTEM_DOCS}`,
    {
      title: z.string().default('Remotion Studio Video').describe('Title of the video project'),
      tsxCode: z
        .string()
        .describe(
          'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`'
        ),
      durationInFrames: z
        .number()
        .int()
        .min(15)
        .max(36000)
        .default(600)
        .describe('Total frames of the video (`seconds * fps`)'),
      narrationSegments: z
        .array(z.string())
        .default([])
        .describe('Spoken voiceover script for each scene/chapter in order'),
      voice: z
        .string()
        .default('vi-VN-NamMinhNeural')
        .describe('Neural TTS voice ID (e.g. vi-VN-NamMinhNeural, vi-VN-HoaiMyNeural)'),
      bgmMood: z
        .enum(['epic-space', 'cyber-tech', 'warm-inspiring', 'mystery-deep', 'upbeat-energetic'])
        .default('epic-space')
        .describe('Mood for automatic multi-layer 4-chord background music'),
      fps: z.number().int().default(30),
      width: z.number().int().default(1920),
      height: z.number().int().default(1080),
    },
    async ({
      title,
      tsxCode,
      durationInFrames: rawDuration,
      narrationSegments,
      voice,
      bgmMood,
      fps,
      width,
      height,
    }) => {
      const warnings = validateTsxCode(tsxCode);
      if (warnings.some((w) => w.startsWith('CRITICAL:'))) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Pre-flight validation failed:\n${warnings.join('\n')}\nPlease fix and call render_remotion_video again.`,
            },
          ],
        };
      }

      const jobId = randomUUID().slice(0, 8);
      const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';
      const directDownloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`;
      const watchPageUrl = `${baseUrl}/watch/${jobId}${secretSuffix}`;
      const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretSuffix}`;
      const galleryUrl = `${baseUrl}/gallery${secretSuffix}`;

      const timelineEst =
        narrationSegments.length > 0
          ? buildNarrationTimelineAnalysis(narrationSegments, fps)
          : null;
      const durationInFrames = Math.max(rawDuration, timelineEst?.totalFrames || 0);

      jobs.set(jobId, {
        id: jobId,
        title,
        status: 'dispatched',
        videoUrl: directDownloadUrl,
        watchPageUrl,
        streamUrl,
        createdAt: Date.now(),
      });

      try {
        await triggerGitHubActionsRender(jobId, title, tsxCode, durationInFrames, fps, width, height, {
          voice,
          bgmMood,
          narrationSegments,
        });

        return {
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
                    voice,
                    bgmMood,
                    narrationScenesCount: narrationSegments.length,
                    wordBoundarySync: true,
                  },
                  watchPageUrl,
                  streamUrl,
                  galleryUrl,
                  directDownloadUrl,
                  notes: warnings.length > 0 ? warnings : undefined,
                  message:
                    'Render job (with Frame-Exact WordBoundary Sync, Voiceover Mastering & Multi-Layer BGM) dispatched to GitHub Actions Cloud! Share watchPageUrl with the user or call check_render_status with jobId to track progress.',
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
    'Dispatch up to 20 complete Remotion videos (with AI Voiceover, Word-Level Captions & BGM) in parallel to GitHub Actions Cloud.',
    {
      videos: z
        .array(
          z.object({
            title: z.string(),
            tsxCode: z.string(),
            durationInFrames: z.number().int().default(600),
            narrationSegments: z.array(z.string()).default([]),
            voice: z.string().default('vi-VN-NamMinhNeural'),
            bgmMood: z
              .enum(['epic-space', 'cyber-tech', 'warm-inspiring', 'mystery-deep', 'upbeat-energetic'])
              .default('epic-space'),
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
        const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretSuffix}`;
        const directDownloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`;
        const est =
          v.narrationSegments.length > 0
            ? buildNarrationTimelineAnalysis(v.narrationSegments, v.fps)
            : null;
        const dur = Math.max(v.durationInFrames, est?.totalFrames || 0);

        jobs.set(jobId, {
          id: jobId,
          title: v.title,
          status: 'dispatched',
          videoUrl: directDownloadUrl,
          watchPageUrl,
          streamUrl,
          createdAt: Date.now(),
        });

        await triggerGitHubActionsRender(jobId, v.title, v.tsxCode, dur, v.fps, v.width, v.height, {
          voice: v.voice,
          bgmMood: v.bgmMood,
          narrationSegments: v.narrationSegments,
        });

        results.push({
          jobId,
          title: v.title,
          watchPageUrl,
          streamUrl,
          directDownloadUrl,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'batch_dispatched',
                count: results.length,
                galleryUrl: `${baseUrl}/gallery${secretSuffix}`,
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
    'Check if a rendered video is ready on the Cloud, and inspect real-time GitHub Actions step progress or exact compiler error logs.',
    {
      jobId: z.string().describe('The jobId returned by render_remotion_video'),
    },
    async ({ jobId: rawJobId }) => {
      const jobId = sanitizeJobId(rawJobId);
      const secretSuffix = MCP_SECRET ? `?key=${encodeURIComponent(MCP_SECRET)}` : '';
      const watchPageUrl = `${baseUrl}/watch/${jobId}${secretSuffix}`;
      const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretSuffix}`;
      const videoUrl = `https://github.com/${GITHUB_REPO}/releases/download/videos-store/video-${jobId}.mp4`;

      const start = Date.now();
      let ready = false;
      let errorLogText: string | undefined;
      let workflowInfo: any = null;

      while (Date.now() - start < 15000) {
        const check = await checkReleaseAssetsOnGitHub(jobId);
        ready = check.videoReady;
        errorLogText = check.errorLogText;
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

      const activeStep = workflowInfo?.steps?.find((s: any) => s.status === 'in_progress')?.name;
      const isFailed = Boolean(errorLogText) || workflowInfo?.conclusion === 'failure';

      return {
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
                  : `Job is actively running on GitHub Actions Cloud (current step: "${activeStep || 'rendering'}"). Present watchPageUrl and videoUrl to the user now; the watchPageUrl automatically tracks live progress and plays the video as soon as it finishes!`,
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
          'Đang xử lý khung hình & âm thanh...'
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
    <p>Tiến trình đã tự động dừng (không lặp vô hạn). Hãy bảo Gemini kiểm tra lỗi và gửi bản render mới.</p>
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
      version:
        '5.0.0 (Open Creative AI Studio: Frame-Exact WordBoundary Sync + Word-Highlight Captions + Multi-Layer BGM + Full Remotion 4.0.541)',
      mode: 'GitHub Actions Cloud Renderer (4 vCPU, 16GB RAM x 20 parallel jobs)',
      repository: GITHUB_REPO,
      mcpEndpoint: `${baseUrl}/mcp${MCP_SECRET ? '/<YOUR_SECRET>' : ''}`,
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Remotion Cloud Coordinator MCP v5.0.0 listening on port ${PORT}`);
  });
}

if (process.argv[1]?.endsWith('server.ts')) {
  startApp();
}

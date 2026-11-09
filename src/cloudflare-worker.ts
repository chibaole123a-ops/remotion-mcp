export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  MCP_SECRET: string;
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

const TOOLS = [
  {
    name: 'get_remotion_ecosystem_guide',
    description:
      'Get documentation for all installed @remotion/* packages available on the GitHub Actions 16GB RAM Cloud renderer.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'render_remotion_video',
    description: `Dispatch a Remotion video render job to GitHub Actions Cloud (4 vCPU, 16GB RAM, supports long videos & full @remotion/* ecosystem).\n${ECOSYSTEM_DOCS}\nRules for tsxCode:\n- Must export: \`export const DynamicVideo: React.FC = () => { ... }\`\n- After calling this tool, present watchPageUrl to the user or call check_render_status with the returned jobId.`,
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the video', default: 'Remotion Video' },
        tsxCode: {
          type: 'string',
          description: 'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC`',
        },
        durationInFrames: {
          type: 'number',
          description: 'Total frames (e.g. 150 = 5s at 30fps, 1800 = 60s at 30fps)',
          default: 150,
        },
        fps: { type: 'number', default: 30 },
        width: { type: 'number', default: 1920 },
        height: { type: 'number', default: 1080 },
      },
      required: ['tsxCode'],
    },
  },
  {
    name: 'render_batch_videos',
    description:
      'Dispatch up to 20 Remotion videos simultaneously to GitHub Actions (runs on up to 20 parallel 16GB RAM Cloud machines at once!).',
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
              durationInFrames: { type: 'number', default: 150 },
              fps: { type: 'number', default: 30 },
              width: { type: 'number', default: 1920 },
              height: { type: 'number', default: 1080 },
            },
            required: ['title', 'tsxCode'],
          },
        },
      },
      required: ['videos'],
    },
  },
  {
    name: 'check_render_status',
    description: 'Check if a GitHub Actions render job has finished and get the final MP4 link.',
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
          version: '2.0.0',
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
        const jobId = randomJobId();
        const title = args.title || 'Remotion Video';
        const durationInFrames = Number(args.durationInFrames || 150);
        const fps = Number(args.fps || 30);
        const width = Number(args.width || 1920);
        const height = Number(args.height || 1080);

        await dispatchGitHubRender(
          env,
          jobId,
          title,
          args.tsxCode,
          durationInFrames,
          fps,
          width,
          height
        );

        const watchPageUrl = `${baseUrl}/watch/${jobId}${secretQuery}`;
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
                    watchPageUrl,
                    directDownloadUrl: videoUrl,
                    message:
                      'Render job dispatched to GitHub Actions Cloud (16GB RAM)! Share watchPageUrl with the user right away (it auto-refreshes and plays when done), or call check_render_status with jobId.',
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
            Number(v.durationInFrames || 150),
            Number(v.fps || 30),
            Number(v.width || 1920),
            Number(v.height || 1080)
          );
          jobs.push({
            jobId,
            title: v.title,
            watchPageUrl: `${baseUrl}/watch/${jobId}${secretQuery}`,
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

        while (Date.now() - start < 20000) {
          ready = await isVideoReadyOnGitHub(env, jobId);
          if (ready) break;
          await new Promise((r) => setTimeout(r, 3000));
        }

        const watchPageUrl = `${baseUrl}/watch/${jobId}${secretQuery}`;
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
                    jobId,
                    status: ready ? 'completed' : 'rendering_on_github_actions',
                    watchPageUrl,
                    videoUrl,
                    message: ready
                      ? 'Video is completed and ready to watch/download!'
                      : 'Still rendering on GitHub Actions Cloud. You can call check_render_status again or open watchPageUrl.',
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
        return new Response(
          `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="5" />
  <title>Đang Render trên Cloud 16GB RAM... (#${jobId})</title>
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
  <p>Mã công việc: <strong>#${jobId}</strong> — Trang này sẽ tự động làm mới mỗi 5 giây và phát video ngay khi hoàn tất!</p>
  <p><a href="https://github.com/${repo}/actions" target="_blank">Xem tiến độ trực tiếp trên GitHub Actions ↗</a></p>
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

      return new Response(JSON.stringify({ status: 'ok', transport: 'streamable-http' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Home status page
    return new Response(
      JSON.stringify({
        status: 'online_24_7',
        platform: 'Cloudflare Workers + GitHub Actions (16GB RAM Cloud)',
        repository: repo,
        security: env.MCP_SECRET ? 'PROTECTED 🔒' : 'OPEN',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
};

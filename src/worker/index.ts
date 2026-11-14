import type { Env } from "./types.js";
import { handleJsonRpc } from "./mcp/handler.js";
import { TOOLS } from "./mcp/tools.js";
import { escapeHtml, sanitizeJobId } from "./utils.js";
import { checkReleaseAssetsOnGitHub, inspectGitHubWorkflowRun, listReleaseVideosOnGitHub } from "./services/github.js";
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
      pathParts[0] === 'video' ||
      pathParts[0] === 'watch';

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

      return new Response(JSON.stringify({ status: 'ok', transport: 'streamable-http', version: '7.4.0' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Home status page
    return new Response(
      JSON.stringify({
        status: 'online_24_7',
        version: '7.4.0 (Pro Editor & Director Cloud Studio)',
        platform: 'Cloudflare Workers + GitHub Actions (16GB RAM Cloud)',
        repository: repo,
        tools: TOOLS.map((t) => t.name),
        security: env.MCP_SECRET ? 'PROTECTED 🔒' : 'OPEN',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
};


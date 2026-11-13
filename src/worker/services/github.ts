import type { Env } from '../types.js';
import { toBase64Utf8 } from '../utils.js';

const DEFAULT_REPO = 'chibaole123a-ops/remotion-mcp';
const USER_AGENT = 'Remotion-Cloudflare-MCP-Worker';

function getRepo(env: Env): string {
  return env.GITHUB_REPO || DEFAULT_REPO;
}

function githubHeaders(token: string, extra?: Record<string, string>): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': USER_AGENT,
    ...extra,
  };
}

export interface RenderDispatchOptions {
  mode?: 'video' | 'still' | 'stitch';
  stillFrame?: number;
  stillFrames?: number[];
  saveSnapshot?: boolean;
  reusePayloadAssetName?: string;
  audioMastering?: {
    enabled?: boolean;
    targetLufs?: number;
    truePeakDbtp?: number;
  };
  stitchConfig?: {
    chapters: Array<{
      jobId?: string;
      videoUrl?: string;
      title?: string;
    }>;
    transition?: 'crossfade' | 'cut';
    fadeDurationSec?: number;
    targetWidth?: number;
    targetHeight?: number;
    targetFps?: number;
    masterBgmUrl?: string;
    masterBgmVolume?: number;
    duckingStrength?: 'gentle' | 'balanced' | 'strong';
  };
}

async function ensureVideosStoreRelease(env: Env): Promise<{ id: number; upload_url: string; assets: any[] }> {
  const repo = getRepo(env);
  const tagRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/videos-store`, {
    headers: githubHeaders(env.GITHUB_TOKEN),
  });
  if (tagRes.ok) {
    return (await tagRes.json()) as { id: number; upload_url: string; assets: any[] };
  }
  const createRes = await fetch(`https://api.github.com/repos/${repo}/releases`, {
    method: 'POST',
    headers: githubHeaders(env.GITHUB_TOKEN, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      tag_name: 'videos-store',
      name: 'Rendered Videos Storage',
      body: 'Automated storage for Remotion MCP rendered MP4 files and job payloads',
    }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to ensure videos-store release (${createRes.status}): ${errText}`);
  }
  return (await createRes.json()) as { id: number; upload_url: string; assets: any[] };
}

export async function uploadReleaseJsonAsset(env: Env, assetName: string, data: unknown): Promise<string> {
  const repo = getRepo(env);
  const release = await ensureVideosStoreRelease(env);
  const existing = (release.assets || []).find((a: any) => a.name === assetName);
  if (existing?.id) {
    await fetch(`https://api.github.com/repos/${repo}/releases/assets/${existing.id}`, {
      method: 'DELETE',
      headers: githubHeaders(env.GITHUB_TOKEN),
    });
  }

  const uploadBase = release.upload_url.replace(/\{.*$/, '');
  const uploadUrl = `${uploadBase}?name=${encodeURIComponent(assetName)}`;
  const bodyStr = JSON.stringify(data);

  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: githubHeaders(env.GITHUB_TOKEN, {
      'Content-Type': 'application/json; charset=utf-8',
    }),
    body: bodyStr,
  });
  if (!upRes.ok) {
    const errText = await upRes.text();
    throw new Error(`Failed to upload payload asset ${assetName} (${upRes.status}): ${errText}`);
  }
  return assetName;
}

export async function dispatchGitHubRender(
  env: Env,
  jobId: string,
  title: string,
  tsxCode: string,
  durationInFrames: number,
  fps: number,
  width: number,
  height: number,
  audioConfig: any,
  modeOrOpts: 'video' | 'still' | 'stitch' | RenderDispatchOptions = 'video',
  stillFrame = 0
) {
  const opts: RenderDispatchOptions =
    typeof modeOrOpts === 'string'
      ? { mode: modeOrOpts, stillFrame }
      : modeOrOpts;

  const mode = opts.mode || 'video';
  const resolvedStillFrame = opts.stillFrame ?? stillFrame;
  const stillFramesCsv =
    Array.isArray(opts.stillFrames) && opts.stillFrames.length > 0
      ? opts.stillFrames.join(',')
      : '';
  const masteringJson = opts.audioMastering ? JSON.stringify(opts.audioMastering) : '';

  const tsxCodeB64 = tsxCode ? toBase64Utf8(tsxCode) : '';
  const audioConfigB64 = toBase64Utf8(JSON.stringify(audioConfig || {}));
  const audioMasteringB64 = masteringJson ? toBase64Utf8(masteringJson) : '';
  const inlineTotalChars = tsxCodeB64.length + audioConfigB64.length + audioMasteringB64.length;

  // Reuse an already-uploaded draft/preview snapshot OR offload snapshot/large/stitch payload to Release asset
  let payloadAssetName = opts.reusePayloadAssetName || '';
  const shouldOffload =
    Boolean(payloadAssetName) ||
    Boolean(opts.saveSnapshot) ||
    mode === 'stitch' ||
    Boolean(opts.stitchConfig) ||
    inlineTotalChars > 36000;
  if (shouldOffload && !payloadAssetName) {
    payloadAssetName = await uploadReleaseJsonAsset(env, `payload-${jobId}.json`, {
      title,
      width,
      height,
      fps,
      durationInFrames,
      tsxCode,
      audioConfig: audioConfig || {},
      audioMastering: opts.audioMastering || null,
      stitchConfig: opts.stitchConfig || null,
    });
  }

  const repo = getRepo(env);
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/render.yml/dispatches`,
    {
      method: 'POST',
      headers: githubHeaders(env.GITHUB_TOKEN, {
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          jobId,
          title,
          durationInFrames: String(durationInFrames),
          fps: String(fps),
          width: String(width),
          height: String(height),
          tsxCodeBase64: shouldOffload ? '' : tsxCodeB64,
          audioConfigBase64: shouldOffload ? '' : audioConfigB64,
          callbackUrl: '',
          mode,
          stillFrame: String(resolvedStillFrame),
          stillFrames: stillFramesCsv,
          audioMasteringBase64: shouldOffload ? '' : audioMasteringB64,
          payloadAssetName,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub Actions dispatch error (${res.status}): ${errText}`);
  }

  return { payloadOffloaded: shouldOffload, payloadAssetName: payloadAssetName || undefined };
}

export async function listReleaseVideosOnGitHub(env: Env, baseUrl: string) {
  const repo = getRepo(env);
  const secretSuffix = env.MCP_SECRET ? `?key=${encodeURIComponent(env.MCP_SECRET)}` : '';
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/videos-store`, {
      headers: githubHeaders(env.GITHUB_TOKEN),
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
          directDownloadUrl: `https://github.com/${repo}/releases/download/videos-store/${a.name}`,
        };
      });
  } catch {
    return [];
  }
}

async function fetchReleaseAssetBase64(repo: string, assetName: string): Promise<string | undefined> {
  try {
    const assetUrl = `https://github.com/${repo}/releases/download/videos-store/${assetName}`;
    const res = await fetch(assetUrl, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    if (!res.ok) return undefined;
    const arrBuf = await res.arrayBuffer();
    const bytes = new Uint8Array(arrBuf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return undefined;
  }
}

export async function checkReleaseAssetsOnGitHub(
  env: Env,
  jobId: string
): Promise<{
  videoReady: boolean;
  stillReady: boolean;
  errorLogText?: string;
  stillBase64?: string;
  finalSheetBase64?: string;
  qcTelemetry?: Record<string, any>;
  projectSourceAvailable?: boolean;
}> {
  const repo = getRepo(env);
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/videos-store`, {
      headers: githubHeaders(env.GITHUB_TOKEN),
    });
    if (!res.ok) return { videoReady: false, stillReady: false };
    const data: any = await res.json();
    const assets: any[] = data?.assets || [];

    const videoReady = assets.some((a) => a.name === `video-${jobId}.mp4` && a.state === 'uploaded');
    const stillAsset = assets.find((a) => a.name === `still-${jobId}.png` && a.state === 'uploaded');
    const finalSheetAsset = assets.find((a) => a.name === `final-sheet-${jobId}.jpg` && a.state === 'uploaded');
    const stillReady = Boolean(stillAsset);
    const errAsset = assets.find((a) => a.name === `error-${jobId}.txt` && a.state === 'uploaded');
    const qcAsset = assets.find((a) => a.name === `qc-${jobId}.json` && a.state === 'uploaded');
    const projectSourceAvailable = assets.some((a) => a.name === `project-${jobId}.json` && a.state === 'uploaded');

    const stillBase64 = stillAsset ? await fetchReleaseAssetBase64(repo, `still-${jobId}.png`) : undefined;
    const finalSheetBase64 =
      videoReady && finalSheetAsset ? await fetchReleaseAssetBase64(repo, `final-sheet-${jobId}.jpg`) : undefined;

    let errorLogText: string | undefined;
    if (errAsset) {
      const errUrl = `https://github.com/${repo}/releases/download/videos-store/error-${jobId}.txt`;
      const errRes = await fetch(errUrl, {
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
      });
      if (errRes.ok) {
        errorLogText = await errRes.text();
      }
    }

    let qcTelemetry: Record<string, any> | undefined;
    if (qcAsset) {
      try {
        const qcUrl = `https://github.com/${repo}/releases/download/videos-store/qc-${jobId}.json`;
        const qcRes = await fetch(qcUrl, {
          headers: { 'User-Agent': USER_AGENT },
          redirect: 'follow',
        });
        if (qcRes.ok) {
          qcTelemetry = (await qcRes.json()) as Record<string, any>;
        }
      } catch {}
    }

    return { videoReady, stillReady, errorLogText, stillBase64, finalSheetBase64, qcTelemetry, projectSourceAvailable };
  } catch {
    return { videoReady: false, stillReady: false };
  }
}

export async function fetchReleaseJsonAsset(
  env: Env,
  assetName: string
): Promise<Record<string, any> | null> {
  const repo = getRepo(env);
  try {
    const cdnUrl = `https://github.com/${repo}/releases/download/videos-store/${encodeURIComponent(assetName)}`;
    const cdnRes = await fetch(cdnUrl, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    if (cdnRes.ok) {
      return (await cdnRes.json()) as Record<string, any>;
    }

    // Immediate API fallback if CDN edge has just received the upload
    const tagRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/videos-store`, {
      headers: githubHeaders(env.GITHUB_TOKEN),
    });
    if (tagRes.ok) {
      const tagData: any = await tagRes.json();
      const asset = (tagData?.assets || []).find((a: any) => a.name === assetName);
      if (asset?.url) {
        const binRes = await fetch(asset.url, {
          headers: githubHeaders(env.GITHUB_TOKEN, { Accept: 'application/octet-stream' }),
          redirect: 'follow',
        });
        if (binRes.ok) {
          return (await binRes.json()) as Record<string, any>;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchProjectSourceFromGitHub(env: Env, jobId: string): Promise<Record<string, any> | null> {
  const repo = getRepo(env);
  try {
    const url = `https://github.com/${repo}/releases/download/videos-store/project-${jobId}.json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, any>;
  } catch {
    return null;
  }
}

export async function inspectGitHubWorkflowRun(env: Env, jobId: string) {
  const repo = getRepo(env);
  try {
    const runsRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/render.yml/runs?per_page=15`,
      { headers: githubHeaders(env.GITHUB_TOKEN) }
    );
    if (!runsRes.ok) return null;
    const runsData: any = await runsRes.json();
    const runs: any[] = runsData?.workflow_runs || [];
    if (runs.length === 0) return null;

    let targetRun = runs.find(
      (r) =>
        (typeof r.display_title === 'string' && r.display_title.includes(jobId)) ||
        (typeof r.name === 'string' && r.name.includes(jobId))
    );

    if (!targetRun) {
      for (const r of runs.slice(0, 5)) {
        try {
          const jobsRes = await fetch(r.jobs_url, {
            headers: githubHeaders(env.GITHUB_TOKEN),
          });
          if (jobsRes.ok) {
            const jobsData: any = await jobsRes.json();
            const steps = jobsData?.jobs?.[0]?.steps || [];
            const hasJobIdInSteps = steps.some(
              (s: any) => typeof s.name === 'string' && s.name.includes(jobId)
            );
            if (
              hasJobIdInSteps ||
              r.status === 'in_progress' ||
              Date.now() - new Date(r.created_at).getTime() < 1200000
            ) {
              return {
                runId: r.id,
                status: r.status,
                conclusion: r.conclusion,
                htmlUrl: r.html_url,
                steps: steps.map((s: any) => ({
                  name: s.name,
                  status: s.status,
                  conclusion: s.conclusion,
                })),
              };
            }
          }
        } catch {}
      }
    }

    if (!targetRun) return null;

    const jobsRes = await fetch(targetRun.jobs_url, {
      headers: githubHeaders(env.GITHUB_TOKEN),
    });
    const jobsData: any = jobsRes.ok ? await jobsRes.json() : null;
    const steps = (jobsData?.jobs?.[0]?.steps || []).map((s: any) => ({
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

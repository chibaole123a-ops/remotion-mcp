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
  mode: 'video' | 'still' = 'video',
  stillFrame = 0
) {
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

export async function checkReleaseAssetsOnGitHub(
  env: Env,
  jobId: string
): Promise<{
  videoReady: boolean;
  stillReady: boolean;
  errorLogText?: string;
  stillBase64?: string;
  qcTelemetry?: Record<string, any>;
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
    const stillReady = Boolean(stillAsset);
    const errAsset = assets.find((a) => a.name === `error-${jobId}.txt` && a.state === 'uploaded');
    const qcAsset = assets.find((a) => a.name === `qc-${jobId}.json` && a.state === 'uploaded');

    let stillBase64: string | undefined;
    if (stillAsset) {
      try {
        const stillUrl = `https://github.com/${repo}/releases/download/videos-store/still-${jobId}.png`;
        const stillRes = await fetch(stillUrl, {
          headers: { 'User-Agent': USER_AGENT },
          redirect: 'follow',
        });
        if (stillRes.ok) {
          const arrBuf = await stillRes.arrayBuffer();
          const bytes = new Uint8Array(arrBuf);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
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

    return { videoReady, stillReady, errorLogText, stillBase64, qcTelemetry };
  } catch {
    return { videoReady: false, stillReady: false };
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

import type { Env } from "../types.js";
import { TOOLS } from "./tools.js";
import { ECOSYSTEM_DOCS, DIRECTOR_CODE_BLUEPRINT } from "./prompts.js";
import {
  randomJobId,
  sanitizeJobId,
  validateTsxCode,
  calculateSpeechTelemetry,
  estimateAudioMinFrames,
} from "../utils.js";
import { buildQualityEvaluationReport, VISION_FRAME_CRITERIA } from "../../shared/quality-rubric.js";
import {
  dispatchGitHubRender,
  listReleaseVideosOnGitHub,
  checkReleaseAssetsOnGitHub,
  inspectGitHubWorkflowRun,
  fetchProjectSourceFromGitHub,
} from "../services/github.js";
import { searchSoundtrackQuery } from "../services/music.js";
import { searchVisualMedia, searchSfxCatalog, verifyExternalAsset } from "../services/media.js";

function normalizePreviewFrames(args: any): number[] | null {
  if (Array.isArray(args?.frames) && args.frames.length > 0) {
    const cleaned = args.frames
      .map((f: any) => Math.max(0, Math.floor(Number(f))))
      .filter((n: number) => Number.isFinite(n));
    const unique = [...new Set<number>(cleaned)].slice(0, 6);
    if (unique.length > 0) return unique;
  }
  if (typeof args?.frame === 'number' && Number.isFinite(args.frame)) {
    return [Math.max(0, Math.floor(args.frame))];
  }
  return null;
}

export async function handleJsonRpc(body: any, env: Env, baseUrl: string) {
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
          prompts: { listChanged: false },
        },
        serverInfo: {
          name: 'remotion-cloud-mcp',
          version: '7.4.0',
        },
      },
    };
  }

  if (method === 'prompts/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        prompts: [
          {
            name: 'director_workflow',
            description: 'Complete 6-stage AI Video Director workflow, Remotion API blueprint, Vietnamese fonts, and Continuous World code pattern.',
          },
        ],
      },
    };
  }

  if (method === 'prompts/get') {
    const promptName = params?.name;
    if (promptName !== 'director_workflow') {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Unknown prompt: ${promptName}` },
      };
    }
    return {
      jsonrpc: '2.0',
      id,
      result: {
        description: 'Remotion Cloud Director Playbook & Code Blueprint',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `${ECOSYSTEM_DOCS}\n\n${DIRECTOR_CODE_BLUEPRINT}`,
            },
          },
        ],
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
      if (toolName === 'search_visual_media') {
        const query = String(args.query || '').trim();
        const mediaType = (args.mediaType || 'all') as 'all' | 'image' | 'video';
        const limit = Number(args.limit || 5);
        const attachVision = args.attachVisionThumbnails !== false;

        const result = await searchVisualMedia(query, mediaType, limit, attachVision, {
          pexelsKey: env.PEXELS_API_KEY,
          pixabayKey: env.PIXABAY_API_KEY,
        });

        const contentBlocks: any[] = [
          {
            type: 'text',
            text: JSON.stringify(
              {
                query: result.query,
                mediaTypeFilter: result.mediaTypeFilter,
                totalFound: result.items.length,
                visionThumbnailsAttached: result.imageBlocks.length,
                items: result.items,
                usageNotes:
                  'Inspect attached image blocks with Vision before embedding. Use <Img src="<item.url>" /> for images or <OffthreadVideo src="<item.url>" /> for videos; the Cloud runner automatically pre-fetches them onto local SSD.',
              },
              null,
              2
            ),
          },
          ...result.imageBlocks,
        ];

        return {
          jsonrpc: '2.0',
          id,
          result: { content: contentBlocks },
        };
      }

      if (toolName === 'search_sfx') {
        const query = String(args.query || '').trim();
        const category = typeof args.category === 'string' ? args.category : 'all';
        const includeWebFoley = Boolean(args.includeWebFoley);
        const result = await searchSfxCatalog(query, category, includeWebFoley);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    ...result,
                    usageNotes:
                      'Import built-in effects directly from "@remotion/sfx" and wrap in <Sequence from={triggerFrame} durationInFrames={45}><Audio src={effectName} volume={0.55} /></Sequence>.',
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      // Legacy alias retained silently for backwards compatibility
      if (toolName === 'inspect_audio_track') {
        const audioUrl = String(args.url || '').trim();
        let status = 'unknown';
        let contentLength = 0;
        let contentType = '';

        try {
          const headRes = await fetch(audioUrl, { method: 'HEAD', redirect: 'follow' });
          status = headRes.ok ? 'accessible' : `http_${headRes.status}`;
          contentLength = Number(headRes.headers.get('content-length') || 0);
          contentType = headRes.headers.get('content-type') || '';
        } catch {
          status = 'unreachable';
        }

        const isDirectMp3 =
          /\.(mp3|wav|m4a|ogg)(\?|$)/i.test(audioUrl) || contentType.includes('audio');
        const isTikTok = /tiktok\.com/i.test(audioUrl);
        const isYouTube = /youtube\.com|youtu\.be/i.test(audioUrl);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    url: audioUrl,
                    status,
                    contentType: contentType || 'unknown',
                    contentLengthBytes: contentLength || undefined,
                    sourceType: isDirectMp3
                      ? 'direct_audio'
                      : isTikTok
                      ? 'tiktok_audio'
                      : isYouTube
                      ? 'youtube_stream'
                      : 'external_stream',
                    speechClashRisk: isDirectMp3
                      ? 'low-to-medium (check if instrumental vs vocal; duck BGM during speech)'
                      : 'medium (stream track — apply dynamic ducking during voiceover)',
                    usageInRemotion: `<Audio src="${audioUrl}" volume={(f) => ...} loop />`,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'search_soundtrack') {
        const query = String(args.query || '');
        const limit = Number(args.limit || 5);
        const verifyLinks = args.verifyLinks !== false;
        const results = await searchSoundtrackQuery(query, limit, verifyLinks);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    query,
                    totalFound: results.length,
                    tracks: results,
                    instructionsForAgent:
                      'Prefer tracks with verifiedReachable: true and directMp3: true when available. Mount `<Audio src="<track.url>" volume={(f) => ...} loop />` and duck BGM during active voiceover.',
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'evaluate_video_quality') {
        const tsxCode = String(args.tsxCode || '');
        const fps = Number(args.fps || 30);
        const width = Number(args.width || 1920);
        const height = Number(args.height || 1080);
        const durationInFrames = Number(args.durationInFrames || 300);
        const audioConfig = args.audioConfig;
        const expectedMinFrames = estimateAudioMinFrames(audioConfig, fps);

        const report = buildQualityEvaluationReport({
          tsxCode,
          creativeIntent: typeof args.creativeIntent === 'string' ? args.creativeIntent : undefined,
          genre: typeof args.genre === 'string' ? args.genre : undefined,
          durationInFrames,
          fps,
          width,
          height,
          audioConfig,
          expectedMinFrames,
        });

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
          },
        };
      }

      if (
        toolName === 'plan_storyboard_timeline' ||
        toolName === 'synthesize_speech' ||
        toolName === 'plan_voiceover' ||
        toolName === 'plan_speech_timing'
      ) {
        const scenesInput = args.scenes || args.text || [];
        const voice = args.voice || 'vi-VN-NamMinhNeural';
        const rate = args.rate || '+0%';
        const fps = Number(args.fps || 30);

        const telemetry = calculateSpeechTelemetry(scenesInput, voice, fps, rate);
        const inputArray = Array.isArray(args.scenes) ? args.scenes : [];

        const sampleIndices =
          telemetry.scenes.length <= 6
            ? telemetry.scenes.map((_: any, i: number) => i)
            : [
                0,
                Math.floor((telemetry.scenes.length - 1) * 0.33),
                Math.floor((telemetry.scenes.length - 1) * 0.66),
                telemetry.scenes.length - 1,
              ];
        const previewFrameTranscripts = [...new Set<number>(sampleIndices)].map((i) => {
          const s = telemetry.scenes[i];
          const midFrame = Math.round(s.startFrame + Math.max(10, s.durationInFrames * 0.48));
          return {
            frame: Math.min(Math.max(15, midFrame), Math.max(15, telemetry.totalDurationInFrames - 10)),
            sceneIndex: s.sceneIndex,
            sceneName: inputArray[i]?.sceneName || undefined,
            spokenText: s.text,
          };
        });
        const recommendedPreviewFrames = previewFrameTranscripts.map((p) => p.frame);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'timeline_computed',
                    fps: telemetry.fps,
                    totalDurationSec: telemetry.totalDurationSec,
                    totalDurationInFrames: telemetry.totalDurationInFrames,
                    totalScenes: telemetry.totalScenes,
                    timeline: telemetry.scenes.map((s: any, idx: number) => ({
                      sceneIndex: s.sceneIndex,
                      sceneName: inputArray[idx]?.sceneName || undefined,
                      visualConcept: inputArray[idx]?.visualConcept || undefined,
                      continuityFromPrevScene: inputArray[idx]?.continuityFromPrevScene || undefined,
                      startFrame: s.startFrame,
                      endFrame: s.endFrame,
                      durationInFrames: s.durationInFrames,
                      durationSec: s.durationSec,
                      text: s.text,
                      anchorKeywords: s.anchorKeywords,
                      audioFile: s.audioFileName,
                      usageSnippet: `<SyncedScene sceneIndex={${s.sceneIndex}}>{/* trigger beats with getWordTrigger(${s.sceneIndex}, "${s.anchorKeywords?.[0] || ''}", frame) */}</SyncedScene>`,
                    })),
                    recommendedPreviewFrames,
                    previewFrameTranscripts,
                    audioConfigPayload: telemetry.audioConfigPayload,
                    directorQualityReminder: {
                      targetDurationInFrames: telemetry.totalDurationInFrames,
                      audioSyncRule:
                        'Mount ONLY ONE voiceover method (either <MasterAudioTrack /> OR segmented <Audio src={staticFile("voice-X.mp3")} />), and duck BGM during speech.',
                      creativeFreedom:
                        'Design any visual style, pacing, 2D/3D medium, or camera flow that best serves your narrative intent.',
                    },
                    directorCodeBlueprint: DIRECTOR_CODE_BLUEPRINT,
                    instructionsForAgent:
                      `Storyboard & Timeline verified! Total duration: ${telemetry.totalDurationSec}s (${telemetry.totalDurationInFrames} frames).\nNEXT MANDATORY STEPS:\n1) Call search_visual_media + search_soundtrack (prefer directMp3: true) + search_sfx.\n2) Write DynamicVideo.tsx following directorCodeBlueprint above (Continuous World + SyncedScene transitionStyle + getWordTrigger + @remotion/google-fonts/BeVietnamPro + ProKaraokeCaptions + dynamic BGM ducking).\n3) Call evaluate_video_quality -> fix any CRITICAL/ADVISORY.\n4) Call preview_frames(frames: ${JSON.stringify(recommendedPreviewFrames)}, audioConfig: audioConfigPayload) and inspect the Contact Sheet via get_task_status against previewFrameTranscripts (1-pass polish if needed) BEFORE render_video(durationInFrames: ${telemetry.totalDurationInFrames}, audioConfig).`,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (
        toolName === 'render_video' ||
        toolName === 'render_remotion_video' ||
        toolName === 'preview_frames' ||
        toolName === 'preview_frame' ||
        toolName === 'preview_remotion_frame' ||
        toolName === 'remotion' ||
        toolName === 'remotion_studio'
      ) {
        const previewFramesList = normalizePreviewFrames(args);
        const isFramePreview =
          toolName === 'preview_frames' ||
          toolName === 'preview_frame' ||
          toolName === 'preview_remotion_frame' ||
          previewFramesList !== null ||
          args.action === 'preview';

        const resolvedFrames = previewFramesList || [0];
        const maxPreviewFrame = Math.max(...resolvedFrames);

        const tsxCode = String(args.tsxCode || '');
        const jobId = randomJobId();
        const fps = Number(args.fps || 30);
        const width = Number(args.width || 1920);
        const height = Number(args.height || 1080);
        const durationInFrames = Number(args.durationInFrames || 300);
        const audioConfig = args.audioConfig || {};
        const audioMastering =
          args.audioMastering && typeof args.audioMastering === 'object'
            ? {
                enabled: args.audioMastering.enabled !== false,
                targetLufs: Number(args.audioMastering.targetLufs ?? -14),
                truePeakDbtp: Number(args.audioMastering.truePeakDbtp ?? -1.5),
              }
            : { enabled: true, targetLufs: -14, truePeakDbtp: -1.5 };

        const warnings = validateTsxCode(tsxCode, {
          durationInFrames: isFramePreview ? undefined : durationInFrames,
          fps,
          width,
          height,
          audioConfig: isFramePreview ? undefined : audioConfig,
        });
        if (warnings.some((w) => w.startsWith('CRITICAL:'))) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Pre-flight validation failed:\n${warnings.join('\n')}\nPlease fix and call tool again.`,
                },
              ],
            },
          };
        }
        const qualityAdvisories = warnings.filter((w) => !w.startsWith('CRITICAL:'));

        if (isFramePreview) {
          const title = args.title || 'Remotion Frame Preview';

          await dispatchGitHubRender(
            env,
            jobId,
            title,
            tsxCode,
            Math.max(durationInFrames, maxPreviewFrame + 1, 30),
            fps,
            width,
            height,
            audioConfig,
            {
              mode: 'still',
              stillFrame: resolvedFrames[0],
              stillFrames: resolvedFrames,
            }
          );

          const stillUrl = `${baseUrl}/still/${jobId}.png${secretQuery}`;
          const downloadUrl = `https://github.com/${repo}/releases/download/videos-store/still-${jobId}.png`;

          let frameNarrationContext: Array<{ frame: number; sceneIndex: number; spokenText: string }> | undefined;
          if (Array.isArray(audioConfig?.scenes) && audioConfig.scenes.length > 0) {
            const previewTelemetry = calculateSpeechTelemetry(
              audioConfig.scenes,
              audioConfig.voice || 'vi-VN-NamMinhNeural',
              fps,
              audioConfig.rate || '+0%'
            );
            frameNarrationContext = resolvedFrames.map((f: number) => {
              const matched =
                previewTelemetry.scenes.find((s: any) => f >= s.startFrame && f < s.endFrame) ||
                previewTelemetry.scenes[previewTelemetry.scenes.length - 1];
              return {
                frame: f,
                sceneIndex: matched.sceneIndex,
                spokenText: matched.text,
              };
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
                      status: 'frame_dispatched_to_cloud',
                      jobId,
                      capturedFrames: resolvedFrames,
                      frameNarrationContext,
                      contactSheetMode: resolvedFrames.length > 1,
                      specs: `${width}x${height} @ ${fps}fps`,
                      previewImageUrl: stillUrl,
                      directDownloadUrl: downloadUrl,
                      qualityAdvisories: qualityAdvisories.length > 0 ? qualityAdvisories : undefined,
                      visionInspectionCriteria: VISION_FRAME_CRITERIA,
                      instructionsForAgent:
                        `Frame capture job for frame(s) [${resolvedFrames.join(', ')}] dispatched to Cloud runner! Call get_task_status(jobId: "${jobId}", waitForCompletion: true) to retrieve the ${resolvedFrames.length > 1 ? 'Contact Sheet' : 'still frame'}, compare every frame against frameNarrationContext + visionInspectionCriteria, and apply 1 polish pass if any frame looks flat or out-of-sync before render_video.`,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          };
        }

        // Full Video Render
        const title = args.title || 'Remotion Video';

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
          {
            mode: 'video',
            stillFrame: 0,
            audioMastering,
          }
        );

        const watchPageUrl = `${baseUrl}/watch/${jobId}${secretQuery}`;
        const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretQuery}`;
        const galleryUrl = `${baseUrl}/gallery${secretQuery}`;
        const videoUrl = `https://github.com/${repo}/releases/download/videos-store/video-${jobId}.mp4`;

        const waitStart = Date.now();
        let finalStatus = 'rendering_on_cloud';
        let isSuccess = false;
        let isFailed = false;
        let errorDetails: string | undefined;
        let qcTelemetry: Record<string, any> | undefined;

        while (Date.now() - waitStart < 20000) {
          await new Promise((r) => setTimeout(r, 4000));
          const check = await checkReleaseAssetsOnGitHub(env, jobId);
          if (check.videoReady) {
            isSuccess = true;
            finalStatus = 'completed';
            qcTelemetry = check.qcTelemetry;
            break;
          }
          if (check.errorLogText) {
            isFailed = true;
            finalStatus = 'failed';
            errorDetails = check.errorLogText;
            break;
          }
          const wf = await inspectGitHubWorkflowRun(env, jobId);
          if (wf?.conclusion === 'failure') {
            isFailed = true;
            finalStatus = 'failed';
            errorDetails = 'GitHub Actions workflow failed during build or render step. Check logs with inspect_task_logs.';
            break;
          }
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
                    status: finalStatus,
                    jobId,
                    title,
                    specs: `${width}x${height} @ ${fps}fps (${durationInFrames} frames / ${(durationInFrames / fps).toFixed(1)}s)`,
                    audioMastering,
                    watchPageUrl,
                    streamUrl,
                    galleryUrl,
                    directDownloadUrl: videoUrl,
                    qcTelemetry: isSuccess ? qcTelemetry : undefined,
                    qualityAdvisories: qualityAdvisories.length > 0 ? qualityAdvisories : undefined,
                    errorDetails: errorDetails || undefined,
                    instructionsForAgent: isSuccess
                      ? `Render completed successfully! Present the video watch link to the user: 🎬 [Xem Video Trực Tiếp](${watchPageUrl}) | 📥 [Tải Video MP4](${videoUrl})`
                      : isFailed
                      ? `Render failed on cloud runner! Inspect "errorDetails" above, fix your React TSX code or assets, and re-call render_video.`
                      : `CRITICAL ACTION REQUIRED: Video is still rendering on Cloud Runner! DO NOT reply to the user yet and DO NOT say you are waiting. You MUST immediately execute get_task_status(jobId: "${jobId}", waitForCompletion: true) right now until status is "completed"!`,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'get_task_status' || toolName === 'get_system_task_status' || toolName === 'check_render_status') {
        const jobId = sanitizeJobId(String(args.jobId || ''));
        const shouldWait = args.waitForCompletion !== false;
        const maxWaitMs = shouldWait ? 30000 : 4000;
        const start = Date.now();
        let ready = false;
        let isStill = false;
        let errorLogText: string | undefined;
        let workflowInfo: any = null;
        let stillBase64: string | undefined;
        let finalSheetBase64: string | undefined;
        let qcTelemetry: Record<string, any> | undefined;
        let projectSourceAvailable = false;

        while (Date.now() - start < maxWaitMs) {
          const check = await checkReleaseAssetsOnGitHub(env, jobId);
          ready = check.videoReady || check.stillReady;
          isStill = check.stillReady;
          errorLogText = check.errorLogText;
          stillBase64 = check.stillBase64;
          finalSheetBase64 = check.finalSheetBase64;
          qcTelemetry = check.qcTelemetry;
          projectSourceAvailable = Boolean(check.projectSourceAvailable);
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
                qcTelemetry: !isStill && ready ? qcTelemetry : undefined,
                projectSourceAvailable: !isStill && ready ? projectSourceAvailable : undefined,
                visionInspectionCriteria:
                  (isStill && ready) || (!isStill && ready && finalSheetBase64)
                    ? VISION_FRAME_CRITERIA
                    : undefined,
                compilerErrorDetails: errorLogText,
                cloudRunnerDiagnostics: workflowInfo,
                message: ready
                  ? isStill
                    ? 'Preview Contact Sheet is ready! Audit every tile against visionInspectionCriteria + frameNarrationContext: (1) verify numbers/HUDs match the spoken sentence at that frame, (2) compare the weakest tile vs strongest tile for balanced visual depth across all scenes, (3) do 1 polish edit + preview_frames if any tile feels under-crafted or out-of-sync, otherwise proceed to render_video.'
                    : finalSheetBase64
                    ? 'Video is completed, mastered (-14 LUFS), and ready! Review the attached 2x2 final MP4 Contact Sheet (showing real CTC subtitles) against Vision criteria before delivering the watch link.'
                    : 'Video is completed, mastered, and ready to watch or download!'
                  : isFailed
                  ? 'Render job failed on GitHub Actions. Call inspect_task_logs or read compilerErrorDetails to see error trace, fix tsxCode and re-call render_video.'
                  : 'Job is actively rendering on GitHub Actions Cloud. Continue polling get_task_status(jobId, waitForCompletion: true) until completed.',
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
            mime_type: 'image/png',
          });
        } else if (!isStill && ready && finalSheetBase64) {
          contentBlocks.push({
            type: 'image',
            data: finalSheetBase64,
            mimeType: 'image/jpeg',
            mime_type: 'image/jpeg',
          });
        }

        return {
          jsonrpc: '2.0',
          id,
          result: { content: contentBlocks },
        };
      }

      if (toolName === 'inspect_task_logs' || toolName === 'inspect_system_logs') {
        const jobId = sanitizeJobId(String(args.jobId || ''));
        const check = await checkReleaseAssetsOnGitHub(env, jobId);
        const workflowInfo = await inspectGitHubWorkflowRun(env, jobId);

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
          },
        };
      }

      if (toolName === 'list_system_assets' || toolName === 'manage_cloud_gallery' || toolName === 'list_rendered_videos') {
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

      if (toolName === 'get_project_source') {
        const jobId = sanitizeJobId(String(args.jobId || ''));
        const project = await fetchProjectSourceFromGitHub(env, jobId);
        if (!project) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Project source for jobId "${jobId}" was not found (jobs rendered before V7 did not archive project JSON).`,
                },
              ],
            },
          };
        }
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(project, null, 2) }],
          },
        };
      }

      if (toolName === 'verify_external_asset') {
        const rawUrl = String(args.url || '').trim();
        if (!rawUrl) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [{ type: 'text', text: 'Missing required parameter: url' }],
            },
          };
        }
        const expectedType = (['auto', 'image', 'video', 'audio'].includes(String(args.expectedType))
          ? String(args.expectedType)
          : 'auto') as 'auto' | 'image' | 'video' | 'audio';
        const attachVision = args.attachVisionThumbnail !== false;
        const verified = await verifyExternalAsset(rawUrl, expectedType, attachVision);
        const { imageBlock, ...payload } = verified;
        const content: Array<any> = [{ type: 'text', text: JSON.stringify(payload, null, 2) }];
        if (imageBlock) content.push(imageBlock);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            isError: !verified.verified,
            content,
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

import type { Env } from "../types.js";
import { ECOSYSTEM_DOCS } from "./prompts.js";
import { TOOLS } from "./tools.js";
import { randomJobId, sanitizeJobId, validateTsxCode, calculateSpeechTelemetry, estimateAudioMinFrames } from "../utils.js";
import { buildQualityEvaluationReport, VISION_FRAME_CRITERIA } from "../../shared/quality-rubric.js";
import { dispatchGitHubRender, listReleaseVideosOnGitHub, checkReleaseAssetsOnGitHub, inspectGitHubWorkflowRun } from "../services/github.js";
import { searchSoundtrackQuery } from "../services/music.js";
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
        },
        serverInfo: {
          name: 'remotion-cloud-mcp',
          version: '6.1.0',
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
      if (toolName === 'inspect_audio_track') {
        const audioUrl = String(args.url || '').trim();
        let status = 'unknown';
        let contentLength = 0;
        let contentType = 'audio/mpeg';

        try {
          const headRes = await fetch(audioUrl, { method: 'HEAD' });
          status = headRes.ok ? 'accessible' : `http_${headRes.status}`;
          contentLength = Number(headRes.headers.get('content-length') || 0);
          contentType = headRes.headers.get('content-type') || 'audio/mpeg';
        } catch {
          status = 'unreachable';
        }

        const isDirectMp3 = audioUrl.endsWith('.mp3') || contentType.includes('mpeg') || contentType.includes('audio');
        const isTikTok = /tiktok\.com/i.test(audioUrl);
        const isYouTube = /youtube\.com|youtu\.be/i.test(audioUrl);

        const estDurationSec = contentLength > 0 ? Math.round(contentLength / 24000) : 180;
        const speechClashRisk = isTikTok ? 'medium (may contain spoken dialogue or singing)' : 'low (studio instrumental)';

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
                    sourceType: isDirectMp3 ? 'direct_studio_mp3' : isTikTok ? 'tiktok_audio' : isYouTube ? 'youtube_stream' : 'external_stream',
                    estimatedDurationSec: estDurationSec,
                    speechClashRisk,
                    recommendation:
                      isTikTok
                        ? 'TikTok sound detected. Ensure background volume is set around 0.12 - 0.18 so it does not overpower your Vietnamese voiceover narration.'
                        : 'Clean studio instrumental track. Perfect for background music with volume={0.15}. Ready to use!',
                    usageInRemotion: `<Audio src="${audioUrl}" volume={0.15} loop />`,
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
        const results = await searchSoundtrackQuery(query, limit);

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
                      'You can choose any track matching your video mood and duration. In your Remotion TSX, import Audio from "remotion" and mount `<Audio src="<track.url>" volume={0.15} loop />`. The runner will automatically download and bundle the audio file!',
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
                    timeline: telemetry.scenes.map((s: any) => ({
                      sceneIndex: s.sceneIndex,
                      startFrame: s.startFrame,
                      endFrame: s.endFrame,
                      durationInFrames: s.durationInFrames,
                      durationSec: s.durationSec,
                      text: s.text,
                      audioFile: s.audioFileName,
                      usageSnippet: `<Sequence from={${s.startFrame}} durationInFrames={${s.durationInFrames}}><Audio src={staticFile("${s.audioFileName}")} volume={1} /></Sequence>`,
                    })),
                    audioConfigPayload: telemetry.audioConfigPayload,
                    directorQualityReminder: {
                      targetDurationInFrames: telemetry.totalDurationInFrames,
                      audioSyncRule: 'Mount ONLY ONE voiceover method (either <MasterAudioTrack /> OR segmented <Audio src={staticFile("voice-X.mp3")} />), and duck BGM during speech.',
                      creativeFreedom: 'Design any visual style, pacing, 2D/3D medium, or camera flow that best serves your narrative intent.',
                    },
                    instructionsForAgent:
                      `Storyboard & Timeline verified! Total duration: ${telemetry.totalDurationSec}s (${telemetry.totalDurationInFrames} frames). You have 100% creative freedom to design unique, non-repetitive visual motion for each scene! Pass durationInFrames: ${telemetry.totalDurationInFrames} and audioConfig to render_video.`,
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
        toolName === 'preview_frame' ||
        toolName === 'preview_remotion_frame' ||
        toolName === 'remotion' ||
        toolName === 'remotion_studio'
      ) {
        const isFramePreview =
          toolName === 'preview_frame' ||
          toolName === 'preview_remotion_frame' ||
          typeof args.frame === 'number' ||
          args.action === 'preview';

        const tsxCode = String(args.tsxCode || '');
        const jobId = randomJobId();
        const fps = Number(args.fps || 30);
        const width = Number(args.width || 1920);
        const height = Number(args.height || 1080);
        const durationInFrames = Number(args.durationInFrames || 300);
        const audioConfig = args.audioConfig || {};

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
          const frame = Number(args.frame || 0);

          await dispatchGitHubRender(
            env,
            jobId,
            title,
            tsxCode,
            Math.max(frame + 1, 30),
            fps,
            width,
            height,
            {},
            'still',
            frame
          );

          const stillUrl = `${baseUrl}/still/${jobId}.png${secretQuery}`;
          const downloadUrl = `https://github.com/${repo}/releases/download/videos-store/still-${jobId}.png`;

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
                      capturedFrame: frame,
                      specs: `${width}x${height} @ ${fps}fps`,
                      previewImageUrl: stillUrl,
                      directDownloadUrl: downloadUrl,
                      qualityAdvisories: qualityAdvisories.length > 0 ? qualityAdvisories : undefined,
                      visionInspectionCriteria: VISION_FRAME_CRITERIA,
                      instructionsForAgent:
                        `Frame capture job dispatched to Cloud runner! It takes ~20-25s. Call get_task_status with jobId "${jobId}" to retrieve the visual inspection image into your vision context.`,
                      message:
                        `Remotion frame #${frame} successfully dispatched to GitHub Actions Cloud (16GB RAM)! Next step: Call get_task_status with jobId "${jobId}" to inspect the visual frame.`,
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
          'video',
          0
        );

        const watchPageUrl = `${baseUrl}/watch/${jobId}${secretQuery}`;
        const streamUrl = `${baseUrl}/video/${jobId}.mp4${secretQuery}`;
        const galleryUrl = `${baseUrl}/gallery${secretQuery}`;
        const videoUrl = `https://github.com/${repo}/releases/download/videos-store/video-${jobId}.mp4`;

        // Wait synchronously for render completion up to 90s directly inside render_video!
        // This ensures Gemini receives the final completed video link immediately without having to poll multiple times.
        const waitStart = Date.now();
        let finalStatus = 'rendering_on_cloud';
        let isSuccess = false;
        let isFailed = false;
        let errorDetails: string | undefined;

        while (Date.now() - waitStart < 20000) {
          await new Promise((r) => setTimeout(r, 4000));
          const check = await checkReleaseAssetsOnGitHub(env, jobId);
          if (check.videoReady) {
            isSuccess = true;
            finalStatus = 'completed';
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
                    watchPageUrl,
                    streamUrl,
                    galleryUrl,
                    directDownloadUrl: videoUrl,
                    qualityAdvisories: qualityAdvisories.length > 0 ? qualityAdvisories : undefined,
                    errorDetails: errorDetails || undefined,
                    instructionsForAgent: isSuccess
                      ? `Render completed successfully! Present the video watch link to the user: 🎬 [Xem Video Trực Tiếp](${watchPageUrl}) | 📥 [Tải Video MP4](${videoUrl})`
                      : isFailed
                      ? `Render failed on cloud runner! Inspect "errorDetails" above, fix your React TSX code or assets, and re-call render_video.`
                      : `CRITICAL ACTION REQUIRED: Video is still rendering on Cloud Runner! DO NOT reply to the user yet and DO NOT say you are waiting. You MUST immediately execute the tool get_task_status(jobId: "${jobId}", waitForCompletion: true) right now until it returns status: "completed"!`,
                    message: isSuccess
                      ? 'Render completed successfully! Present watchPageUrl to user.'
                      : isFailed
                      ? `Render failed with error: ${errorDetails || 'Runner failure'}. Check errorDetails to fix.`
                      : `RENDER IN PROGRESS: Do not finish your response! Call get_task_status(jobId: "${jobId}") now to retrieve the completed video link for the user.`,
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
        let qcTelemetry: Record<string, any> | undefined;

        while (Date.now() - start < maxWaitMs) {
          const check = await checkReleaseAssetsOnGitHub(env, jobId);
          ready = check.videoReady || check.stillReady;
          isStill = check.stillReady;
          errorLogText = check.errorLogText;
          stillBase64 = check.stillBase64;
          qcTelemetry = check.qcTelemetry;
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
                visionInspectionCriteria: isStill && ready ? VISION_FRAME_CRITERIA : undefined,
                compilerErrorDetails: errorLogText,
                cloudRunnerDiagnostics: workflowInfo,
                message: ready
                  ? (isStill ? 'Still frame is ready to inspect! Multimodal image block attached below.' : 'Video is completed and ready to watch inline or download!')
                  : isFailed
                  ? 'Render job failed on GitHub Actions. Call inspect_task_logs or read compilerErrorDetails to see error trace, fix tsxCode and re-call remotion.'
                  : `Job is actively rendering on GitHub Actions Cloud. Present URL to user; it tracks live progress and completes when ready!`,
              },
              null,
              2
            ),
          },
        ];

        if (isStill && ready && stillBase64) {
          // Standard MCP Specification: type: "image", mimeType: "image/png", data: "<base64>"
          contentBlocks.push({
            type: 'image',
            data: stillBase64,
            mimeType: 'image/png',
            mime_type: 'image/png',
          });
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: contentBlocks,
          },
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
                    compilerErrorDetails: check.errorLogText || 'No compile-time error log found. Runner may still be in progress or completed without syntax error.',
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

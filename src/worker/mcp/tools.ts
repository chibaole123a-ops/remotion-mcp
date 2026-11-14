import { ECOSYSTEM_DOCS } from "./prompts.js";
import { VISION_FRAME_CRITERIA } from "../../shared/quality-rubric.js";

export const TOOLS = [
  {
    name: 'plan_storyboard_timeline',
    description:
      'STAGE 1 — STORYBOARD, TIMELINE & CODE BLUEPRINT ORCHESTRATOR: Compute frame-accurate speech timing, scene boundaries (startFrame, durationInFrames), audioConfigPayload, anchorKeywords, built-in @remotion/sfx catalog, AND the DynamicVideo.tsx Blueprint.\n' +
      'Autonomous Default (when user gives ONLY a topic): Auto-choose 1080x1920 (9:16 with <SafeAreaLayer>) for short/viral topics or 1920x1080 for deep documentaries; always include narrated voiceover, <ProKaraokeCaptions />, Vision-verified real media, ducked BGM, and SFX unless user asks otherwise.\n' +
      'Streamlined 4-Step Workflow: 1) plan_storyboard_timeline -> 2) search_visual_media(queries: [...]) + search_soundtrack -> 3) preview_frames (runs guardrails automatically + snapshots TSX) -> 4) render_video(fromPreviewJobId) -> get_task_status final audit.',
    inputSchema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array',
          description: 'Array of storyboard scenes with narration text and optional creative direction.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Narration script or lyric lines for this scene' },
              sceneName: { type: 'string', description: 'Optional scene name (e.g. "Hook", "Climax", "Outro")' },
              visualConcept: { type: 'string', description: 'Your creative visual direction matching this exact spoken sentence' },
              continuityFromPrevScene: { type: 'string', description: 'Visual/rhythmic bridge from previous scene' },
              voice: { type: 'string', description: 'Voice ID (e.g. "vi-VN-NamMinhNeural", "vi-VN-HoaiMyNeural")' },
              pauseAfterSec: {
                type: 'number',
                description: 'Optional breathing pause after this scene in seconds (0.08-2.0, default 0.28; use 0.45-0.65 before a twist or climax).',
              },
            },
            required: ['text'],
          },
        },
        text: {
          type: 'string',
          description: 'Alternative: single full script string if there is only 1 segment.',
        },
        voice: {
          type: 'string',
          description: 'Default voice for speech synthesis (default: "vi-VN-NamMinhNeural").',
          default: 'vi-VN-NamMinhNeural',
        },
        rate: {
          type: 'string',
          description: 'Speech pace adjustment (e.g. "+0%", "+10%", "-5%").',
          default: '+0%',
        },
        fps: {
          type: 'number',
          description: 'Frames per second of your composition (default: 30).',
          default: 30,
        },
        splitChapters: {
          type: 'boolean',
          description: 'Optional override to force adaptive scene-bounded chapter partitioning (normally triggered automatically for long/complex scripts).',
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'search_visual_media',
    description:
      'STAGE 2A — MULTIMODAL VISUAL MEDIA SEARCH (SINGLE OR BATCH): Search real photos and MP4/WebM videos across open global libraries (Wikimedia Commons, NASA Image & Video Library, Wikipedia EN/VI, Openverse, Internet Archive, plus optional Pexels/Pixabay).\n' +
      'Pass `queries: [...]` to fetch media & Vision thumbnails across ALL scenes in 1 single tool call, or `query` for a single search. Automatically attaches thumbnails as Vision image blocks (`visionImageIndex`). For custom external web URLs outside these libraries, call `verify_external_asset`.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Single descriptive English or Vietnamese keyword query.',
        },
        queries: {
          type: 'array',
          description: 'Batch mode (RECOMMENDED): up to 5 scene queries executed concurrently in 1 call (strings or { query, mediaType, orientation, limit }).',
          items: {
            oneOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  mediaType: { type: 'string', enum: ['all', 'image', 'video'] },
                  orientation: { type: 'string', enum: ['any', 'landscape', 'portrait', 'square'] },
                  limit: { type: 'number' },
                },
                required: ['query'],
              },
            ],
          },
        },
        mediaType: {
          type: 'string',
          enum: ['all', 'image', 'video'],
          default: 'all',
          description: 'Filter by image, video, or all.',
        },
        orientation: {
          type: 'string',
          enum: ['any', 'landscape', 'portrait', 'square'],
          default: 'any',
          description: 'Preferred framing orientation (use "portrait" for 9:16 TikTok/Shorts/Reels or "landscape" for 16:9).',
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Max results per query (1-10, default 5 single / 3 batch).',
        },
        attachVisionThumbnails: {
          type: 'boolean',
          default: true,
          description: 'Attach thumbnails/video frames directly as Vision image blocks (matched via visionImageIndex).',
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'search_soundtrack',
    description:
      'STAGE 2B — VERIFIED SOUNDTRACK & BGM SEARCH: Search background music tracks and automatically verify direct MP3 reachability & speech-clash risk.\n' +
      'Mount selected tracks with `<Audio src="<track.url>" volume={(f) => ...} loop />` and apply dynamic ducking whenever voiceover is active.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Mood or genre keywords (e.g. "cyberpunk synthwave instrumental", "lofi chill beat", "epic cinematic orchestral").',
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Maximum number of tracks to return (1-15, default 5).',
        },
        verifyLinks: {
          type: 'boolean',
          default: true,
          description: 'Verify HTTP reachability for direct MP3 URLs.',
        },
      },
      required: ['query'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'search_sfx',
    description:
      'STAGE 2C — SOUND EFFECTS & AMBIENCE FOLEY LIBRARY: Discover built-in `@remotion/sfx` exports (whoosh, whip, pageTurn, uiSwitch, mouseClick, ding, shutterModern, vineBoom, dramaticBoomer, recordScratch) AND real-world environment ambience / room tone URLs from Internet Archive when `includeWebFoley: true` (e.g. cave wind, ocean waves, rain forest, space drone, city street at low volume 0.08-0.12 for true 5-layer film audio).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SFX action or mood (e.g. "whoosh transition", "camera shutter", "ui click", "rain ambience", "dramatic impact").',
        },
        category: {
          type: 'string',
          enum: ['all', 'transition', 'ui', 'camera', 'emphasis', 'comedy', 'ambience'],
          default: 'all',
          description: 'Optional category filter ("ambience" searches room-tone/foley soundscapes for 5-layer depth).',
        },
        includeWebFoley: {
          type: 'boolean',
          default: false,
          description: 'Also search Internet Archive for external foley/ambience audio files.',
        },
      },
      required: ['query'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'evaluate_video_quality',
    description:
      'OPTIONAL STATIC PRE-CHECK: Run instant regex/guardrail validation on DynamicVideo TSX without dispatching to Cloud. (Note: `preview_frames` and `render_video` already run these guardrails automatically, so skip this step unless you want a zero-cloud dry check.)',
    inputSchema: {
      type: 'object',
      properties: {
        tsxCode: {
          type: 'string',
          description: 'Your Remotion DynamicVideo TSX source code to validate and inspect.',
        },
        creativeIntent: {
          type: 'string',
          description: 'Your chosen aesthetic mood, visual language, and pacing intent.',
        },
        genre: {
          type: 'string',
          description: 'Video genre/format (e.g. "documentary", "short-viral", "3d-sci-fi", "minimalist-poem", "tutorial").',
        },
        durationInFrames: { type: 'number', default: 300 },
        fps: { type: 'number', default: 30 },
        width: { type: 'number', default: 1920 },
        height: { type: 'number', default: 1080 },
        audioConfig: {
          type: 'object',
          description: 'Optional audioConfig payload if using AI voiceover scenes.',
        },
      },
      required: ['tsxCode'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'preview_frames',
    description:
      'STAGE 3 — PRE-FLIGHT GUARDRAILS + MULTI-FRAME VISION CONTACT SHEET: Validates TSX guardrails automatically, caches external media, saves an exact draft snapshot (for instant `render_video(fromPreviewJobId)`), and renders 1 to 6 key frames (e.g. [15, 180, 420]) into one labeled Contact Sheet PNG.\n' +
      `Inspect the returned image against:\n${VISION_FRAME_CRITERIA.join('\n')}\n` +
      'Follow up with get_task_status(jobId). When fixing a single scene, pass only that scene frame (e.g. frames: [247]) to re-verify fast.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title or description of the frame preview' },
        tsxCode: {
          type: 'string',
          description: 'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`.',
        },
        frames: {
          type: 'array',
          items: { type: 'number' },
          description: 'Recommended: Array of 1 to 6 frame indices (e.g. [15, 180, 420]) to inspect Hook, Midground, and Outro in one labeled Contact Sheet.',
        },
        frame: {
          type: 'number',
          description: 'Alternative single frame index if only inspecting 1 frame (defaults to 0 when both frames and frame are omitted).',
        },
        durationInFrames: { type: 'number', description: 'Optional composition duration in frames.', default: 300 },
        fps: { type: 'number', description: 'Frames per second (default 30).', default: 30 },
        width: { type: 'number', description: 'Width in pixels (default 1920).', default: 1920 },
        height: { type: 'number', description: 'Height in pixels (default 1080).', default: 1080 },
        audioConfig: {
          type: 'object',
          description: 'Optional audioConfigPayload from plan_storyboard_timeline so captions and speech timing cues appear on the Contact Sheet (synthesized fast without waiting for TTS).',
        },
      },
      required: ['tsxCode'],
    },
  },
  {
    name: 'render_video',
    description:
      `STAGE 4 — PRODUCTION CLOUD VIDEO RENDER & MASTERING: Render your Remotion v4.0.542 composition into MP4 on 16GB GitHub Actions Cloud Runners, optionally apply two-pass FFmpeg audio mastering (-14 LUFS), save project source for future edits, and measure QC telemetry.\n` +
      `Pass TSX via "tsxCode" and speech config via "audioConfig". Follow up with get_task_status(jobId, waitForCompletion: true).\n${ECOSYSTEM_DOCS}`,
    inputSchema: {
      type: 'object',
      properties: {
        fromPreviewJobId: {
          type: 'string',
          description: 'FAST REUSE: Pass the approved `preview_frames` (or previous render) jobId to inherit its exact validated `tsxCode`, `audioConfig`, `width`, `height`, `fps`, and `durationInFrames` without re-writing code! Any explicit parameter still overrides.',
        },
        title: { type: 'string', description: 'Title of the video composition' },
        tsxCode: {
          type: 'string',
          description: 'Complete TypeScript/React code exporting `export const DynamicVideo: React.FC = () => { ... }`. Optional when `fromPreviewJobId` is provided.',
        },
        durationInFrames: {
          type: 'number',
          description: 'Total duration in frames (seconds * fps). Match your narrative or speech telemetry.',
          default: 300,
        },
        fps: { type: 'number', description: 'Frames per second (default 30).', default: 30 },
        width: { type: 'number', description: 'Width in pixels (1920 landscape, 1080 portrait).', default: 1920 },
        height: { type: 'number', description: 'Height in pixels (1080 landscape, 1920 portrait).', default: 1080 },
        audioConfig: {
          type: 'object',
          description: 'Optional AI Voiceover & BGM config: { voice?: "vi-VN-NamMinhNeural" | "vi-VN-HoaiMyNeural", rate?: "+0%", bgm?: "lofi" | "cinematic" | "tech", scenes?: Array<{ text: string, voice?: string }> }',
        },
        audioMastering: {
          type: 'object',
          description: 'Optional studio FFmpeg audio mastering on Cloud runner (two-pass loudnorm without video re-encoding). Defaults to { enabled: true, targetLufs: -14, truePeakDbtp: -1.5 }.',
          properties: {
            enabled: { type: 'boolean', default: true },
            targetLufs: { type: 'number', default: -14 },
            truePeakDbtp: { type: 'number', default: -1.5 },
          },
        },
      },
    },
  },
  {
    name: 'get_task_status',
    description:
      'STAGE 5A — TASK STATUS, VISION RETURN & QC TELEMETRY: Wait for and retrieve Cloud render results. Returns watch/download links + FFmpeg QC telemetry for videos, or attached Base64 PNG/Contact Sheet + Vision checklist for previews.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Unique jobId returned by render_video or preview_frames' },
        waitForCompletion: {
          type: 'boolean',
          description: 'Wait up to 30s per call until completed or failed (default true).',
          default: true,
        },
      },
      required: ['jobId'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'inspect_task_logs',
    description:
      'STAGE 5B — DIAGNOSTICS & SELF-HEALING: Retrieve compiler logs, TypeScript error traces, or GitHub Actions runner failure details to diagnose and fix failed renders.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The unique jobId to inspect' },
      },
      required: ['jobId'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'list_system_assets',
    description:
      'ASSET & GALLERY BROWSER: List rendered MP4 videos stored in the Cloud Release CDN along with watch/stream/download links.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 20, description: 'Maximum number of items to retrieve' },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'get_project_source',
    description:
      'ITERATIVE EDITING — LOAD PROJECT SOURCE: Retrieve the saved TSX source code, audioConfig, and composition specs (width, height, fps, durationInFrames) of a previously rendered jobId so you can surgically refine specific scenes instead of rewriting from scratch.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The jobId of the previously rendered video to load' },
      },
      required: ['jobId'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'verify_external_asset',
    description:
      'STAGE 2C — OPEN-WEB MEDIA VERIFIER & VISION INSPECTOR: Safely probe and verify ANY external public HTTP(S) image, MP4/WebM video, audio URL (or article URL with og:image/og:video) before embedding it in DynamicVideo.tsx.\n' +
      'Enforces SSRF protection, blocks watermarked commercial stock domains (Shutterstock, Getty, iStock, Alamy, etc.), checks Content-Type & file size, and attaches a Vision preview for images so you can visually verify zero watermarks.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Public HTTP(S) URL of an external image, video, audio file, or webpage (og:image/og:video extraction).',
        },
        expectedType: {
          type: 'string',
          enum: ['auto', 'image', 'video', 'audio'],
          default: 'auto',
          description: 'Expected media category to validate against Content-Type.',
        },
        attachVisionThumbnail: {
          type: 'boolean',
          default: true,
          description: 'Attach image preview (<= 350 KB) as a Vision image block for visual inspection.',
        },
      },
      required: ['url'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'stitch_video_chapters',
    description:
      'STAGE 6 — ADAPTIVE LONG-FORM CHAPTER STITCHER (CONTINUOUS SCORE + SIDECHAIN DUCKING): Seamlessly combine 2 to 25 individually rendered chapters (by jobId or public MP4 URL) into one mastered MP4.\n' +
      'Supports uniform resolution/fps normalization, smooth crossfades, FFmpeg -14 LUFS mastering, AND an optional continuous `masterBgmUrl` mixed across the entire film with automatic `sidechaincompress` speech ducking so music never restarts at chapter boundaries!',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Final title for the stitched long-form video.',
        },
        chapters: {
          type: 'array',
          description: 'Ordered list of 2 to 25 chapters. Provide jobId (from completed render_video) or videoUrl.',
          items: {
            type: 'object',
            properties: {
              jobId: { type: 'string', description: 'Completed chapter jobId in videos-store.' },
              videoUrl: { type: 'string', description: 'Optional public direct MP4 URL.' },
              title: { type: 'string', description: 'Optional chapter label for logs.' },
            },
          },
        },
        transition: {
          type: 'string',
          enum: ['crossfade', 'cut'],
          default: 'crossfade',
          description: 'Transition between chapters: smooth audio/video crossfade or hard cut.',
        },
        fadeDurationSec: {
          type: 'number',
          default: 0.5,
          description: 'Crossfade duration in seconds (0.15 to 1.5, used when transition="crossfade").',
        },
        masterBgmUrl: {
          type: 'string',
          description: 'Optional public direct MP3/WAV URL for one continuous soundtrack running uninterrupted across ALL stitched chapters (recommended with chapters rendered without local BGM).',
        },
        masterBgmVolume: {
          type: 'number',
          default: 0.24,
          description: 'Base music volume before FFmpeg sidechain ducking (0.05 to 0.6, default 0.24).',
        },
        duckingStrength: {
          type: 'string',
          enum: ['gentle', 'balanced', 'strong'],
          default: 'balanced',
          description: 'FFmpeg sidechaincompress auto-ducking strength whenever narration speaks.',
        },
        width: { type: 'number', default: 1920, description: 'Target output width (defaults to first chapter or 1920).' },
        height: { type: 'number', default: 1080, description: 'Target output height (defaults to first chapter or 1080).' },
        fps: { type: 'number', default: 30, description: 'Target output FPS (defaults to first chapter or 30).' },
        audioMastering: {
          type: 'object',
          description: 'Optional FFmpeg studio loudness mastering across the full stitched video (default enabled at -14 LUFS).',
          properties: {
            enabled: { type: 'boolean', default: true },
            targetLufs: { type: 'number', default: -14 },
            truePeakDbtp: { type: 'number', default: -1.5 },
          },
        },
      },
      required: ['chapters'],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
];
